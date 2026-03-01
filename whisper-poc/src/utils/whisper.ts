import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const BYPASS_EXTENSIONS = new Set([".webm"]);

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

	await new Promise<void>((resolve, reject) => {
		const processHandle = spawn("ffmpeg", ffmpegArgs, {
			stdio: ["ignore", "ignore", "pipe"],
		});
		const stderrBuffer: string[] = [];

		processHandle.stderr?.on("data", (chunk: Buffer) => {
			stderrBuffer.push(chunk.toString());
		});

		processHandle.on("error", (error) => {
			reject(new Error(`FFmpeg konnte nicht gestartet werden: ${error.message}`));
		});

		processHandle.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			const diagnostics = stderrBuffer.slice(-20).join(" ").trim();
			reject(
				new Error(
					`FFmpeg-Konvertierung fehlgeschlagen (Exit ${code ?? "unknown"})${diagnostics ? `: ${diagnostics}` : ""}`,
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
		throw new Error(`Datei nicht gefunden: ${filePath}`);
	}

	let uploadFilePath = filePath;
	let temporaryFilePath: string | null = null;

	if (requiresWhisperConversion(filePath)) {
		temporaryFilePath = buildTemporaryWebmPath(filePath);
		await convertToWebmOpus(filePath, temporaryFilePath);
		uploadFilePath = temporaryFilePath;
	}

	const { default: OpenAI } = await import("openai");

	const client = new OpenAI({
		apiKey,
		...(baseUrl ? { baseURL: baseUrl } : {}),
	});

	try {
		const transcription = await client.audio.transcriptions.create({
			file: fs.createReadStream(uploadFilePath),
			model: "whisper-1",
			language,
			response_format: "text",
		});

		return transcription as unknown as string;
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
