import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import { AudioDevice, Config, RecordingMode } from "../types.js";
import {
	buildFfmpegArgs,
	checkFfmpeg,
	findSystemAudioDevice,
	getPlatformInfo,
	listAudioDevices,
	playAudio,
	startRecording,
} from "../utils/audio.js";
import { configExists, loadConfig } from "../utils/config.js";
import {
	type CliErrorCode,
	emitCliErrorAndExit,
} from "../utils/cli-error-contract.js";
import { transcribeCommand } from "./transcribe.js";

interface RecordOptions {
	mode?: string;
	output?: string;
	mic?: string;
	system?: string;
	duration?: string;
}

const DEFAULT_CONFIG: Config = {
	mode: "mic",
	micIndex: 0,
	micName: "Standard",
	outputDir: path.join(os.homedir(), "Desktop", "whisper-recordings"),
};

interface RecordExecutionOptions {
	mode: RecordingMode;
	micIndex: number;
	systemIndex?: number;
	outputFile?: string;
	outputDir: string;
	durationSec?: number;
}

function emitCliError(code: CliErrorCode, message: string): never {
	emitCliErrorAndExit("record", code, message);
}

function parseOptionalInteger(
	value: string | undefined,
	label: string,
): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed)) {
		throw new Error(`${label} muss eine ganze Zahl sein`);
	}
	return parsed;
}

function parseRequiredInteger(value: string | undefined, label: string): number {
	const parsed = parseOptionalInteger(value, label);
	if (parsed === undefined) {
		throw new Error(`${label} muss eine ganze Zahl sein`);
	}
	return parsed;
}

function resolveMode(modeValue: string): RecordingMode {
	if (modeValue === "mic" || modeValue === "system" || modeValue === "both") {
		return modeValue;
	}
	throw new Error("Ungültiger Modus. Erlaubt: mic | system | both");
}

export function resolveRecordExecutionOptions(
	options: RecordOptions,
	config: Config,
	env: NodeJS.ProcessEnv = process.env,
): RecordExecutionOptions {
	const mode = resolveMode(options.mode ?? config.mode ?? env["WHISPER_POC_MODE"] ?? "mic");
	const micIndex =
		options.mic !== undefined
			? parseRequiredInteger(options.mic, "Mikrofonindex")
			: (config.micIndex ?? parseRequiredInteger(env["WHISPER_POC_MIC"], "Mikrofonindex"));
	const systemIndex =
		options.system !== undefined
			? parseOptionalInteger(options.system, "System-Audio-Index")
			: (config.systemIndex ?? parseOptionalInteger(env["WHISPER_POC_SYSTEM"], "System-Audio-Index"));

	const durationSec =
		options.duration !== undefined
			? parseRequiredInteger(options.duration, "Aufnahmedauer")
			: parseOptionalInteger(env["WHISPER_POC_RECORD_DURATION"], "Aufnahmedauer");
	if (durationSec !== undefined && durationSec <= 0) {
		throw new Error("Aufnahmedauer muss größer als 0 sein");
	}

	const outputDir =
		config.outputDir ?? env["WHISPER_POC_OUTPUT_DIR"] ?? DEFAULT_CONFIG.outputDir;
	const outputFile = options.output;

	return {
		mode,
		micIndex,
		systemIndex,
		outputFile,
		outputDir,
		durationSec,
	};
}

export function resolveRecordOutputFile(
	executionOptions: RecordExecutionOptions,
	isDeterministicMode: boolean,
	now: Date = new Date(),
): string {
	if (executionOptions.outputFile) {
		return executionOptions.outputFile;
	}
	if (isDeterministicMode) {
		return path.join(executionOptions.outputDir, "recording.wav");
	}
	const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
	return path.join(executionOptions.outputDir, `recording-${timestamp}.wav`);
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
		.toString()
		.padStart(2, "0");
	const s = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${s}`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function drawRecordingBox(
	mode: RecordingMode,
	outputFile: string,
	elapsedSec: number,
): void {
	const modeLabel: Record<RecordingMode, string> = {
		mic: "🎙  Nur Mikrofon",
		system: "🔊  Nur System-Audio",
		both: "🎚  Mikrofon + System-Audio",
	};
	const filename = path.basename(outputFile);
	const duration = formatDuration(elapsedSec);
	const W = 52;
	const top = chalk.gray("┌" + "─".repeat(W) + "┐");
	const bottom = chalk.gray("└" + "─".repeat(W) + "┘");
	const row = (s: string) => {
		const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
		return (
			chalk.gray("│") +
			s +
			" ".repeat(Math.max(0, W - visible.length)) +
			chalk.gray("│")
		);
	};
	process.stdout.write("\x1b[2J\x1b[H");
	console.log("\n" + top);
	console.log(row(`  ${chalk.red("●")} ${chalk.bold.red("AUFNAHME LÄUFT")}`));
	console.log(row(""));
	console.log(
		row(`  ${chalk.gray("Modus:")}   ${chalk.cyan(modeLabel[mode])}`),
	);
	console.log(row(`  ${chalk.gray("Datei:")}   ${chalk.white(filename)}`));
	console.log(row(`  ${chalk.gray("Dauer:")}   ${chalk.yellow(duration)}`));
	console.log(row(""));
	console.log(
		row(
			`  ${chalk.gray("Beliebige Taste")} ${chalk.white("→")} Aufnahme stoppen`,
		),
	);
	console.log(bottom + "\n");
}

// ── Aufnahme-Session ─────────────────────────────────────────────────────────

async function runRecordingSession(
	mode: RecordingMode,
	micDevice: AudioDevice,
	systemDevice: AudioDevice | undefined,
	outputFile: string,
): Promise<{ success: boolean; durationSec: number }> {
	return new Promise((resolve) => {
		let ffmpegArgs: string[];
		try {
			ffmpegArgs = buildFfmpegArgs(mode, micDevice, systemDevice, outputFile);
		} catch (err) {
			console.error(chalk.red(`❌  ${(err as Error).message}`));
			resolve({ success: false, durationSec: 0 });
			return;
		}

		const startTime = Date.now();
		const proc = startRecording(ffmpegArgs);
		const stderrLines: string[] = [];
		let stopped = false;

		proc.stderr?.on("data", (chunk: Buffer) =>
			stderrLines.push(chunk.toString()),
		);

		drawRecordingBox(mode, outputFile, 0);
		const ticker = setInterval(() => {
			drawRecordingBox(mode, outputFile, (Date.now() - startTime) / 1000);
		}, 1000);

		const stop = () => {
			if (stopped) return;
			stopped = true;
			clearInterval(ticker);
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(false);
				process.stdin.removeAllListeners("data");
				process.stdin.pause();
			}
			proc.stdin?.write("q");
			setTimeout(() => {
				try {
					proc.kill("SIGTERM");
				} catch (_) {
					/* ignore */
				}
			}, 400);
		};

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding("utf8");
			process.stdin.once("data", stop);
		}

		proc.on("close", () => {
			clearInterval(ticker);
			const durationSec = (Date.now() - startTime) / 1000;
			process.stdout.write("\x1b[2J\x1b[H");
			const ok = fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0;
			if (!ok && stderrLines.length > 0) {
				console.error(chalk.red("❌  ffmpeg-Fehler:"));
				console.error(chalk.gray(stderrLines.slice(-15).join("")));
			}
			resolve({ success: ok, durationSec });
		});
	});
}

async function runDeterministicRecordingSession(
	mode: RecordingMode,
	micDevice: AudioDevice,
	systemDevice: AudioDevice | undefined,
	outputFile: string,
	durationSec: number,
): Promise<{ success: boolean; durationSec: number }> {
	let ffmpegArgs: string[];
	try {
		ffmpegArgs = buildFfmpegArgs(mode, micDevice, systemDevice, outputFile);
	} catch (err) {
		emitCliError("ffmpeg-args", (err as Error).message);
	}

	return new Promise((resolve) => {
		const proc = startRecording(ffmpegArgs);
		const startTime = Date.now();
		const stderrLines: string[] = [];

		proc.stderr?.on("data", (chunk: Buffer) => stderrLines.push(chunk.toString()));

		setTimeout(() => {
			proc.stdin?.write("q");
		}, durationSec * 1000);

		proc.on("close", () => {
			const ok = fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0;
			if (!ok && stderrLines.length > 0) {
				emitCliError("ffmpeg-record", stderrLines.slice(-10).join(" ").trim());
			}
			resolve({
				success: ok,
				durationSec: Math.max(0, (Date.now() - startTime) / 1000),
			});
		});
	});
}

// ── Haupt-Command (interaktive Schleife) ──────────────────────────────────────

export async function recordCommand(options: RecordOptions): Promise<void> {
	const hasFfmpeg = await checkFfmpeg();
	if (!hasFfmpeg) {
		emitCliError(
			"ffmpeg-missing",
			`ffmpeg nicht gefunden. Installiere: ${getPlatformInfo().installHint}`,
		);
	}

	const config = configExists() ? loadConfig() : DEFAULT_CONFIG;
	let executionOptions: RecordExecutionOptions;
	try {
		executionOptions = resolveRecordExecutionOptions(options, config);
	} catch (err) {
		emitCliError("invalid-options", (err as Error).message);
	}

	const isDeterministicMode =
		executionOptions.durationSec !== undefined || !process.stdout.isTTY;

	if (!configExists()) {
		if (isDeterministicMode) {
			console.error(
				JSON.stringify({
					command: "record",
					status: "warning",
					message: "Kein Setup gefunden, Standardwerte werden verwendet",
				}),
			);
		} else {
			console.log(
				chalk.yellow(
					"⚠  Kein Setup – Standardwerte. Tipp: `whisper-poc setup`\n",
				),
			);
		}
	}

	const devices = await listAudioDevices();
	const autoSystemDevice = findSystemAudioDevice(devices);

	const micDevice = devices.find(
		(d) => d.index === executionOptions.micIndex,
	);
	if (!micDevice) {
		emitCliError(
			"mic-device-missing",
			`Kein Mikrofon-Gerät mit Index ${executionOptions.micIndex} gefunden`,
		);
	}

	let systemDevice: AudioDevice | undefined;
	if (executionOptions.systemIndex !== undefined) {
		systemDevice = devices.find((d) => d.index === executionOptions.systemIndex);
		if (!systemDevice) {
			emitCliError(
				"system-device-missing",
				`Kein System-Audio-Gerät mit Index ${executionOptions.systemIndex} gefunden`,
			);
		}
	} else {
		systemDevice = autoSystemDevice;
	}

	if ((executionOptions.mode === "system" || executionOptions.mode === "both") && !systemDevice) {
		emitCliError(
			"system-audio-missing",
			"Kein System-Audio-Gerät gefunden. Installiere BlackHole (macOS) oder VB-Cable (Windows)",
		);
	}

	const resolvedOutputFile = resolveRecordOutputFile(
		executionOptions,
		isDeterministicMode,
	);
	const outputDir = path.dirname(resolvedOutputFile);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	if (isDeterministicMode) {
		const durationSec = executionOptions.durationSec ?? 5;
		const recording = await runDeterministicRecordingSession(
			executionOptions.mode,
			micDevice,
			systemDevice,
			resolvedOutputFile,
			durationSec,
		);

		if (!recording.success) {
			emitCliError("recording-failed", "Aufnahme fehlgeschlagen");
		}

		const stats = fs.statSync(resolvedOutputFile);
		console.log(
			JSON.stringify({
				command: "record",
				status: "ok",
				mode: executionOptions.mode,
				output: path.resolve(resolvedOutputFile),
				durationSec: Number(recording.durationSec.toFixed(2)),
				sizeBytes: stats.size,
			}),
		);
		return;
	}

	let lastFile: string | null = null;

	while (true) {
		const mode: RecordingMode = executionOptions.mode;

		if ((mode === "system" || mode === "both") && !systemDevice) {
			console.error(
				chalk.red("❌  Kein System-Audio-Gerät gefunden.\n") +
				chalk.yellow(
					"   macOS:   BlackHole 2ch → https://existential.audio/blackhole/\n",
				) +
				chalk.yellow("   Windows: VB-Cable → https://vb-audio.com/Cable/"),
			);
			break;
		}

		// Ausgabe-Dateiname
		const outputFile = resolveRecordOutputFile(
			executionOptions,
			false,
			new Date(),
		);
		const outputDir = path.dirname(outputFile);
		if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

		console.log(chalk.gray(`🎛  Mikrofon: [${micDevice.index}] ${micDevice.name}`));
		if ((mode === "system" || mode === "both") && systemDevice) {
			console.log(
				chalk.gray(
					`🔊  System:   [${systemDevice.index}] ${systemDevice.name}`,
				),
			);
		}
		console.log("");

		// ── Aufnahme starten ───────────────────────────────────────────────────
		const { success, durationSec } = await runRecordingSession(
			mode,
			micDevice,
			systemDevice,
			outputFile,
		);

		if (success) {
			lastFile = outputFile;
			const size = formatFileSize(fs.statSync(outputFile).size);
			const dur = formatDuration(durationSec);
			console.log(chalk.green("✅  Aufnahme gespeichert"));
			console.log(
				`   ${chalk.white(path.basename(outputFile))} ${chalk.gray(`(${dur}, ${size})`)}`,
			);
			console.log("");
		} else {
			lastFile = null;
			console.log(chalk.red("❌  Aufnahme fehlgeschlagen.\n"));
		}

		// ── Menü ───────────────────────────────────────────────────────────────
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const choices: any[] = [
			{ name: "🎙  Neue Aufnahme starten", value: "record" },
		];
		if (lastFile) {
			choices.push({ name: "▶   Aufnahme abspielen", value: "play" });
			choices.push({ name: "📝  Transkribieren", value: "transcribe" });
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		choices.push(new (inquirer as any).Separator("───────────────────────"));
		choices.push({ name: "🚪  Beenden", value: "exit" });

		const { action } = await inquirer.prompt<{ action: string }>([
			{
				type: "list",
				name: "action",
				message: "Was möchtest du tun?",
				choices,
			},
		]);

		if (action === "exit") {
			console.log(chalk.gray("\nTschüss! 👋\n"));
			break;
		}

		if (action === "play" && lastFile) {
			console.log(chalk.cyan(`\n▶  Spiele ab: ${path.basename(lastFile)}\n`));
			const player = playAudio(lastFile);
			await new Promise<void>((res) => player.on("close", () => res()));
			console.log("");
		}

		if (action === "transcribe" && lastFile) {
			console.log("");
			await transcribeCommand(lastFile, {});
			console.log("");
		}

		// 'record' → Schleife weiter, neuer Timestamp
		options.output = undefined;
	}
}
