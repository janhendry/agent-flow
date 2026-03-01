import chalk from "chalk";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import ora from "ora";
import path from "node:path";
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

interface TranscribeSuccessMeta {
	command: "transcribe";
	status: "ok";
	file: string;
	output: string;
	sizeKb: number;
	language: string;
	clipboard: "ok";
}

interface TranscribeWarningMeta {
	command: "transcribe";
	status: "warning";
	code: "clipboard-failed";
	message: string;
}

interface ClipboardFailureDecision {
	isFatal: boolean;
	message: string;
}

export function resolveTranscribeDeliveryPlan(writeToStdout: boolean): {
	copyToClipboard: true;
	writeToStdout: boolean;
} {
	return {
		copyToClipboard: true,
		writeToStdout,
	};
}

export function buildStdoutTranscriptPayload(transcript: string): string {
	return transcript;
}

export function buildTranscribeWarningStderrEvent(
	meta: TranscribeWarningMeta,
): string {
	return `${JSON.stringify(meta)}\n`;
}

export function resolveClipboardFailureDecision(
	writeToStdout: boolean,
	error: Error,
): ClipboardFailureDecision {
	const message = `Transkript erzeugt, aber Zwischenablage konnte nicht beschrieben werden: ${error.message}`;
	return {
		isFatal: !writeToStdout,
		message,
	};
}

function runClipboardCommand(command: string, args: string[], text: string): void {
	const result = spawnSync(command, args, {
		input: text,
		encoding: "utf-8",
		stdio: ["pipe", "ignore", "pipe"],
	});

	if (result.error) {
		throw new Error(`Clipboard-Command fehlgeschlagen: ${result.error.message}`);
	}

	if (result.status !== 0) {
		const diagnostics = result.stderr?.toString().trim();
		const diagnosticsSuffix = diagnostics ? `: ${diagnostics}` : "";
		throw new Error(
			`Clipboard-Command exit ${result.status}${diagnosticsSuffix}`,
		);
	}
}

function copyTextToClipboard(text: string): void {
	if (process.platform === "darwin") {
		runClipboardCommand("pbcopy", [], text);
		return;
	}

	if (process.platform === "win32") {
		runClipboardCommand("clip", [], text);
		return;
	}

	if (process.platform === "linux") {
		runClipboardCommand("xclip", ["-selection", "clipboard"], text);
		return;
	}

	throw new Error(`Plattform nicht unterstützt: ${process.platform}`);
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
	const deliveryPlan = resolveTranscribeDeliveryPlan(settings.writeToStdout);

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

	let clipboardWarning: string | undefined;

	if (deliveryPlan.copyToClipboard) {
		try {
			copyTextToClipboard(transcript);
		} catch (err) {
			const decision = resolveClipboardFailureDecision(
				settings.writeToStdout,
				err as Error,
			);
			if (decision.isFatal) {
				emitTranscribeError("clipboard-failed", decision.message);
			} else {
				clipboardWarning = decision.message;
			}
		}
	}

	if (settings.writeToStdout) {
		process.stdout.write(buildStdoutTranscriptPayload(transcript));
		if (clipboardWarning) {
			process.stderr.write(
				buildTranscribeWarningStderrEvent({
					command: "transcribe",
					status: "warning",
					code: "clipboard-failed",
					message: clipboardWarning,
				}),
			);
		}
		return;
	}
	console.log(chalk.green(`✅  Transkript gespeichert: ${outFile}`));
	console.log(chalk.green("✅  Transkript in Zwischenablage kopiert"));
}
