import assert from "node:assert/strict";
import test from "node:test";
import { resolvePostRecordingScreen } from "./interactive-flow.js";

test("interactive flow: erfolgreicher Record wechselt direkt in Transcribing-Flow", () => {
	const nextScreen = resolvePostRecordingScreen({
		success: true,
		rawFile: "C:/tmp/record.wav",
		durationSec: 4.2,
	});

	assert.equal(nextScreen.id, "transcript");
	if (nextScreen.id === "transcript") {
		assert.equal(nextScreen.filePath, "C:/tmp/record.wav");
		assert.equal(nextScreen.origin, "record-flow");
	}
});

test("interactive flow: Record-Fehler bleibt im Error-Screen", () => {
	const nextScreen = resolvePostRecordingScreen({
		success: false,
		rawFile: "C:/tmp/record.wav",
		durationSec: 0,
		error: "device error",
	});

	assert.equal(nextScreen.id, "summary");
	if (nextScreen.id === "summary") {
		assert.equal(nextScreen.error, "device error");
		assert.equal(nextScreen.filePath, "C:/tmp/record.wav");
	}
});
