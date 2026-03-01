import assert from "node:assert/strict";
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

test("cli help: interactive command ist vorhanden", () => {
	const result = runCli(["--help"]);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /interactive/);
});

test("interactive: Setup-Weiterleitungsloop liefert contract-konformen Runtime-Fehler", () => {
	const result = runCli(["interactive"], {
		WHISPER_POC_TEST_FORCE_INTERACTIVE_SETUP_LOOP: "1",
	});

	assert.equal(result.status, 20);
	const line = result.stderr
		.split("\n")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.find((entry) => entry.startsWith("{"));
	assert.ok(line, "Expected JSON error event on stderr");
	const event = JSON.parse(line as string);
	assert.equal(event.command, "interactive");
	assert.equal(event.code, "setup-runtime");
	assert.equal(event.errorClass, "runtime");
});
