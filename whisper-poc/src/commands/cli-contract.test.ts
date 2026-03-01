import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { Config } from "../types.js";
import {
	resolveRecordExecutionOptions,
	resolveRecordOutputFile,
} from "./record.js";
import { resolveTranscribeSettings } from "./transcribe.js";

const baseConfig: Config = {
	mode: "mic",
	micIndex: 3,
	micName: "Mic 3",
	systemIndex: 7,
	outputDir: "/tmp/records",
	apiKey: "cfg-key",
	baseUrl: "https://cfg.example",
};

test("record: Priorität Flag > Config > Env", () => {
	const resolved = resolveRecordExecutionOptions(
		{
			mode: "both",
			mic: "11",
			system: "12",
			output: "/tmp/custom.wav",
			duration: "9",
		},
		baseConfig,
		{
			WHISPER_POC_MODE: "system",
			WHISPER_POC_MIC: "99",
			WHISPER_POC_SYSTEM: "98",
			WHISPER_POC_RECORD_DURATION: "15",
		},
	);

	assert.equal(resolved.mode, "both");
	assert.equal(resolved.micIndex, 11);
	assert.equal(resolved.systemIndex, 12);
	assert.equal(resolved.outputFile, "/tmp/custom.wav");
	assert.equal(resolved.durationSec, 9);
});

test("record: nutzt Config wenn Flags fehlen", () => {
	const resolved = resolveRecordExecutionOptions({}, baseConfig, {
		WHISPER_POC_MODE: "system",
		WHISPER_POC_MIC: "99",
		WHISPER_POC_SYSTEM: "98",
		WHISPER_POC_RECORD_DURATION: "15",
	});

	assert.equal(resolved.mode, "mic");
	assert.equal(resolved.micIndex, 3);
	assert.equal(resolved.systemIndex, 7);
	assert.equal(path.normalize(resolved.outputDir), path.normalize("/tmp/records"));
	assert.equal(resolved.durationSec, 15);
});

test("record: ungültiger Modus wirft Fehler", () => {
	assert.throws(() =>
		resolveRecordExecutionOptions({ mode: "invalid" }, baseConfig, {}),
	);
});

test("record: ungültiger System-Index wirft Fehler", () => {
	assert.throws(() =>
		resolveRecordExecutionOptions({ system: "abc" }, baseConfig, {}),
	);
});

test("record: interaktiv ohne --output nutzt timestamp-basierten Dateinamen", () => {
	const resolved = resolveRecordExecutionOptions({}, baseConfig, {});
	const output = resolveRecordOutputFile(
		resolved,
		false,
		new Date("2026-03-01T10:20:30.000Z"),
	);
	assert.equal(
		path.normalize(output),
		path.normalize("/tmp/records/recording-2026-03-01T10-20-30.wav"),
	);
});

test("record: deterministisch ohne --output nutzt recording.wav", () => {
	const resolved = resolveRecordExecutionOptions({}, baseConfig, {});
	const output = resolveRecordOutputFile(resolved, true);
	assert.equal(path.normalize(output), path.normalize("/tmp/records/recording.wav"));
});

test("transcribe: Priorität Flag > Secret > Env", () => {
	const resolved = resolveTranscribeSettings(
		{
			apiKey: "flag-key",
			baseUrl: "https://flag.example",
			language: "en",
			stdout: true,
		},
		baseConfig,
		"secret-key",
		{ OPENAI_API_KEY: "env-key", OPENAI_BASE_URL: "https://env.example" },
		true,
	);

	assert.equal(resolved.apiKey, "flag-key");
	assert.equal(resolved.baseUrl, "https://flag.example");
	assert.equal(resolved.language, "en");
	assert.equal(resolved.writeToStdout, true);
});

test("transcribe: fallback ohne Flags", () => {
	const resolved = resolveTranscribeSettings(
		{},
		null,
		"secret-key",
		{ OPENAI_API_KEY: "env-key", OPENAI_BASE_URL: "https://env.example" },
		false,
	);

	assert.equal(resolved.apiKey, "secret-key");
	assert.equal(resolved.baseUrl, "https://env.example");
	assert.equal(resolved.language, "de");
	assert.equal(resolved.writeToStdout, true);
});

test("transcribe: ohne --stdout und mit TTY bleibt stdout optional", () => {
	const resolved = resolveTranscribeSettings(
		{},
		baseConfig,
		"secret-key",
		{ OPENAI_API_KEY: "env-key", OPENAI_BASE_URL: "https://env.example" },
		true,
	);

	assert.equal(resolved.writeToStdout, false);
});

test("transcribe: nutzt Secret vor Env, ignoriert Klartext-Key in Config", () => {
	const resolved = resolveTranscribeSettings(
		{},
		baseConfig,
		"secret-key",
		{ OPENAI_API_KEY: "env-key" },
		true,
	);

	assert.equal(resolved.apiKey, "secret-key");
});

test("transcribe: normalisiert API-Key aus Env (trim + empty => undefined)", () => {
	const trimmed = resolveTranscribeSettings(
		{},
		null,
		undefined,
		{ OPENAI_API_KEY: "  env-key  " },
		true,
	);
	assert.equal(trimmed.apiKey, "env-key");

	const empty = resolveTranscribeSettings(
		{},
		null,
		undefined,
		{ OPENAI_API_KEY: "   " },
		true,
	);
	assert.equal(empty.apiKey, undefined);
});

test("transcribe: normalisiert API-Key-Flag und fällt korrekt zurück", () => {
	const fromSecret = resolveTranscribeSettings(
		{ apiKey: "   " },
		null,
		" secret-key ",
		{ OPENAI_API_KEY: "env-key" },
		true,
	);
	assert.equal(fromSecret.apiKey, "secret-key");
});
