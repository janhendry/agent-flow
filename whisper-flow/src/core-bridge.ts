import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCliSecretStore } from "@whisper-poc/adapters/cli/secret-store.adapter";
import type { SecretStorePort } from "@whisper-poc/core/ports/secret-store.port";
import type { AudioDevice, Config, RecordingMode } from "@whisper-poc/types";
import {
	buildFfmpegArgs,
	checkFfmpeg,
	findSystemAudioDevice,
	listAudioDevices,
	startRecording,
} from "@whisper-poc/utils/audio";
import { configExists, loadConfig, saveConfig } from "@whisper-poc/utils/config";
import { transcribeFile, WhisperError } from "@whisper-poc/utils/whisper";

import type { AudioLevelPayload, IpcResponse } from "./ipc-types";

// ── Error Mapping ──────────────────────────────────────────────────────

function ok<T>(data: T): IpcResponse<T> {
	return { ok: true, data };
}

function fail(code: string, message: string): IpcResponse<never> {
	return { ok: false, error: { code, message } };
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function deriveAudioLevelFromFfmpegOutput(text: string, previousLevel = 0): number {
	const patterns = [
		/RMS\s+level\s+dB\s*:\s*(-?\d+(?:\.\d+)?)/i,
		/lavfi\.astats\.Overall\.RMS_level\s*=\s*(-?\d+(?:\.\d+)?)/i,
	];

	for (const pattern of patterns) {
		const match = pattern.exec(text);
		if (!match) {
			continue;
		}
		const db = Number.parseFloat(match[1]);
		if (!Number.isNaN(db) && Number.isFinite(db)) {
			const normalized = clamp((db + 60) / 60, 0, 1);
			return clamp(Math.max(previousLevel * 0.55, normalized), 0, 1);
		}
	}

	return previousLevel;
}

type BridgeDeps = {
	createSecretStore: () => SecretStorePort;
	listAudioDevices: typeof listAudioDevices;
	findSystemAudioDevice: typeof findSystemAudioDevice;
	buildFfmpegArgs: typeof buildFfmpegArgs;
	startRecording: typeof startRecording;
	checkFfmpeg: typeof checkFfmpeg;
	configExists: typeof configExists;
	loadConfig: typeof loadConfig;
	saveConfig: typeof saveConfig;
	transcribeFile: typeof transcribeFile;
	mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
	tmpDir: () => string;
	nowIso: () => string;
};

const defaultDeps: BridgeDeps = {
	createSecretStore: createCliSecretStore,
	listAudioDevices,
	findSystemAudioDevice,
	buildFfmpegArgs,
	startRecording,
	checkFfmpeg,
	configExists,
	loadConfig,
	saveConfig,
	transcribeFile,
	mkdirSync: (dir, options) => {
		fs.mkdirSync(dir, options);
	},
	tmpDir: () => os.tmpdir(),
	nowIso: () => new Date().toISOString(),
};

// ── Core Bridge ────────────────────────────────────────────────────────

export type AudioLevelCallback = (level: AudioLevelPayload) => void;

export class CoreBridge {
	private recordingProcess: ChildProcess | null = null;
	private outputFilePath: string | null = null;
	private audioLevelCallback: AudioLevelCallback | null = null;
	private previousMicLevel = 0;
	private readonly secretStore: SecretStorePort;
	private readonly deps: BridgeDeps;

	constructor(deps: Partial<BridgeDeps> = {}) {
		this.deps = { ...defaultDeps, ...deps };
		this.secretStore = this.deps.createSecretStore();
	}

	setAudioLevelCallback(callback: AudioLevelCallback | null): void {
		this.audioLevelCallback = callback;
	}

	// ── Record ──────────────────────────────────────────────────────

	async startRecording(mode: RecordingMode): Promise<IpcResponse> {
		if (this.recordingProcess) {
			return fail("ALREADY_RECORDING", "Es läuft bereits eine Aufnahme.");
		}

		try {
			const devices = await this.deps.listAudioDevices();
			if (devices.length === 0) {
				return fail("NO_DEVICES", "Keine Audio-Eingabegeräte gefunden.");
			}

			const micDevice = devices[0];
			const systemDevice = mode === "mic" ? undefined : this.deps.findSystemAudioDevice(devices);

			if (mode !== "mic" && !systemDevice) {
				return fail(
					"NO_SYSTEM_DEVICE",
					"Kein System-Audio-Gerät gefunden. Bitte BlackHole (macOS) oder VB-Cable (Windows) installieren.",
				);
			}

			const timestamp = this.deps.nowIso().replaceAll(":", "-").replaceAll(".", "-").slice(0, 19);
			const outputDir = path.join(this.deps.tmpDir(), "whisper-flow");
			this.deps.mkdirSync(outputDir, { recursive: true });
			this.outputFilePath = path.join(outputDir, `recording-${timestamp}.wav`);

			const ffmpegArgs = this.deps.buildFfmpegArgs(
				mode,
				micDevice,
				systemDevice,
				this.outputFilePath,
			);

			this.recordingProcess = this.deps.startRecording(ffmpegArgs);
			this.previousMicLevel = 0;

			// Parse audio levels from ffmpeg stderr
			this.recordingProcess.stderr?.on("data", (chunk: Buffer) => {
				const text = chunk.toString();
				const level = deriveAudioLevelFromFfmpegOutput(text, this.previousMicLevel);
				this.previousMicLevel = level;
				this.audioLevelCallback?.({ mic: level, sys: 0 });
			});

			return ok(undefined);
		} catch (error) {
			return fail("RECORD_START_FAILED", (error as Error).message);
		}
	}

	async stopRecording(): Promise<IpcResponse<string>> {
		if (!this.recordingProcess) {
			return fail("NOT_RECORDING", "Keine aktive Aufnahme zum Stoppen.");
		}

		const proc = this.recordingProcess;
		const filePath = this.outputFilePath ?? "";

		return new Promise((resolve) => {
			proc.on("close", () => {
				this.recordingProcess = null;
				resolve(ok(filePath));
			});

			proc.on("error", () => {
				this.recordingProcess = null;
				resolve(ok(filePath));
			});

			// Send 'q' to ffmpeg stdin to gracefully stop recording
			proc.stdin?.write("q");
			proc.stdin?.end();

			// Safety timeout: force kill after 5s
			setTimeout(() => {
				if (this.recordingProcess) {
					proc.kill("SIGKILL");
					this.recordingProcess = null;
					resolve(ok(filePath));
				}
			}, 5_000);
		});
	}

	isRecording(): boolean {
		return this.recordingProcess !== null;
	}

	// ── Transcribe ──────────────────────────────────────────────────

	async transcribe(filePath: string, language?: string): Promise<IpcResponse<string>> {
		try {
			const apiKey = this.secretStore.getApiKey();
			if (!apiKey) {
				return fail("NO_API_KEY", "Kein API-Key konfiguriert. Bitte zuerst einen API-Key setzen.");
			}

			let baseUrl: string | undefined;
			try {
				const config = this.deps.loadConfig();
				baseUrl = config.baseUrl;
			} catch {
				// Config optional for transcription
			}

			const text = await this.deps.transcribeFile(filePath, apiKey, language ?? "de", baseUrl);
			return ok(text);
		} catch (error) {
			if (error instanceof WhisperError) {
				return fail(`WHISPER_${error.kind.toUpperCase()}`, error.message);
			}
			return fail("TRANSCRIBE_FAILED", (error as Error).message);
		}
	}

	// ── Config ──────────────────────────────────────────────────────

	async loadConfig(): Promise<IpcResponse<Config>> {
		try {
			if (!this.deps.configExists()) {
				return fail("NO_CONFIG", "Keine Konfiguration gefunden.");
			}
			const config = this.deps.loadConfig();
			return ok(config);
		} catch (error) {
			return fail("CONFIG_LOAD_FAILED", (error as Error).message);
		}
	}

	async saveConfig(config: Config): Promise<IpcResponse> {
		try {
			this.deps.saveConfig(config);
			return ok(undefined);
		} catch (error) {
			return fail("CONFIG_SAVE_FAILED", (error as Error).message);
		}
	}

	// ── Secret Store ────────────────────────────────────────────────

	async getApiKey(): Promise<IpcResponse<string | undefined>> {
		try {
			const key = this.secretStore.getApiKey();
			return ok(key);
		} catch (error) {
			return fail("SECRET_READ_FAILED", (error as Error).message);
		}
	}

	async setApiKey(key: string): Promise<IpcResponse> {
		try {
			this.secretStore.setApiKey(key);
			return ok(undefined);
		} catch (error) {
			return fail("SECRET_WRITE_FAILED", (error as Error).message);
		}
	}

	// ── Diagnose ────────────────────────────────────────────────────

	async checkFfmpeg(): Promise<IpcResponse<boolean>> {
		try {
			const available = await this.deps.checkFfmpeg();
			return ok(available);
		} catch (error) {
			return fail("FFMPEG_CHECK_FAILED", (error as Error).message);
		}
	}

	async listDevices(): Promise<IpcResponse<AudioDevice[]>> {
		try {
			const devices = await this.deps.listAudioDevices();
			return ok(devices);
		} catch (error) {
			return fail("DEVICE_LIST_FAILED", (error as Error).message);
		}
	}

	// ── Cleanup ─────────────────────────────────────────────────────

	dispose(): void {
		if (this.recordingProcess) {
			this.recordingProcess.kill("SIGKILL");
			this.recordingProcess = null;
		}
		this.audioLevelCallback = null;
	}
}
