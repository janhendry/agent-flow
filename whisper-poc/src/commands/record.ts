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
import { transcribeCommand } from "./transcribe.js";

interface RecordOptions {
	mode?: string;
	output?: string;
	mic?: string;
	system?: string;
}

const DEFAULT_CONFIG: Config = {
	mode: "mic",
	micIndex: 0,
	micName: "Standard",
	outputDir: path.join(os.homedir(), "Desktop", "whisper-recordings"),
};

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

// ── Haupt-Command (interaktive Schleife) ──────────────────────────────────────

export async function recordCommand(options: RecordOptions): Promise<void> {
	const hasFfmpeg = await checkFfmpeg();
	if (!hasFfmpeg) {
		const { installHint } = getPlatformInfo();
		console.error(
			chalk.red(`❌  ffmpeg nicht gefunden. Installiere: ${installHint}`),
		);
		process.exit(1);
	}

	const config = configExists() ? loadConfig() : DEFAULT_CONFIG;
	if (!configExists()) {
		console.log(
			chalk.yellow(
				"⚠  Kein Setup – Standardwerte. Tipp: `whisper-poc setup`\n",
			),
		);
	}

	const devices = await listAudioDevices();
	const autoSystemDevice = findSystemAudioDevice(devices);
	let lastFile: string | null = null;

	while (true) {
		const mode: RecordingMode = (options.mode as RecordingMode) ?? config.mode;
		const micIndex =
			options.mic !== undefined ? parseInt(options.mic, 10) : config.micIndex;
		const micDevice: AudioDevice = devices.find(
			(d) => d.index === micIndex,
		) ?? { index: config.micIndex, name: config.micName };

		const systemIndex =
			options.system !== undefined
				? parseInt(options.system, 10)
				: config.systemIndex;
		const configuredSystemDevice =
			systemIndex !== undefined
				? devices.find((d) => d.index === systemIndex)
				: undefined;
		const systemDevice = configuredSystemDevice ?? autoSystemDevice;

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
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, 19);
		const outputFile =
			options.output ??
			path.join(config.outputDir, `recording-${timestamp}.wav`);
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
