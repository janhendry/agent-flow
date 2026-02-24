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
import {
	configExists,
	getConfigPath,
	loadConfig,
	saveConfig,
} from "../utils/config.js";

const IS_WINDOWS = process.platform === "win32";

const SYSTEM_AUDIO_LABEL = IS_WINDOWS
	? "🔊  Nur System-Audio (benötigt VB-Cable oder Stereo Mix)"
	: "🔊  Nur System-Audio (benötigt BlackHole)";

const BOTH_LABEL = IS_WINDOWS
	? "🋎  Beides – Mikrofon + System-Audio (benötigt VB-Cable oder Stereo Mix)"
	: "🋎  Beides – Mikrofon + System-Audio (benötigt BlackHole)";

const DEFAULT_OUTPUT_DIR = path.join(
	os.homedir(),
	"Desktop",
	"whisper-recordings",
);

function modeShortLabel(mode: RecordingMode): string {
	if (mode === "mic") return "Mic";
	if (mode === "system") return "Audio";
	return "Mic + Audio";
}

function systemLabel(config: Config): string {
	if (config.mode === "mic") return "(nicht aktiv bei Modus mic)";
	if (config.systemIndex === undefined || !config.systemName) return "(automatisch)";
	return `[${config.systemIndex}] ${config.systemName}`;
}

function truncateMiddle(value: string, max = 56): string {
	if (value.length <= max) return value;
	const keep = Math.max(8, Math.floor((max - 1) / 2));
	return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

function menuRow(key: string, value: string): string {
	return `${key.padEnd(8)} │ ${truncateMiddle(value)}`;
}

function isPromptExitError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const maybeError = err as { name?: string; message?: string };
	return (
		maybeError.name === "ExitPromptError" ||
		(maybeError.message?.includes("User force closed the prompt") ?? false)
	);
}

export async function setupCommand(): Promise<void> {
	try {
		console.log(chalk.cyan("\n🎙  Whisper POC – Setup\n"));
		const { name: platformName, installHint } = getPlatformInfo();
		console.log(chalk.gray(`Plattform: ${platformName}`));

		const existingConfig: Config = configExists()
			? loadConfig()
			: {
				mode: "mic",
				micIndex: 0,
				micName: "Standard",
				outputDir: DEFAULT_OUTPUT_DIR,
			};

		if (configExists()) {
			console.log(chalk.gray("Vorhandene Konfiguration gefunden."));
		}

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

		let draftConfig: Config = { ...existingConfig };

		while (true) {
			const actionChoices = [
				{
					name: menuRow("Profile", modeShortLabel(draftConfig.mode)),
					value: "mode",
				},
				{
					name: menuRow(
						"Mic",
						`[${draftConfig.micIndex}] ${draftConfig.micName}`,
					),
					value: "mic",
				},
				{
					name: menuRow("Audio", systemLabel(draftConfig)),
					value: "system",
				},
				{
					name: menuRow("Path", draftConfig.outputDir),
					value: "output",
				},
				{
					name: menuRow(
						"API Key",
						draftConfig.apiKey ? "gesetzt" : "nicht gesetzt",
					),
					value: "apiKey",
				},
				{
					name: menuRow("Base URL", draftConfig.baseUrl ?? "(standard)"),
					value: "baseUrl",
				},
				{ name: "✅  Fertig", value: "done" },
			];

			const { action } = await inquirer.prompt<{ action: string }>({
				type: "list",
				name: "action",
				message: "Was möchtest du ändern?",
				choices: actionChoices,
			});

			if (action === "done") {
				break;
			}

			if (action === "mode") {
				const { mode } = await inquirer.prompt<{ mode: RecordingMode }>({
					type: "list",
					name: "mode",
					message: "Aufnahme-Modus:",
					default: draftConfig.mode,
					choices: [
						{ name: "🎙  Nur Mikrofon", value: "mic" },
						{ name: SYSTEM_AUDIO_LABEL, value: "system" },
						{ name: BOTH_LABEL, value: "both" },
					],
				});
				draftConfig.mode = mode;
				if (draftConfig.mode === "mic") {
					draftConfig.systemIndex = undefined;
					draftConfig.systemName = undefined;
				}
				saveConfig(draftConfig);
				console.log(chalk.green("✓ Profile gespeichert"));
				continue;
			}

			if (action === "mic") {
				const { micIndex } = await inquirer.prompt<{ micIndex: number }>({
					type: "list",
					name: "micIndex",
					message: "Mikrofon auswählen:",
					choices: deviceChoices,
					default: draftConfig.micIndex,
				});
				draftConfig.micIndex = micIndex;
				const selectedMicDevice = devices.find((d) => d.index === micIndex);
				draftConfig.micName = selectedMicDevice?.name ?? "Standard";
				saveConfig(draftConfig);
				console.log(chalk.green("✓ Mic gespeichert"));
				continue;
			}

			if (action === "system") {
				const { systemIndex } = await inquirer.prompt<{ systemIndex: number }>({
					type: "list",
					name: "systemIndex",
					message: "System-Audio-Quelle auswählen:",
					choices: [
						{ name: "Auto (empfohlen)", value: -1 },
						...systemDeviceChoices,
					],
					default:
						draftConfig.systemIndex !== undefined ? draftConfig.systemIndex : -1,
				});

				if (systemIndex === -1) {
					draftConfig.systemIndex = undefined;
					draftConfig.systemName = undefined;
				} else {
					draftConfig.systemIndex = systemIndex;
					const selectedSystemDevice = devices.find((d) => d.index === systemIndex);
					draftConfig.systemName = selectedSystemDevice?.name;
				}
				saveConfig(draftConfig);
				console.log(chalk.green("✓ Audio gespeichert"));
				continue;
			}

			if (action === "output") {
				const { outputDir } = await inquirer.prompt<{ outputDir: string }>({
					type: "input",
					name: "outputDir",
					message: "Ausgabe-Ordner für Aufnahmen:",
					default: draftConfig.outputDir,
				});
				draftConfig.outputDir = outputDir;
				saveConfig(draftConfig);
				console.log(chalk.green("✓ Path gespeichert"));
				continue;
			}

			if (action === "apiKey") {
				const { apiAction } = await inquirer.prompt<{ apiAction: string }>({
					type: "list",
					name: "apiAction",
					message: "API-Key ändern:",
					choices: [
						{ name: "Neu setzen / ersetzen", value: "set" },
						{ name: "Löschen", value: "clear" },
					],
				});

				if (apiAction === "clear") {
					draftConfig.apiKey = undefined;
					saveConfig(draftConfig);
					console.log(chalk.green("✓ API Key gelöscht"));
					continue;
				}

				const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
					type: "password",
					name: "apiKey",
					message: "OpenAI API-Key:",
					mask: "*",
				});

				if (apiKey.trim().length > 0) {
					draftConfig.apiKey = apiKey.trim();
					saveConfig(draftConfig);
					console.log(chalk.green("✓ API Key gespeichert"));
				}
				continue;
			}

			if (action === "baseUrl") {
				const { baseUrlAction } = await inquirer.prompt<{ baseUrlAction: string }>({
					type: "list",
					name: "baseUrlAction",
					message: "Base URL ändern:",
					choices: [
						{ name: "Neu setzen / ersetzen", value: "set" },
						{ name: "Zurück auf Standard", value: "clear" },
					],
				});

				if (baseUrlAction === "clear") {
					draftConfig.baseUrl = undefined;
					saveConfig(draftConfig);
					console.log(chalk.green("✓ Base URL zurückgesetzt"));
					continue;
				}

				const { baseUrl } = await inquirer.prompt<{ baseUrl: string }>({
					type: "input",
					name: "baseUrl",
					message: "Base URL (z. B. https://api.openai.com/v1):",
					default: draftConfig.baseUrl ?? "",
				});

				if (baseUrl.trim().length > 0) {
					draftConfig.baseUrl = baseUrl.trim();
					saveConfig(draftConfig);
					console.log(chalk.green("✓ Base URL gespeichert"));
				}
			}
		}

		console.log(chalk.green("\n✅  Setup beendet"));
		console.log(chalk.gray(`   → ${getConfigPath()}`));
		console.log(chalk.white("\n  Profile:    ") + chalk.cyan(modeShortLabel(draftConfig.mode)));
		console.log(
			chalk.white("  Mic:        ") +
			chalk.cyan(`[${draftConfig.micIndex}] ${draftConfig.micName}`),
		);
		if (draftConfig.mode === "system" || draftConfig.mode === "both") {
			console.log(
				chalk.white("  Audio:      ") +
				chalk.cyan(
					draftConfig.systemName && draftConfig.systemIndex !== undefined
						? `[${draftConfig.systemIndex}] ${draftConfig.systemName}`
						: "(automatisch)",
				),
			);
		}
		console.log(chalk.white("  Path:       ") + chalk.cyan(draftConfig.outputDir));
		console.log(
			chalk.white("  API Key:    ") +
			chalk.cyan(draftConfig.apiKey ? "gesetzt" : "nicht gesetzt"),
		);
		console.log(
			chalk.white("  Base URL:   ") +
			chalk.cyan(draftConfig.baseUrl ?? "(standard)"),
		);
		console.log();
	} catch (err) {
		if (isPromptExitError(err)) {
			console.log(chalk.yellow("\nℹ️  Setup abgebrochen.\n"));
			return;
		}
		throw err;
	}
}
