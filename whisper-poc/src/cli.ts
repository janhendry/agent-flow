#!/usr/bin/env node
import { Command } from "commander";
import { diagnoseCommand } from "./commands/diagnose.js";
import { interactiveCommand } from "./commands/interactive.js";
import { recordCommand } from "./commands/record.js";
import { setupCommand } from "./commands/setup.js";
import { transcribeCommand } from "./commands/transcribe.js";
import { emitCliErrorAndExit } from "./utils/cli-error-contract.js";
import { applyRuntimeWarningPolicy } from "./utils/runtime-warning-policy.js";

applyRuntimeWarningPolicy();

const program = new Command();

async function runInteractiveCommand(): Promise<void> {
	if (process.env["WHISPER_POC_TEST_FORCE_INTERACTIVE_SETUP_LOOP"] === "1") {
		await interactiveCommand(
			{
				startApp: async () => "open-setup",
				setupCommand: async () => {},
			},
			2,
		);
		return;
	}

	await interactiveCommand();
}

program
	.name("whisper-poc")
	.description("Audio aufnehmen und mit Whisper transkribieren")
	.version("0.1.0")
	.action(async () => {
		try {
			await runInteractiveCommand();
		} catch (error) {
			emitCliErrorAndExit(
				"interactive",
				"setup-runtime",
				`Interactive-Start fehlgeschlagen: ${(error as Error).message}`,
			);
		}
	});

program
	.command("interactive")
	.description("Interaktives Hauptmenü (keyboard-first)")
	.action(async () => {
		try {
			await runInteractiveCommand();
		} catch (error) {
			emitCliErrorAndExit(
				"interactive",
				"setup-runtime",
				`Interactive-Start fehlgeschlagen: ${(error as Error).message}`,
			);
		}
	});

// ── setup ──────────────────────────────────────────────────────────────────
program
	.command("setup")
	.description("Interaktives Setup: Profile, Audio, Pfad, API-Key und Base URL")
	.action(async () => {
		await setupCommand();
	});

// ── record ─────────────────────────────────────────────────────────────────
program
	.command("record")
	.description("Aufnahme direkt starten (ohne TUI)")
	.option("-m, --mode <mode>", "Aufnahme-Modus: mic | system | both")
	.option("--mic <index>", "avfoundation Mikrofon-Index")
	.option("--system <index>", "System-Audio-Gerät-Index")
	.option("-d, --duration <sekunden>", "Aufnahmedauer in Sekunden (non-interactive)")
	.option("-o, --output <datei>", "Ausgabedatei-Pfad")
	.action(async (options) => {
		await recordCommand(options);
	});

// ── transcribe ─────────────────────────────────────────────────────────────
program
	.command("transcribe <datei>")
	.description("Audio-Datei transkribieren (ohne TUI)")
	.option("-l, --language <lang>", "Sprache (ISO 639-1)", "de")
	.option("-o, --output <datei>", "Transkript-Ausgabedatei (.txt)")
	.option("--stdout", "Transkript auf stdout ausgeben (pipeline-fähig)")
	.option("-k, --api-key <key>", "OpenAI API-Key")
	.option("-b, --base-url <url>", "OpenAI-kompatible Base URL")
	.action(async (file: string, options) => {
		await transcribeCommand(file, options);
	});

program
	.command("diagnose")
	.description("Diagnose für ffmpeg, API-Key und Konfigurationskonsistenz")
	.action(async () => {
		await diagnoseCommand();
	});

program.parse(process.argv);
