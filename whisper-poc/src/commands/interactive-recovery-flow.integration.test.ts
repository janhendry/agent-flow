import assert from "node:assert/strict";
import test from "node:test";
import { resolveTranscribeUiCommand } from "./interactive-transcribe-ui.js";
import {
	buildSetupTransitionFromTranscript,
	completeConfigRecovery,
} from "./interactive-recovery-flow.js";

test("interactive recovery flow: error-key 'k' führt über setup zurück in transcript-kontext", () => {
	const command = resolveTranscribeUiCommand(
		{ mode: "error", showDetails: false },
		"k",
	);
	assert.deepEqual(command, { type: "open-setup" });

	const setupTransition = buildSetupTransitionFromTranscript({
		filePath: "C:/tmp/session.wav",
		origin: "filepick",
	});
	assert.deepEqual(setupTransition.nextScreen, { id: "config" });
	assert.deepEqual(setupTransition.configReturnTarget, {
		id: "transcript",
		filePath: "C:/tmp/session.wav",
		origin: "filepick",
	});

	const afterConfig = completeConfigRecovery(setupTransition.configReturnTarget);
	assert.deepEqual(afterConfig.nextScreen, {
		id: "transcript",
		filePath: "C:/tmp/session.wav",
		origin: "filepick",
	});
	assert.deepEqual(afterConfig.resetReturnTarget, { id: "menu" });

	const retryCommand = resolveTranscribeUiCommand(
		{ mode: "error", showDetails: false },
		"r",
	);
	assert.deepEqual(retryCommand, { type: "retry" });
});
