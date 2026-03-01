import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const BYPASS_EXTENSIONS = new Set([".webm"]);

export type WhisperFailureKind = "runtime" | "api";

export class WhisperError extends Error {
	readonly kind: WhisperFailureKind;

	constructor(kind: WhisperFailureKind, message: string) {
		super(message);
		this.name = "WhisperError";
		this.kind = kind;
	}
}

export function requiresWhisperConversion(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return !BYPASS_EXTENSIONS.has(ext);
}

export function buildWhisperFfmpegArgs(
	inputPath: string,
	outputPath: string,
): string[] {
	return [
		"-y",
		"-i",
		inputPath,
		"-vn",
		"-c:a",
		"libopus",
		"-b:a",
		"48k",
		"-vbr",
		"on",
		"-compression_level",
		"10",
		"-application",
		"voip",
		"-f",
		"webm",
		outputPath,
	];
}

function buildTemporaryWebmPath(inputPath: string): string {
	const base = path.basename(inputPath, path.extname(inputPath));
	const suffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
	return path.join(os.tmpdir(), `whisper-upload-${base}-${suffix}.webm`);
}

async function convertToWebmOpus(
	inputPath: string,
	outputPath: string,
): Promise<void> {
	const ffmpegArgs = buildWhisperFfmpegArgs(inputPath, outputPath);
	const timeoutMs = 120_000;

	await new Promise<void>((resolve, reject) => {
		const processHandle = spawn("ffmpeg", ffmpegArgs, {
			stdio: ["ignore", "ignore", "pipe"],
		});
		const stderrBuffer: string[] = [];
		let settled = false;

		const fail = (error: Error): void => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timeoutHandle);
			reject(error);
		};

		const succeed = (): void => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timeoutHandle);
			resolve();
		};

		const timeoutHandle = setTimeout(() => {
			try {
				processHandle.kill("SIGKILL");
			} catch {
				// no-op
			}
			const diagnostics = stderrBuffer.slice(-20).join(" ").trim();
			const diagnosticsSuffix = diagnostics ? `: ${diagnostics}` : "";
			fail(
				new Error(
					`FFmpeg-Konvertierung Timeout nach ${timeoutMs}ms${diagnosticsSuffix}`,
				),
			);
		}, timeoutMs);

		processHandle.stderr?.on("data", (chunk: Buffer) => {
			stderrBuffer.push(chunk.toString());
		});

		processHandle.on("error", (error) => {
			fail(new Error(`FFmpeg konnte nicht gestartet werden: ${error.message}`));
		});

		processHandle.on("close", (code) => {
			if (code === 0) {
				succeed();
				return;
			}

			const diagnostics = stderrBuffer.slice(-20).join(" ").trim();
			const diagnosticsSuffix = diagnostics ? `: ${diagnostics}` : "";
			fail(
				new Error(
					`FFmpeg-Konvertierung fehlgeschlagen (Exit ${code ?? "unknown"})${diagnosticsSuffix}`,
				),
			);
		});
	});

	if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
		throw new Error("FFmpeg-Konvertierung erzeugte keine gültige WebM/Opus-Datei");
	}
}

export async function transcribeFile(
	filePath: string,
	apiKey: string,
	language = "de",
	baseUrl?: string,
): Promise<string> {
	if (!fs.existsSync(filePath)) {
		throw new WhisperError("runtime", `Datei nicht gefunden: ${filePath}`);
	}

	let uploadFilePath = filePath;
	let temporaryFilePath: string | null = null;

	try {
		if (requiresWhisperConversion(filePath)) {
			temporaryFilePath = buildTemporaryWebmPath(filePath);
			try {
				await convertToWebmOpus(filePath, temporaryFilePath);
			} catch (error) {
				throw new WhisperError("runtime", (error as Error).message);
			}
			uploadFilePath = temporaryFilePath;
		}

		const { default: OpenAI } = await import("openai");

		const client = new OpenAI({
			apiKey,
			...(baseUrl ? { baseURL: baseUrl } : {}),
		});

		let transcription = "";
		try {
			transcription = await client.audio.transcriptions.create({
				file: fs.createReadStream(uploadFilePath),
				model: "whisper-1",
				language,
				response_format: "text",
			});
		} catch (error) {
			throw new WhisperError("api", (error as Error).message);
		}

		return transcription;
	} catch (error) {
		if (error instanceof WhisperError) {
			throw error;
		}

		throw new WhisperError("runtime", (error as Error).message);
	} finally {
		if (temporaryFilePath && fs.existsSync(temporaryFilePath)) {
			try {
				fs.unlinkSync(temporaryFilePath);
			} catch {
				// no-op: Aufräumen darf den Flow nicht fehlschlagen lassen
			}
		}
	}
}
