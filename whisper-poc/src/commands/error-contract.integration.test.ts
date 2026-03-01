import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

function runCli(args: string[], envOverrides?: NodeJS.ProcessEnv) {
	const cliPath = fileURLToPath(new URL("../cli.js", import.meta.url));
	return spawnSync(process.execPath, [cliPath, ...args], {
		encoding: "utf-8",
		env: { ...process.env, ...envOverrides },
	});
}

function parseErrorEvent(stderr: string) {
	const line = stderr
		.split("\n")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.find((entry) => entry.startsWith("{"));
	assert.ok(line, "Expected JSON error event on stderr");
	return JSON.parse(line);
}

test("cli error contract: transcribe file-not-found liefert validation Exit-Code", () => {
	const result = runCli(["transcribe", "./definitely-missing-file.wav"]);

	assert.equal(result.status, 2);
	const event = parseErrorEvent(result.stderr);
	assert.equal(event.command, "transcribe");
	assert.equal(event.code, "file-not-found");
	assert.equal(event.errorClass, "validation");
});

test("cli error contract: transcribe missing-api-key liefert api Exit-Code", () => {
	const tempFile = path.join(os.tmpdir(), `wf-api-${Date.now()}.webm`);
	fs.writeFileSync(tempFile, "dummy");

	try {
		const result = runCli([
			"transcribe",
			tempFile,
			"--api-key=",
		]);

		assert.equal(result.status, 10);
		const event = parseErrorEvent(result.stderr);
		assert.equal(event.command, "transcribe");
		assert.equal(event.code, "missing-api-key");
		assert.equal(event.errorClass, "api");
	} finally {
		fs.rmSync(tempFile, { force: true });
	}
});

test("cli error contract: transcribe runtime-Konvertierungsfehler liefert runtime Exit-Code", () => {
	const tempFile = path.join(os.tmpdir(), `wf-runtime-${Date.now()}.wav`);
	fs.writeFileSync(tempFile, "not-a-real-wave-file");

	try {
		const result = runCli([
			"transcribe",
			tempFile,
			"--api-key=dummy",
		]);

		assert.equal(result.status, 20);
		const event = parseErrorEvent(result.stderr);
		assert.equal(event.command, "transcribe");
		assert.equal(event.code, "runtime-transcription-failed");
		assert.equal(event.errorClass, "runtime");
	} finally {
		fs.rmSync(tempFile, { force: true });
	}
});

test("cli error contract: record ohne ffmpeg liefert runtime Exit-Code", () => {
	const result = runCli(["record", "--duration", "1"], {
		PATH: "",
	});

	assert.equal(result.status, 20);
	const event = parseErrorEvent(result.stderr);
	assert.equal(event.command, "record");
	assert.equal(event.code, "ffmpeg-missing");
	assert.equal(event.errorClass, "runtime");
});

test("cli error contract: setup runtime-Fehler liefert runtime Exit-Code", () => {
	const result = runCli(["setup"], {
		WHISPER_POC_TEST_FORCE_SETUP_ERROR: "1",
	});

	assert.equal(result.status, 20);
	const event = parseErrorEvent(result.stderr);
	assert.equal(event.command, "setup");
	assert.equal(event.code, "setup-runtime");
	assert.equal(event.errorClass, "runtime");
});
