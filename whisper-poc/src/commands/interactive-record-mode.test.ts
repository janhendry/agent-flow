import assert from "node:assert/strict";
import test from "node:test";
import { resolveRecordModePreflightDecision } from "./interactive-record-mode.js";

test("record mode preflight: system/both ohne system device öffnen setup", () => {
	assert.equal(
		resolveRecordModePreflightDecision("system", false).type,
		"open-setup",
	);
	assert.equal(
		resolveRecordModePreflightDecision("both", false).type,
		"open-setup",
	);
});

test("record mode preflight: mic oder vorhandenes system device startet recording", () => {
	assert.equal(
		resolveRecordModePreflightDecision("mic", false).type,
		"start-recording",
	);
	assert.equal(
		resolveRecordModePreflightDecision("both", true).type,
		"start-recording",
	);
});
