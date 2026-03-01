import assert from "node:assert/strict";
import test from "node:test";
import { resolveTranscribeUiCommand } from "./interactive-transcribe-ui.js";

test("transcribe ui: success-screen unterstützt c/s/q", () => {
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "done", showDetails: false }, "c"),
		{ type: "copy" },
	);
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "done", showDetails: false }, "s"),
		{ type: "save" },
	);
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "done", showDetails: false }, "q"),
		{ type: "back" },
	);
});

test("transcribe ui: error-screen unterstützt r/d/k/q", () => {
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "error", showDetails: false }, "r"),
		{ type: "retry" },
	);
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "error", showDetails: false }, "d"),
		{ type: "toggle-details" },
	);
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "error", showDetails: false }, "k"),
		{ type: "open-setup" },
	);
	assert.deepEqual(
		resolveTranscribeUiCommand({ mode: "error", showDetails: false }, "q"),
		{ type: "back" },
	);
});
