import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
	buildStdoutTranscriptPayload,
	buildTranscribeWarningStderrEvent,
	resolveClipboardFailureDecision,
	resolveTranscribeDeliveryPlan,
	resolveTranscribeOutputFile,
	writeTranscriptToFile,
} from "./transcribe.js";

test("transcribe output-contract: clipboard ist Standardpfad", () => {
	const plan = resolveTranscribeDeliveryPlan(false);

	assert.equal(plan.copyToClipboard, true);
	assert.equal(plan.writeToStdout, false);
});

test("transcribe output-contract: stdout payload enthält exakt den Transkripttext", () => {
	const transcript = "Fix token refresh race condition";
	const payload = buildStdoutTranscriptPayload(transcript);

	assert.equal(payload, transcript);
});

test("transcribe output-contract: warning event enthält keine Ergebnisdaten", () => {
	const transcript = "secret transcript content";
	const event = buildTranscribeWarningStderrEvent({
		command: "transcribe",
		status: "warning",
		code: "clipboard-failed",
		message: "Transkript erzeugt, aber Zwischenablage konnte nicht beschrieben werden",
	});

	assert.equal(event.endsWith("\n"), true);
	assert.equal(event.includes(transcript), false);

	const parsed = JSON.parse(event.trim());
	assert.equal(parsed.command, "transcribe");
	assert.equal(parsed.status, "warning");
	assert.equal(parsed.code, "clipboard-failed");
});

test("transcribe output-contract: Clipboard-Fehler ist bei --stdout nicht fatal", () => {
	const decision = resolveClipboardFailureDecision(
		true,
		new Error("clip unavailable"),
	);

	assert.equal(decision.isFatal, false);
	assert.equal(decision.message.includes("clip unavailable"), true);
});

test("transcribe output-contract: Clipboard-Fehler ist im Standardpfad fatal", () => {
	const decision = resolveClipboardFailureDecision(
		false,
		new Error("clip unavailable"),
	);

	assert.equal(decision.isFatal, true);
	assert.equal(decision.message.includes("clip unavailable"), true);
});

test("transcribe output-contract: .webm Input erzeugt standardmäßig .txt und überschreibt nicht Input", () => {
	const input = "/tmp/meeting.webm";
	const output = resolveTranscribeOutputFile(input);

	assert.equal(path.normalize(output), path.normalize("/tmp/meeting.txt"));
	assert.notEqual(output, input);
});

test("transcribe output-contract: write helper liefert runtime-taugliche Fehlermeldung", () => {
	const result = writeTranscriptToFile(
		"/unwritable/path/transcript.txt",
		"hello",
		() => {
			throw new Error("EACCES: permission denied");
		},
	);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(
			result.message.includes("Transkript konnte nicht gespeichert werden"),
			true,
		);
		assert.equal(result.message.includes("EACCES"), true);
	}
});
