import assert from "node:assert/strict";
import test from "node:test";
import { applyInteractivePostProcessing } from "./interactive-postprocess.js";

test("interactive postprocess: glossary-regeln werden ohne llm angewendet", async () => {
	const result = await applyInteractivePostProcessing("wiritescript test", {
		llmEnabled: false,
		glossaryText: "wiritescript=>whisper-script",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "whisper-script test");
	assert.equal(result.usedLlm, false);
	assert.equal(result.warnings.length, 0);
});

test("interactive postprocess: llm enabled ohne api-key fällt deterministisch zurück", async () => {
	const result = await applyInteractivePostProcessing("hello", {
		llmEnabled: true,
		glossaryText: "",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "hello");
	assert.equal(result.usedLlm, false);
	assert.equal(result.warnings.length, 1);
	assert.match(result.warnings[0] ?? "", /kein API-Key/i);
});
