import fs from "node:fs";
import path from "node:path";
import {
	app,
	BrowserWindow,
	clipboard,
	globalShortcut,
	type IpcMainInvokeEvent,
	ipcMain,
} from "electron";
import started from "electron-squirrel-startup";
import { CoreBridge } from "./core-bridge";
import { registerIpcHandlers } from "./ipc-handlers";
import {
	type AppStatePayload,
	IpcChannel,
	type IpcResponse,
	type RecordingMode,
} from "./ipc-types";
import {
	type AppSettings,
	createDefaultSettings,
	type ThemeMode,
	validateSettings,
} from "./settings";
import {
	ShortcutRegistry,
	type ShortcutApplyResult,
	type ShortcutStatus,
} from "./shortcut-registry";
import { StateMachine } from "./state-machine";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// ── Singletons ─────────────────────────────────────────────────────────

const bridge = new CoreBridge();
const stateMachine = new StateMachine();
let mainWindow: BrowserWindow | null = null;
let currentSettings: AppSettings = createDefaultSettings();
let audioTestTimeout: NodeJS.Timeout | null = null;

const shortcutRegistry = new ShortcutRegistry(globalShortcut, {
	recordingToggle: () => {
		handleShortcutToggle().catch((err) => {
			console.error("Shortcut handler error:", err);
		});
	},
	profileOverlayToggle: () => {
		mainWindow?.webContents.send(IpcChannel.SHOW_PROFILE_OVERLAY, { source: "shortcut" });
	},
	historyOverlayToggle: () => {
		mainWindow?.webContents.send(IpcChannel.SHOW_HISTORY_OVERLAY, { source: "shortcut" });
	},
});

function ok<T>(data: T): IpcResponse<T> {
	return { ok: true, data };
}

function fail(code: string, message: string): IpcResponse<never> {
	return { ok: false, error: { code, message } };
}

function getSettingsPath(): string {
	return path.join(app.getPath("userData"), "ui-settings.json");
}

function loadSettingsFromDisk(): AppSettings {
	const file = getSettingsPath();
	if (!fs.existsSync(file)) {
		return createDefaultSettings();
	}
	try {
		const raw = fs.readFileSync(file, "utf-8");
		const parsed = JSON.parse(raw) as AppSettings;
		const merged = { ...createDefaultSettings(), ...parsed };
		return merged;
	} catch {
		return createDefaultSettings();
	}
}

function saveSettingsToDisk(settings: AppSettings): void {
	const file = getSettingsPath();
	const dir = path.dirname(file);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(file, JSON.stringify(settings, null, 2), "utf-8");
}

function applyTheme(theme: ThemeMode): void {
	mainWindow?.webContents.send(IpcChannel.THEME_CHANGED, theme);
}

function applySettingsShortcuts(settings: AppSettings): ShortcutApplyResult {
	return shortcutRegistry.apply(settings.shortcuts);
}

function formatShortcutErrors(statuses: ShortcutStatus[]): string {
	const failed = statuses.filter((status) => !status.registered);
	if (failed.length === 0) {
		return "Unbekannter Fehler bei Shortcut-Registrierung.";
	}
	return failed
		.map((item) => `${item.action}: ${item.error ?? "Registrierung fehlgeschlagen"}`)
		.join(" ");
}

function applyAndPersistSettings(nextSettings: AppSettings): IpcResponse<AppSettings> {
	const previousSettings = currentSettings;
	const applyResult = applySettingsShortcuts(nextSettings);
	if (!applyResult.ok) {
		applySettingsShortcuts(previousSettings);
		return fail("SHORTCUT_REGISTER_FAILED", formatShortcutErrors(applyResult.statuses));
	}

	currentSettings = nextSettings;
	saveSettingsToDisk(currentSettings);
	applyTheme(currentSettings.display.theme);
	return ok(currentSettings);
}

function isTrustedSettingsSender(event: IpcMainInvokeEvent): boolean {
	if (!mainWindow) {
		return false;
	}

	if (event.sender.id !== mainWindow.webContents.id) {
		return false;
	}

	const senderUrl = event.senderFrame?.url ?? "";
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		try {
			const allowedOrigin = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin;
			const senderOrigin = new URL(senderUrl).origin;
			return senderOrigin === allowedOrigin;
		} catch {
			return false;
		}
	}

	return senderUrl.startsWith("file://");
}

// ── Global Shortcut Handler ────────────────────────────────────────────

async function handleShortcutToggle(): Promise<void> {
	const currentState = stateMachine.getState();

	if (currentState === "error") {
		stateMachine.transition("idle");
	}

	if (currentState === "idle" || currentState === "error") {
		let mode: RecordingMode = currentSettings.audio.mode;
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
		width: 1120,
		height: 760,
		minWidth: 900,
		minHeight: 620,
		alwaysOnTop: false,
		skipTaskbar: false,
		resizable: true,
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

	applyTheme(currentSettings.display.theme);

	mainWindow.webContents.on("before-input-event", (event, input) => {
		if (!mainWindow?.isFocused()) {
			return;
		}

		if (
			(input.control || input.meta) &&
			!input.alt &&
			!input.shift &&
			input.key.toLowerCase() === "s"
		) {
			event.preventDefault();
			mainWindow.webContents.send(IpcChannel.SETTINGS_COMMAND, "save");
			return;
		}

		if (input.key === "Escape") {
			mainWindow.webContents.send(IpcChannel.SETTINGS_COMMAND, "discard");
		}
	});
};

function pushStateToRenderer(state: string, _previousState: string): void {
	const payload: AppStatePayload = { state: state as AppStatePayload["state"] };
	mainWindow?.webContents.send(IpcChannel.STATE_CHANGE, payload);
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

ipcMain.handle(IpcChannel.SETTINGS_LOAD, async () => {
	return ok(currentSettings);
});

ipcMain.handle(IpcChannel.SETTINGS_VALIDATE, async (_event, settings: AppSettings) => {
	return ok(validateSettings(settings));
});

ipcMain.handle(IpcChannel.SETTINGS_SAVE, async (_event, settings: AppSettings) => {
	const validation = validateSettings(settings);
	if (!validation.valid) {
		return fail("SETTINGS_INVALID", validation.issues.map((issue) => issue.message).join(" "));
	}

	const saveResult = applyAndPersistSettings(settings);
	if (!saveResult.ok) {
		return saveResult;
	}

	try {
		const configResult = await bridge.loadConfig();
		const existing = configResult.ok
			? configResult.data
			: {
				mode: settings.audio.mode,
				micIndex: settings.audio.micDeviceIndex,
				micName: "Mikrofon",
				outputDir: path.join(app.getPath("documents"), "whisper-flow"),
			};

		const activeProfile =
			settings.profiles.find((profile) => profile.id === settings.activeProfileId) ??
			settings.profiles[0];

		await bridge.saveConfig({
			...existing,
			mode: settings.audio.mode,
			micIndex: settings.audio.micDeviceIndex,
			systemIndex: settings.audio.systemDeviceIndex,
			baseUrl: settings.api.baseUrl,
			llmEnabled: activeProfile?.llmEnabled ?? false,
			llmModel: activeProfile?.llmModel,
			glossaryText:
				settings.glossaries.find((item) => item.id === activeProfile?.glossaryId)?.text ?? "",
		});
		if (settings.api.hasApiKey === false) {
			await bridge.setApiKey("");
		}
	} catch {
		// Persisted UI settings are still valid even if core config sync fails.
	}

	return saveResult;
});

ipcMain.handle(IpcChannel.SHORTCUTS_GET_ALL, async (event) => {
	if (!isTrustedSettingsSender(event)) {
		return fail("IPC_FORBIDDEN", "Shortcut-Zugriff ist fuer diese Quelle nicht erlaubt.");
	}

	return ok(shortcutRegistry.getStatuses());
});

ipcMain.handle(IpcChannel.SHORTCUTS_SET, async (event, payload: { shortcuts: AppSettings["shortcuts"] }) => {
	if (!isTrustedSettingsSender(event)) {
		return fail("IPC_FORBIDDEN", "Shortcut-Aenderung ist fuer diese Quelle nicht erlaubt.");
	}

	const nextSettings: AppSettings = {
		...currentSettings,
		shortcuts: payload.shortcuts,
	};
	const validation = validateSettings(nextSettings);
	const shortcutIssues = validation.issues.filter((issue) => issue.path.startsWith("shortcuts."));
	if (shortcutIssues.length > 0) {
		return fail("SHORTCUT_INVALID", shortcutIssues.map((issue) => issue.message).join(" "));
	}

	const saveResult = applyAndPersistSettings(nextSettings);
	if (!saveResult.ok) {
		return saveResult;
	}

	return ok({
		shortcuts: currentSettings.shortcuts,
		statuses: shortcutRegistry.getStatuses(),
	});
});

ipcMain.handle(
	IpcChannel.AUDIO_TEST_START,
	async (_event, payload: { mode: RecordingMode; autoStopSeconds: number }) => {
		if (stateMachine.getState() === "recording") {
			return fail("TEST_BUSY", "Audio-Test ist waehrend laufender Aufnahme nicht verfuegbar.");
		}
		const result = await bridge.startRecording(payload.mode);
		if (!result.ok) {
			return result;
		}
		if (audioTestTimeout) {
			clearTimeout(audioTestTimeout);
		}
		audioTestTimeout = setTimeout(
			async () => {
				await bridge.stopRecording();
				audioTestTimeout = null;
			},
			Math.min(60, Math.max(5, payload.autoStopSeconds)) * 1000,
		);
		return ok(undefined);
	},
);

ipcMain.handle(IpcChannel.AUDIO_TEST_STOP, async () => {
	if (audioTestTimeout) {
		clearTimeout(audioTestTimeout);
		audioTestTimeout = null;
	}
	const result = await bridge.stopRecording();
	if (!result.ok && result.error.code === "NOT_RECORDING") {
		return ok(undefined);
	}
	return result.ok ? ok(undefined) : result;
});

ipcMain.handle(IpcChannel.APP_CHECK_UPDATES, async () => {
	return ok({
		supported: false,
		message: "Automatischer Update-Check ist in diesem Build noch nicht aktiviert.",
	});
});

ipcMain.handle(IpcChannel.SETUP_RESTART, async () => {
	const resetResult = applyAndPersistSettings(createDefaultSettings());
	if (!resetResult.ok) {
		return resetResult;
	}
	return ok(undefined);
});

ipcMain.handle(IpcChannel.SHOW_HISTORY_OVERLAY, async () => {
	mainWindow?.webContents.send(IpcChannel.SHOW_HISTORY_OVERLAY, { source: "ui" });
	return ok(undefined);
});

ipcMain.handle(IpcChannel.SHOW_PROFILE_OVERLAY, async () => {
	mainWindow?.webContents.send(IpcChannel.SHOW_PROFILE_OVERLAY, { source: "ui" });
	return ok(undefined);
});

// ── App Lifecycle ──────────────────────────────────────────────────────

app.on("ready", () => {
	currentSettings = loadSettingsFromDisk();
	createWindow();
	const applyResult = applySettingsShortcuts(currentSettings);
	if (!applyResult.ok) {
		console.warn("Nicht alle Shortcuts konnten registriert werden:", formatShortcutErrors(applyResult.statuses));
	}
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
	shortcutRegistry.unregisterAll();
	bridge.dispose();
});
