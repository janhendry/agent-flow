import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCliSecretStore } from "./secret-store.adapter.js";
import { type Config } from "../../types.js";

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "wf-secret-store-"));
}

test("secret-store: set/get/clear lifecycle funktioniert deterministisch", () => {
	const tempDir = createTempDir();
	const secretStore = createCliSecretStore({
		baseDir: tempDir,
		configAccessor: {
			exists: () => false,
			load: () => {
				throw new Error("not needed");
			},
			save: () => {
				throw new Error("not needed");
			},
		},
	});

	assert.equal(secretStore.getApiKey(), undefined);
	secretStore.setApiKey("sk-test-123");
	assert.equal(secretStore.getApiKey(), "sk-test-123");

	secretStore.clearApiKey();
	assert.equal(secretStore.getApiKey(), undefined);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("secret-store: legacy apiKey aus Config wird migriert und aus Config entfernt", () => {
	const tempDir = createTempDir();
	let savedConfig: Config | undefined;
	const configState: Config = {
		mode: "mic",
		micIndex: 0,
		micName: "Standard",
		outputDir: "/tmp/records",
		apiKey: "legacy-cleartext-key",
	};

	const secretStore = createCliSecretStore({
		baseDir: tempDir,
		configAccessor: {
			exists: () => true,
			load: () => ({ ...configState }),
			save: (config) => {
				savedConfig = { ...config };
			},
		},
	});

	const migrated = secretStore.getApiKey();
	assert.equal(migrated, "legacy-cleartext-key");
	assert.equal(savedConfig?.apiKey, undefined);

	const secretFile = path.join(tempDir, "secrets.json");
	const raw = fs.readFileSync(secretFile, "utf-8");
	const payload = JSON.parse(raw) as { apiKey?: string };
	assert.equal(payload.apiKey, "legacy-cleartext-key");

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("secret-store: liefert handlungsorientierten Fehler bei Schreibproblemen", () => {
	const tempDir = createTempDir();
	const blockingFile = path.join(tempDir, "secrets.json");
	fs.writeFileSync(blockingFile, "{}", "utf-8");
	fs.mkdirSync(path.join(tempDir, "secrets.json.tmp"), { recursive: true });

	const secretStore = createCliSecretStore({
		baseDir: tempDir,
		configAccessor: {
			exists: () => false,
			load: () => {
				throw new Error("not needed");
			},
			save: () => {
				throw new Error("not needed");
			},
		},
	});

	assert.throws(
		() => secretStore.setApiKey("sk-fail"),
		/Secret-Store-Schreibzugriff fehlgeschlagen/,
	);

	fs.rmSync(tempDir, { recursive: true, force: true });
});
