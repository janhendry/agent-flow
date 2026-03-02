import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyInteractivePostProcessing } from "./interactive-postprocess.js";
import {
	cleanupInteractiveHistoryArtifacts,
	listInteractiveHistory,
} from "./interactive-history.js";

function createTempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function resolveRecordModePreflight(
	mode: "mic" | "system" | "both",
	hasSystemDevice: boolean,
): "start-recording" | "open-setup" {
	if ((mode === "system" || mode === "both") && !hasSystemDevice) {
		return "open-setup";
	}
	return "start-recording";
}

test("integration: record-mode preflight erzwingt setup für system/both ohne system-device", () => {
	assert.equal(resolveRecordModePreflight("system", false), "open-setup");
	assert.equal(resolveRecordModePreflight("both", false), "open-setup");
	assert.equal(resolveRecordModePreflight("mic", false), "start-recording");
	assert.equal(resolveRecordModePreflight("both", true), "start-recording");
});

test("integration: glossary+llm-fallback + history-flow bleiben konsistent", async () => {
	const dir = createTempDir("whisper-poc-capability-");
	const transcriptPath = path.join(dir, "session.txt");
	const audioPath = path.join(dir, "session.wav");

	const post = await applyInteractivePostProcessing("teh wiritescript", {
		llmEnabled: true,
		glossaryText: "wiritescript=>whisper-script",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(post.usedLlm, false);
	assert.equal(post.text, "teh whisper-script");
	assert.equal(post.warnings.length, 1);

	fs.writeFileSync(transcriptPath, post.text, "utf-8");
	fs.writeFileSync(audioPath, "dummy", "utf-8");

	const history = listInteractiveHistory(dir);
	assert.equal(history.length, 1);
	assert.equal(history[0]?.fileName, "session.txt");

	const cleanup = cleanupInteractiveHistoryArtifacts(dir);
	assert.equal(cleanup.deletedCount, 1);
	assert.equal(fs.existsSync(audioPath), false);
	assert.equal(fs.existsSync(transcriptPath), true);

	fs.rmSync(dir, { recursive: true, force: true });
});
