import { contextBridge, ipcRenderer } from "electron";
import { type ElectronAPI, IpcChannel } from "./ipc-types";

const electronAPI: ElectronAPI = {
	record: {
		start: (mode) => ipcRenderer.invoke(IpcChannel.RECORD_START, { mode }),
		stop: () => ipcRenderer.invoke(IpcChannel.RECORD_STOP),
	},
	transcribe: (filePath, options) =>
		ipcRenderer.invoke(IpcChannel.TRANSCRIBE, { filePath, language: options?.language }),
	config: {
		load: () => ipcRenderer.invoke(IpcChannel.CONFIG_LOAD),
		save: (config) => ipcRenderer.invoke(IpcChannel.CONFIG_SAVE, config),
	},
	secretStore: {
		getApiKey: () => ipcRenderer.invoke(IpcChannel.SECRET_GET_API_KEY),
		setApiKey: (key) => ipcRenderer.invoke(IpcChannel.SECRET_SET_API_KEY, key),
	},
	diagnose: {
		checkFfmpeg: () => ipcRenderer.invoke(IpcChannel.DIAGNOSE_CHECK_FFMPEG),
		listDevices: () => ipcRenderer.invoke(IpcChannel.DIAGNOSE_LIST_DEVICES),
	},
	settings: {
		load: () => ipcRenderer.invoke(IpcChannel.SETTINGS_LOAD),
		save: (settings) => ipcRenderer.invoke(IpcChannel.SETTINGS_SAVE, settings),
		validate: (settings) => ipcRenderer.invoke(IpcChannel.SETTINGS_VALIDATE, settings),
	},
	audioTest: {
		start: (mode, autoStopSeconds) =>
			ipcRenderer.invoke(IpcChannel.AUDIO_TEST_START, { mode, autoStopSeconds }),
		stop: () => ipcRenderer.invoke(IpcChannel.AUDIO_TEST_STOP),
	},
	app: {
		checkUpdates: () => ipcRenderer.invoke(IpcChannel.APP_CHECK_UPDATES),
		restartSetup: () => ipcRenderer.invoke(IpcChannel.SETUP_RESTART),
	},
	overlays: {
		showHistory: () => ipcRenderer.invoke(IpcChannel.SHOW_HISTORY_OVERLAY),
		showProfile: () => ipcRenderer.invoke(IpcChannel.SHOW_PROFILE_OVERLAY),
	},
	shortcuts: {
		getAll: () => ipcRenderer.invoke(IpcChannel.SHORTCUTS_GET_ALL),
		set: (request) => ipcRenderer.invoke(IpcChannel.SHORTCUTS_SET, request),
	},
	onAudioLevel: (callback) => {
		const handler = (_event: Electron.IpcRendererEvent, level: unknown) =>
			callback(level as Parameters<typeof callback>[0]);
		ipcRenderer.on(IpcChannel.AUDIO_LEVEL, handler);
		return () => {
			ipcRenderer.removeListener(IpcChannel.AUDIO_LEVEL, handler);
		};
	},
	onTranscriptionProgress: (callback) => {
		const handler = (_event: Electron.IpcRendererEvent, state: unknown) =>
			callback(state as string);
		ipcRenderer.on(IpcChannel.TRANSCRIPTION_PROGRESS, handler);
		return () => {
			ipcRenderer.removeListener(IpcChannel.TRANSCRIPTION_PROGRESS, handler);
		};
	},
	onStateChange: (callback) => {
		const handler = (_event: Electron.IpcRendererEvent, payload: unknown) =>
			callback(payload as Parameters<typeof callback>[0]);
		ipcRenderer.on(IpcChannel.STATE_CHANGE, handler);
		return () => {
			ipcRenderer.removeListener(IpcChannel.STATE_CHANGE, handler);
		};
	},
	onThemeChanged: (callback) => {
		const handler = (_event: Electron.IpcRendererEvent, payload: unknown) =>
			callback(payload as Parameters<typeof callback>[0]);
		ipcRenderer.on(IpcChannel.THEME_CHANGED, handler);
		return () => {
			ipcRenderer.removeListener(IpcChannel.THEME_CHANGED, handler);
		};
	},
	onSettingsCommand: (callback) => {
		const handler = (_event: Electron.IpcRendererEvent, payload: unknown) =>
			callback(payload as Parameters<typeof callback>[0]);
		ipcRenderer.on(IpcChannel.SETTINGS_COMMAND, handler);
		return () => {
			ipcRenderer.removeListener(IpcChannel.SETTINGS_COMMAND, handler);
		};
	},
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
