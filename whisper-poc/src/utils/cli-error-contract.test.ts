import assert from "node:assert/strict";
import test from "node:test";
import {
	buildCliErrorEvent,
	classifyCliErrorCode,
	resolveCliExitCode,
} from "./cli-error-contract.js";

test("cli-error-contract: Validation-Fehler werden stabil klassifiziert", () => {
	assert.equal(classifyCliErrorCode("invalid-options"), "validation");
	assert.equal(classifyCliErrorCode("file-not-found"), "validation");
	assert.equal(resolveCliExitCode("invalid-options"), 2);
});

test("cli-error-contract: API-Fehler werden stabil klassifiziert", () => {
	assert.equal(classifyCliErrorCode("missing-api-key"), "api");
	assert.equal(classifyCliErrorCode("transcription-failed"), "api");
	assert.equal(resolveCliExitCode("transcription-failed"), 10);
});

test("cli-error-contract: Runtime-Fehler sind Fallback mit stabilem Exit-Code", () => {
	assert.equal(classifyCliErrorCode("ffmpeg-missing"), "runtime");
	assert.equal(classifyCliErrorCode("runtime-transcription-failed"), "runtime");
	assert.equal(classifyCliErrorCode("setup-runtime"), "runtime");
	assert.equal(classifyCliErrorCode("diagnose-runtime"), "runtime");
	assert.equal(resolveCliExitCode("setup-runtime"), 20);
	assert.equal(resolveCliExitCode("diagnose-runtime"), 20);
});

test("cli-error-contract: Error-Event enthält Klasseninformation", () => {
	const event = buildCliErrorEvent("transcribe", "missing-api-key", "not set");

	assert.equal(event.command, "transcribe");
	assert.equal(event.status, "error");
	assert.equal(event.code, "missing-api-key");
	assert.equal(event.errorClass, "api");
	assert.equal(event.message, "not set");
});
