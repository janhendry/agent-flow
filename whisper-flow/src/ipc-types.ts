import type { AudioDevice, Config, RecordingMode } from "@whisper-poc/types";
import type { AppSettings, SettingsValidationResult, ThemeMode } from "./settings";
import type { ShortcutStatus } from "./shortcut-registry";

// ── IPC Channel Names ──────────────────────────────────────────────────

export const IpcChannel = {
	RECORD_START: "record:start",
	RECORD_STOP: "record:stop",
	TRANSCRIBE: "transcribe",
	CONFIG_LOAD: "config:load",
	CONFIG_SAVE: "config:save",
	SECRET_GET_API_KEY: "secret:getApiKey",
	SECRET_SET_API_KEY: "secret:setApiKey",
	DIAGNOSE_CHECK_FFMPEG: "diagnose:checkFfmpeg",
	DIAGNOSE_LIST_DEVICES: "diagnose:listDevices",
	AUDIO_LEVEL: "audio:level",
	TRANSCRIPTION_PROGRESS: "transcription:progress",
	STATE_CHANGE: "state:change",
	SHORTCUT_TOGGLE: "shortcut:toggle",
	SHORTCUTS_GET_ALL: "shortcuts:get-all",
	SHORTCUTS_SET: "shortcuts:set",
	SETTINGS_LOAD: "settings:load",
	SETTINGS_SAVE: "settings:save",
	SETTINGS_VALIDATE: "settings:validate",
	AUDIO_TEST_START: "audio:test:start",
	AUDIO_TEST_STOP: "audio:test:stop",
	APP_CHECK_UPDATES: "app:check-updates",
	SETUP_RESTART: "setup:restart",
	SHOW_HISTORY_OVERLAY: "overlay:history:show",
	SHOW_PROFILE_OVERLAY: "overlay:profile:show",
	THEME_CHANGED: "theme:changed",
	SETTINGS_COMMAND: "settings:command",
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

// ── App State ──────────────────────────────────────────────────────────

export type AppState = "idle" | "recording" | "transcribing" | "success" | "error";

export interface AppStatePayload {
	state: AppState;
	error?: string;
	transcription?: string;
}

// ── IPC Request/Response Types ─────────────────────────────────────────

export interface IpcResult<T = void> {
	ok: true;
	data: T;
}

export interface IpcError {
	ok: false;
	error: {
		code: string;
		message: string;
	};
}

export type IpcResponse<T = void> = IpcResult<T> | IpcError;

// ── Record Types ───────────────────────────────────────────────────────

export interface RecordStartRequest {
	mode: RecordingMode;
}

// ── Transcribe Types ───────────────────────────────────────────────────

export interface TranscribeRequest {
	filePath: string;
	language?: string;
}

export interface TranscribeOptions {
	language?: string;
}

// ── Audio Level Event ──────────────────────────────────────────────────

export interface AudioLevelPayload {
	mic: number;
	sys: number;
}

export interface UpdateCheckResult {
	supported: boolean;
	message: string;
}

export type SettingsCommand = "save" | "discard";

export interface ShortcutUpdateRequest {
	shortcuts: AppSettings["shortcuts"];
}

export interface ShortcutUpdateResult {
	shortcuts: AppSettings["shortcuts"];
	statuses: ShortcutStatus[];
}

// ── Electron API (exposed to renderer via preload) ─────────────────────

export interface ElectronAPI {
	record: {
		start(mode: RecordingMode): Promise<IpcResponse>;
		stop(): Promise<IpcResponse<string>>;
	};
	transcribe(filePath: string, options?: TranscribeOptions): Promise<IpcResponse<string>>;
	config: {
		load(): Promise<IpcResponse<Config>>;
		save(config: Config): Promise<IpcResponse>;
	};
	secretStore: {
		getApiKey(): Promise<IpcResponse<string | undefined>>;
		setApiKey(key: string): Promise<IpcResponse>;
	};
	diagnose: {
		checkFfmpeg(): Promise<IpcResponse<boolean>>;
		listDevices(): Promise<IpcResponse<AudioDevice[]>>;
	};
	settings: {
		load(): Promise<IpcResponse<AppSettings>>;
		save(settings: AppSettings): Promise<IpcResponse<AppSettings>>;
		validate(settings: AppSettings): Promise<IpcResponse<SettingsValidationResult>>;
	};
	audioTest: {
		start(mode: RecordingMode, autoStopSeconds: number): Promise<IpcResponse>;
		stop(): Promise<IpcResponse>;
	};
	app: {
		checkUpdates(): Promise<IpcResponse<UpdateCheckResult>>;
		restartSetup(): Promise<IpcResponse>;
	};
	overlays: {
		showHistory(): Promise<IpcResponse>;
		showProfile(): Promise<IpcResponse>;
	};
	shortcuts: {
		getAll(): Promise<IpcResponse<ShortcutStatus[]>>;
		set(request: ShortcutUpdateRequest): Promise<IpcResponse<ShortcutUpdateResult>>;
	};
	onAudioLevel(callback: (level: AudioLevelPayload) => void): () => void;
	onTranscriptionProgress(callback: (state: string) => void): () => void;
	onStateChange(callback: (payload: AppStatePayload) => void): () => void;
	onThemeChanged(callback: (theme: ThemeMode) => void): () => void;
	onSettingsCommand(callback: (command: SettingsCommand) => void): () => void;
}

// ── Re-exports for convenience ─────────────────────────────────────────

export type { AudioDevice, Config, RecordingMode } from "@whisper-poc/types";
export type { AppSettings, SettingsValidationResult, ThemeMode } from "./settings";
export type { ShortcutStatus } from "./shortcut-registry";
