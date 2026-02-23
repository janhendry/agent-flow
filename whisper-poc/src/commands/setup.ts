import chalk from "chalk";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import { Config, RecordingMode } from "../types.js";
import {
	findSystemAudioDevice,
	getPlatformInfo,
	listAudioDevices,
} from "../utils/audio.js";
import { getConfigPath, saveConfig } from "../utils/config.js";

const IS_WINDOWS = process.platform === "win32";

const SYSTEM_AUDIO_LABEL = IS_WINDOWS
	? "🔊  Nur System-Audio (benötigt VB-Cable oder Stereo Mix)"
	: "🔊  Nur System-Audio (benötigt BlackHole)";

const BOTH_LABEL = IS_WINDOWS
	? "🋎  Beides – Mikrofon + System-Audio (benötigt VB-Cable oder Stereo Mix)"
	: "🋎  Beides – Mikrofon + System-Audio (benötigt BlackHole)";

export async function setupCommand(): Promise<void> {
	console.log(chalk.cyan("\n🎙  Whisper POC – Setup\n"));
	const { name: platformName, installHint } = getPlatformInfo();
	console.log(chalk.gray(`Plattform: ${platformName}`));

	// Audio-Geräte laden
	console.log(chalk.gray("Lade Audio-Geräte..."));
	const devices = await listAudioDevices();

	if (devices.length === 0) {
		console.warn(
			chalk.yellow(
				`⚠  Keine Geräte gefunden. Stelle sicher, dass ffmpeg installiert ist: ${installHint}`,
			),
		);
	}

	const deviceChoices = devices.map((d) => ({
		name: `[${d.index}] ${d.name}`,
		value: d.index,
	}));

	if (deviceChoices.length === 0) {
		deviceChoices.push({ name: "[0] Standard-Mikrofon (Fallback)", value: 0 });
	}

	const autoSystemDevice = findSystemAudioDevice(devices);
	const systemDeviceChoices = devices.map((d) => ({
		name: `[${d.index}] ${d.name}`,
		value: d.index,
	}));

	if (autoSystemDevice) {
		systemDeviceChoices.unshift({
			name: `Auto (empfohlen): [${autoSystemDevice.index}] ${autoSystemDevice.name}`,
			value: autoSystemDevice.index,
		});
	}

	if (systemDeviceChoices.length === 0) {
		systemDeviceChoices.push({
			name: "(Keine Geräte gefunden)",
			value: -1,
		});
	}

	const answers = await inquirer.prompt([
		{
			type: "list",
			name: "mode",
			message: "Aufnahme-Modus:",
			choices: [
				{ name: "🎙  Nur Mikrofon", value: "mic" },
				{ name: SYSTEM_AUDIO_LABEL, value: "system" },
				{ name: BOTH_LABEL, value: "both" },
			],
		},
		{
			type: "list",
			name: "micIndex",
			message: "Mikrofon auswählen:",
			choices: deviceChoices,
			when: (ans) => ans.mode === "mic" || ans.mode === "both",
		},
		{
			type: "list",
			name: "systemIndex",
			message: "System-Audio-Quelle auswählen:",
			choices: systemDeviceChoices,
			when: (ans) => ans.mode === "system" || ans.mode === "both",
		},
		{
			type: "input",
			name: "outputDir",
			message: "Ausgabe-Ordner für Aufnahmen:",
			default: path.join(os.homedir(), "Desktop", "whisper-recordings"),
		},
		{
			type: "password",
			name: "apiKey",
			message:
				"OpenAI API-Key (für Transkription, leer lassen zum Überspringen):",
			mask: "*",
		},
	]);

	const selectedDevice = devices.find((d) => d.index === answers.micIndex);
	const selectedSystemDevice = devices.find(
		(d) => d.index === answers.systemIndex,
	);

	const config: Config = {
		mode: answers.mode as RecordingMode,
		micIndex: answers.micIndex ?? 0,
		micName: selectedDevice?.name ?? "Standard",
		systemIndex:
			answers.systemIndex !== undefined && answers.systemIndex >= 0
				? answers.systemIndex
				: undefined,
		systemName: selectedSystemDevice?.name,
		outputDir: answers.outputDir,
		apiKey: answers.apiKey || undefined,
	};

	saveConfig(config);

	console.log(chalk.green("\n✅  Konfiguration gespeichert:"));
	console.log(chalk.gray(`   → ${getConfigPath()}`));
	console.log(chalk.white("\n  Modus:      ") + chalk.cyan(config.mode));
	console.log(
		chalk.white("  Mikrofon:   ") +
		chalk.cyan(`[${config.micIndex}] ${config.micName}`),
	);
	if (config.mode === "system" || config.mode === "both") {
		console.log(
			chalk.white("  System:     ") +
			chalk.cyan(
				config.systemName && config.systemIndex !== undefined
					? `[${config.systemIndex}] ${config.systemName}`
					: "(automatisch)",
			),
		);
	}
	console.log(chalk.white("  Ausgabe:    ") + chalk.cyan(config.outputDir));
	console.log(
		chalk.white("  API-Key:    ") +
		chalk.cyan(config.apiKey ? "****gesetzt****" : "(nicht gesetzt)"),
	);
	console.log();
}
