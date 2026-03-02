import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	cleanupInteractiveHistoryArtifacts,
	deleteInteractiveHistoryEntry,
	listInteractiveHistory,
	readInteractiveHistoryContent,
} from "./interactive-history.js";

function createTempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("interactive history: listet txt-dateien sortiert nach aktualität", () => {
	const dir = createTempDir("whisper-poc-history-");
	const first = path.join(dir, "a.txt");
	const second = path.join(dir, "b.txt");

	fs.writeFileSync(first, "A", "utf-8");
	fs.writeFileSync(second, "B", "utf-8");
	const base = Date.now();
	fs.utimesSync(first, new Date(base - 2000), new Date(base - 2000));
	fs.utimesSync(second, new Date(base), new Date(base));

	const entries = listInteractiveHistory(dir);
	assert.equal(entries.length, 2);
	assert.equal(entries[0]?.fileName, "b.txt");
	assert.equal(entries[1]?.fileName, "a.txt");

	fs.rmSync(dir, { recursive: true, force: true });
});

test("interactive history: detail lesen und löschen funktioniert", () => {
	const dir = createTempDir("whisper-poc-history-");
	const file = path.join(dir, "entry.txt");
	fs.writeFileSync(file, "hello history", "utf-8");

	assert.equal(readInteractiveHistoryContent(file), "hello history");
	deleteInteractiveHistoryEntry(file);
	assert.equal(fs.existsSync(file), false);

	fs.rmSync(dir, { recursive: true, force: true });
});

test("interactive history: cleanup entfernt audio-artefakte, lässt txt bestehen", () => {
	const dir = createTempDir("whisper-poc-history-");
	fs.writeFileSync(path.join(dir, "keep.txt"), "text", "utf-8");
	fs.writeFileSync(path.join(dir, "tmp.wav"), "audio", "utf-8");
	fs.writeFileSync(path.join(dir, "tmp.webm"), "audio", "utf-8");

	const result = cleanupInteractiveHistoryArtifacts(dir);
	assert.equal(result.deletedCount, 2);
	assert.equal(fs.existsSync(path.join(dir, "keep.txt")), true);
	assert.equal(fs.existsSync(path.join(dir, "tmp.wav")), false);
	assert.equal(fs.existsSync(path.join(dir, "tmp.webm")), false);

	fs.rmSync(dir, { recursive: true, force: true });
});
