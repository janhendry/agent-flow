import chalk from "chalk";
import fs from "fs";
import ora from "ora";
import path from "path";
import { configExists, loadConfig } from "../utils/config.js";
import { transcribeFile } from "../utils/whisper.js";

interface TranscribeOptions {
	language?: string;
	output?: string;
	apiKey?: string;
}

export async function transcribeCommand(
	filePath: string,
	options: TranscribeOptions,
): Promise<void> {
	console.log(chalk.cyan("\n📝  Whisper POC – Transkription\n"));

	if (!fs.existsSync(filePath)) {
		console.error(chalk.red(`❌  Datei nicht gefunden: ${filePath}`));
		process.exit(1);
	}

	// API-Key: CLI-Option > Config-Datei > Umgebungsvariable
	const config = configExists() ? loadConfig() : null;
	const apiKey =
		options.apiKey ?? config?.apiKey ?? process.env["OPENAI_API_KEY"];

	if (!apiKey) {
		console.error(
			chalk.red("❌  Kein OpenAI API-Key gefunden.\n") +
				chalk.yellow("   Optionen:\n") +
				chalk.yellow("   1. `whisper-poc setup` → API-Key eingeben\n") +
				chalk.yellow("   2. --api-key FLAG beim Aufruf\n") +
				chalk.yellow("   3. Umgebungsvariable: export OPENAI_API_KEY=sk-..."),
		);
		process.exit(1);
	}

	const lang = options.language ?? "de";
	const absPath = path.resolve(filePath);
	const sizeKb = Math.round(fs.statSync(absPath).size / 1024);

	console.log(chalk.white("  Datei:     ") + chalk.cyan(absPath));
	console.log(chalk.white("  Größe:     ") + chalk.cyan(`${sizeKb} KB`));
	console.log(chalk.white("  Sprache:   ") + chalk.cyan(lang));
	console.log();

	const spinner = ora("Sende an Whisper API...").start();

	let transcript: string;
	try {
		transcript = await transcribeFile(absPath, apiKey, lang);
		spinner.succeed("Transkription erhalten");
	} catch (err) {
		spinner.fail("Transkription fehlgeschlagen");
		console.error(chalk.red(`\n❌  ${(err as Error).message}`));
		process.exit(1);
	}

	console.log(
		chalk.cyan("\n── Transkript ──────────────────────────────────\n"),
	);
	console.log(transcript);
	console.log(
		chalk.cyan("\n────────────────────────────────────────────────\n"),
	);

	// Optional: in Datei speichern
	const outFile =
		options.output ?? absPath.replace(/\.(wav|mp3|m4a|ogg|flac)$/i, ".txt");

	fs.writeFileSync(outFile, transcript, "utf-8");
	console.log(chalk.green(`✅  Transkript gespeichert: ${outFile}`));
}
