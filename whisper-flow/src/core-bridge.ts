import type { ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createCliSecretStore } from "@whisper-poc/adapters/cli/secret-store.adapter";
import { deriveAudioLevelFromFfmpegOutput } from "@whisper-poc/commands/interactive-audio-level";
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

// ── Core Bridge ────────────────────────────────────────────────────────

export type AudioLevelCallback = (level: AudioLevelPayload) => void;

export class CoreBridge {
	private recordingProcess: ChildProcess | null = null;
	private outputFilePath: string | null = null;
	private audioLevelCallback: AudioLevelCallback | null = null;
	private previousMicLevel = 0;
	private readonly secretStore: SecretStorePort;

	constructor() {
		this.secretStore = createCliSecretStore();
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
			const devices = await listAudioDevices();
			if (devices.length === 0) {
				return fail("NO_DEVICES", "Keine Audio-Eingabegeräte gefunden.");
			}

			const micDevice = devices[0];
			const systemDevice = mode === "mic" ? undefined : findSystemAudioDevice(devices);

			if (mode !== "mic" && !systemDevice) {
				return fail(
					"NO_SYSTEM_DEVICE",
					"Kein System-Audio-Gerät gefunden. Bitte BlackHole (macOS) oder VB-Cable (Windows) installieren.",
				);
			}

			const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-").slice(0, 19);
			const outputDir = path.join(os.tmpdir(), "whisper-flow");
			const { mkdirSync } = await import("node:fs");
			mkdirSync(outputDir, { recursive: true });
			this.outputFilePath = path.join(outputDir, `recording-${timestamp}.wav`);

			const ffmpegArgs = buildFfmpegArgs(mode, micDevice, systemDevice, this.outputFilePath);

			this.recordingProcess = startRecording(ffmpegArgs);
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
				const config = loadConfig();
				baseUrl = config.baseUrl;
			} catch {
				// Config optional for transcription
			}

			const text = await transcribeFile(filePath, apiKey, language ?? "de", baseUrl);
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
			if (!configExists()) {
				return fail("NO_CONFIG", "Keine Konfiguration gefunden.");
			}
			const config = loadConfig();
			return ok(config);
		} catch (error) {
			return fail("CONFIG_LOAD_FAILED", (error as Error).message);
		}
	}

	async saveConfig(config: Config): Promise<IpcResponse> {
		try {
			saveConfig(config);
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
			const available = await checkFfmpeg();
			return ok(available);
		} catch (error) {
			return fail("FFMPEG_CHECK_FAILED", (error as Error).message);
		}
	}

	async listDevices(): Promise<IpcResponse<AudioDevice[]>> {
		try {
			const devices = await listAudioDevices();
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
