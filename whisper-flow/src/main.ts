import path from "node:path";
import { app, BrowserWindow, clipboard, globalShortcut, ipcMain } from "electron";
import started from "electron-squirrel-startup";
import { CoreBridge } from "./core-bridge";
import { registerIpcHandlers } from "./ipc-handlers";
import { type AppStatePayload, IpcChannel } from "./ipc-types";
import { StateMachine } from "./state-machine";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// ── Singletons ─────────────────────────────────────────────────────────

const bridge = new CoreBridge();
const stateMachine = new StateMachine();
let mainWindow: BrowserWindow | null = null;

// ── Global Shortcut Handler ────────────────────────────────────────────

async function handleShortcutToggle(): Promise<void> {
	const currentState = stateMachine.getState();

	if (currentState === "error") {
		stateMachine.transition("idle");
	}

	if (currentState === "idle" || currentState === "error") {
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
				}, 1_500);
			} else {
				stateMachine.transition("error");
				const errorPayload: AppStatePayload = {
					state: "error",
					error: transcribeResult.error.message,
				};
				mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, errorPayload);
			}
		} else {
			stateMachine.transition("error");
			const errorPayload: AppStatePayload = {
				state: "error",
				error: stopResult.error.message,
			};
			mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, errorPayload);
		}
	}
}

// ── Window Creation ────────────────────────────────────────────────────

const createWindow = (): void => {
	mainWindow = new BrowserWindow({
		width: 280,
		height: 112,
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

function pushStateToRenderer(state: string, _previousState: string): void {
	const payload: AppStatePayload = { state: state as AppStatePayload["state"] };
	mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, payload);
	mainWindow?.setIgnoreMouseEvents(state === "idle");
}

stateMachine.onStateChange(pushStateToRenderer);

registerIpcHandlers({
	ipcMain,
	bridge,
	stateMachine,
	getWindowSender: () => {
		if (!mainWindow) {
			return undefined;
		}
		return {
			send: (channel, payload) => {
				mainWindow?.webContents.send(channel, payload);
			},
		};
	},
	writeClipboardText: (text) => {
		clipboard.writeText(text);
	},
});

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
