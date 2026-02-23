#!/usr/bin/env node
import { Command } from "commander";
import { startApp } from "./app.js";
import { recordCommand } from "./commands/record.js";
import { setupCommand } from "./commands/setup.js";
import { transcribeCommand } from "./commands/transcribe.js";

const program = new Command();

program
	.name("whisper-poc")
	.description("Audio aufnehmen und mit Whisper transkribieren")
	.version("0.1.0")
	.action(() => {
		// Kein Subcommand → interaktive TUI starten
		startApp();
	});

// ── setup ──────────────────────────────────────────────────────────────────
program
	.command("setup")
	.description("Interaktives Setup: Modus, Mikrofon und API-Key konfigurieren")
	.action(async () => {
		await setupCommand();
	});

// ── record ─────────────────────────────────────────────────────────────────
program
	.command("record")
	.description("Aufnahme direkt starten (ohne TUI)")
	.option("-m, --mode <mode>", "Aufnahme-Modus: mic | system | both")
	.option("--mic <index>", "avfoundation Mikrofon-Index")
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
	.option("-k, --api-key <key>", "OpenAI API-Key")
	.action(async (file: string, options) => {
		await transcribeCommand(file, options);
	});

program.parse(process.argv);
