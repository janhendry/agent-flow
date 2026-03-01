import chalk from "chalk";
import fs from "fs";
import ora from "ora";
import path from "path";
import { configExists, loadConfig } from "../utils/config.js";
import { createCliSecretStore } from "../adapters/cli/secret-store.adapter.js";
import { transcribeFile } from "../utils/whisper.js";

interface TranscribeOptions {
	language?: string;
	output?: string;
	apiKey?: string;
	baseUrl?: string;
	stdout?: boolean;
}

interface ResolvedTranscribeSettings {
	apiKey?: string;
	baseUrl?: string;
	language: string;
	writeToStdout: boolean;
}

export function resolveTranscribeSettings(
	options: TranscribeOptions,
	config: ReturnType<typeof loadConfig> | null,
	secretApiKey: string | undefined,
	env: NodeJS.ProcessEnv = process.env,
	stdoutIsTty = process.stdout.isTTY,
): ResolvedTranscribeSettings {
	return {
		apiKey:
			options.apiKey ??
			config?.apiKey ??
			secretApiKey ??
			env["OPENAI_API_KEY"],
		baseUrl: options.baseUrl ?? config?.baseUrl ?? env["OPENAI_BASE_URL"],
		language: options.language ?? "de",
		writeToStdout: options.stdout === true || !stdoutIsTty,
	};
}

function emitTranscribeError(code: string, message: string): never {
	console.error(
		JSON.stringify({
			command: "transcribe",
			status: "error",
			code,
			message,
		}),
	);
	process.exit(1);
}

export async function transcribeCommand(
	filePath: string,
	options: TranscribeOptions,
): Promise<void> {
	if (!fs.existsSync(filePath)) {
		emitTranscribeError("file-not-found", `Datei nicht gefunden: ${filePath}`);
	}

	const config = configExists() ? loadConfig() : null;
	const secretStore = createCliSecretStore();
	const settings = resolveTranscribeSettings(
		options,
		config,
		secretStore.getApiKey(),
	);

	if (!settings.writeToStdout) {
		console.log(chalk.cyan("\n📝  Whisper POC – Transkription\n"));
	}

	if (!settings.apiKey) {
		emitTranscribeError(
			"missing-api-key",
			"Kein OpenAI API-Key gefunden (Priorität: Flag > Config > Secret > Env)",
		);
	}

	const lang = settings.language;
	const absPath = path.resolve(filePath);
	const sizeKb = Math.round(fs.statSync(absPath).size / 1024);

	if (!settings.writeToStdout) {
		console.log(chalk.white("  Datei:     ") + chalk.cyan(absPath));
		console.log(chalk.white("  Größe:     ") + chalk.cyan(`${sizeKb} KB`));
		console.log(chalk.white("  Sprache:   ") + chalk.cyan(lang));
		if (settings.baseUrl) {
			console.log(chalk.white("  Base URL:  ") + chalk.cyan(settings.baseUrl));
		}
		console.log();
	}

	const spinner = settings.writeToStdout ? null : ora("Sende an Whisper API...").start();

	let transcript: string;
	try {
		transcript = await transcribeFile(absPath, settings.apiKey, lang, settings.baseUrl);
		spinner?.succeed("Transkription erhalten");
	} catch (err) {
		spinner?.fail("Transkription fehlgeschlagen");
		emitTranscribeError("transcription-failed", (err as Error).message);
	}

	// Optional: in Datei speichern
	const outFile =
		options.output ?? absPath.replace(/\.(wav|mp3|m4a|ogg|flac)$/i, ".txt");

	fs.writeFileSync(outFile, transcript, "utf-8");

	if (settings.writeToStdout) {
		process.stdout.write(`${transcript}\n`);
		process.stderr.write(
			`${JSON.stringify({
				command: "transcribe",
				status: "ok",
				file: absPath,
				output: outFile,
				sizeKb,
				language: lang,
			})}\n`,
		);
		return;
	}

	console.log(
		chalk.cyan("\n── Transkript ──────────────────────────────────\n"),
	);
	console.log(transcript);
	console.log(
		chalk.cyan("\n────────────────────────────────────────────────\n"),
	);
	console.log(chalk.green(`✅  Transkript gespeichert: ${outFile}`));
}
