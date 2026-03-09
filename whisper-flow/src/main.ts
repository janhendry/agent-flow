import path from "node:path";
import { app, BrowserWindow, clipboard, globalShortcut, ipcMain } from "electron";
import started from "electron-squirrel-startup";
import { CoreBridge } from "./core-bridge";
import {
	type AppStatePayload,
	type Config,
	IpcChannel,
	type RecordStartRequest,
	type TranscribeRequest,
} from "./ipc-types";
import { StateMachine } from "./state-machine";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// ── Singletons ─────────────────────────────────────────────────────────

const bridge = new CoreBridge();
const stateMachine = new StateMachine();
let mainWindow: BrowserWindow | null = null;

// ── State → Renderer Push ──────────────────────────────────────────────

function pushStateToRenderer(state: string, _previousState: string): void {
	const payload: AppStatePayload = { state: state as AppStatePayload["state"] };
	mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, payload);
}

stateMachine.onStateChange(pushStateToRenderer);

// ── Audio Level → Renderer Push ────────────────────────────────────────

bridge.setAudioLevelCallback((level) => {
	mainWindow?.webContents.send(IpcChannel.AUDIO_LEVEL, level);
});

// ── IPC Handlers ───────────────────────────────────────────────────────

ipcMain.handle(IpcChannel.RECORD_START, async (_event, req: RecordStartRequest) => {
	const result = await bridge.startRecording(req.mode);
	if (result.ok) {
		stateMachine.transition("recording");
	}
	return result;
});

ipcMain.handle(IpcChannel.RECORD_STOP, async () => {
	const result = await bridge.stopRecording();
	if (result.ok) {
		stateMachine.transition("transcribing");
	}
	return result;
});

ipcMain.handle(IpcChannel.TRANSCRIBE, async (_event, req: TranscribeRequest) => {
	const result = await bridge.transcribe(req.filePath, req.language);
	if (result.ok) {
		clipboard.writeText(result.data);
		stateMachine.transition("success");
		setTimeout(() => {
			if (stateMachine.getState() === "success") {
				stateMachine.transition("idle");
			}
		}, 3_000);
	} else {
		stateMachine.transition("error");
		setTimeout(() => {
			if (stateMachine.getState() === "error") {
				stateMachine.transition("idle");
			}
		}, 5_000);
	}
	return result;
});

ipcMain.handle(IpcChannel.CONFIG_LOAD, async () => {
	return bridge.loadConfig();
});

ipcMain.handle(IpcChannel.CONFIG_SAVE, async (_event, config: Config) => {
	return bridge.saveConfig(config);
});

ipcMain.handle(IpcChannel.SECRET_GET_API_KEY, async () => {
	return bridge.getApiKey();
});

ipcMain.handle(IpcChannel.SECRET_SET_API_KEY, async (_event, key: string) => {
	return bridge.setApiKey(key);
});

ipcMain.handle(IpcChannel.DIAGNOSE_CHECK_FFMPEG, async () => {
	return bridge.checkFfmpeg();
});

ipcMain.handle(IpcChannel.DIAGNOSE_LIST_DEVICES, async () => {
	return bridge.listDevices();
});

// ── Global Shortcut Handler ────────────────────────────────────────────

async function handleShortcutToggle(): Promise<void> {
	const currentState = stateMachine.getState();

	if (currentState === "idle") {
		let mode: "mic" | "system" | "both" = "mic";
		try {
			const configResult = await bridge.loadConfig();
			if (configResult.ok) {
				mode = configResult.data.mode;
			}
		} catch {
			// Use default mode
		}

		const result = await bridge.startRecording(mode);
		if (result.ok) {
			stateMachine.transition("recording");
		} else {
			const errorPayload: AppStatePayload = {
				state: "error",
				error: result.error.message,
			};
			mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, errorPayload);
		}
	} else if (currentState === "recording") {
		const stopResult = await bridge.stopRecording();
		if (stopResult.ok) {
			stateMachine.transition("transcribing");
			mainWindow?.webContents.send(IpcChannel.TRANSCRIPTION_PROGRESS, "transcribing");

			const transcribeResult = await bridge.transcribe(stopResult.data);
			if (transcribeResult.ok) {
				clipboard.writeText(transcribeResult.data);
				stateMachine.transition("success");
				const successPayload: AppStatePayload = {
					state: "success",
					transcription: transcribeResult.data,
				};
				mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, successPayload);
				setTimeout(() => {
					if (stateMachine.getState() === "success") {
						stateMachine.transition("idle");
					}
				}, 3_000);
			} else {
				stateMachine.transition("error");
				const errorPayload: AppStatePayload = {
					state: "error",
					error: transcribeResult.error.message,
				};
				mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, errorPayload);
				setTimeout(() => {
					if (stateMachine.getState() === "error") {
						stateMachine.transition("idle");
					}
				}, 5_000);
			}
		}
	}
}

// ── Window Creation ────────────────────────────────────────────────────

const createWindow = (): void => {
	mainWindow = new BrowserWindow({
		width: 280,
		height: 96,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.webContents.openDevTools({ mode: "detach" });
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
};

// ── App Lifecycle ──────────────────────────────────────────────────────

app.on("ready", () => {
	createWindow();

	globalShortcut.register("CommandOrControl+Shift+Space", () => {
		handleShortcutToggle().catch((err) => {
			console.error("Shortcut handler error:", err);
		});
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("will-quit", () => {
	globalShortcut.unregisterAll();
	bridge.dispose();
});
