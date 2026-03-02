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

// ── Mehrzeilige Glossar-Regeln (HIGH: Round-4 coverage gap) ───────────────

test("interactive postprocess: mehrere glossar-regeln per zeilenumbruch werden alle angewendet", async () => {
	const result = await applyInteractivePostProcessing(
		"wiritescript is great and typescript is fun",
		{
			llmEnabled: false,
			glossaryText: "wiritescript=>whisper-script\ntypescript=>TypeScript",
			apiKey: undefined,
			baseUrl: undefined,
		},
	);

	assert.equal(result.text, "whisper-script is great and TypeScript is fun");
	assert.equal(result.usedLlm, false);
	assert.equal(result.warnings.length, 0);
});

test("interactive postprocess: kommentare und leerzeilen in glossar werden ignoriert", async () => {
	const result = await applyInteractivePostProcessing("foo bar baz", {
		llmEnabled: false,
		glossaryText: "# das ist ein kommentar\n\nfoo=>FOO\n\n# noch ein kommentar\nbar=>BAR",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "FOO BAR baz");
	assert.equal(result.warnings.length, 0);
});

test("interactive postprocess: gleichheitszeichen-separator (=) wird unterstützt", async () => {
	const result = await applyInteractivePostProcessing("hello world", {
		llmEnabled: false,
		glossaryText: "hello=hallo",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "hallo world");
	assert.equal(result.warnings.length, 0);
});

test("interactive postprocess: gemischte => und = separatoren in mehrzeiligem glossar", async () => {
	const result = await applyInteractivePostProcessing("alpha beta gamma", {
		llmEnabled: false,
		glossaryText: "alpha=>ALPHA\nbeta=BETA",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "ALPHA BETA gamma");
	assert.equal(result.warnings.length, 0);
});

test("interactive postprocess: leeres glossar ergibt keine veränderungen", async () => {
	const result = await applyInteractivePostProcessing("unchanged text", {
		llmEnabled: false,
		glossaryText: "",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(result.text, "unchanged text");
	assert.equal(result.warnings.length, 0);
});

// ── llmModel-Weiterleitung (LOW: Round-4) ─────────────────────────────────

test("interactive postprocess: llmModel-option wird ohne api-key ignoriert (kein absturz)", async () => {
	// Wenn kein API-Key vorhanden, darf llmModel die Logik nicht beeinflussen
	const result = await applyInteractivePostProcessing("test", {
		llmEnabled: true,
		glossaryText: "test=>TEST",
		apiKey: undefined,
		baseUrl: undefined,
		llmModel: "gpt-4o",
	});

	assert.equal(result.text, "TEST"); // Glossar angewendet, kein LLM
	assert.equal(result.usedLlm, false);
	assert.equal(result.warnings.length, 1);
	assert.match(result.warnings[0] ?? "", /kein API-Key/i);
});

// Hinweis: Die tatsächliche Modell-Auswahl via WHISPER_LLM_MODEL kann in Unit-Tests
// nicht verifiziert werden, da dafür ein echter/gemockter OpenAI-Call nötig wäre.
// Dieser Test prüft, dass eine gesetzte Env-Var keinen Crash verursacht und
// Glossar-Regeln trotzdem korrekt angewendet werden.
test("interactive postprocess: llm enabled mit gesetzter env-var aber ohne api-key – glossar greift, kein llm-call", async () => {
	const previousEnv = process.env["WHISPER_LLM_MODEL"];
	process.env["WHISPER_LLM_MODEL"] = "gpt-3.5-turbo";
	try {
		const result = await applyInteractivePostProcessing("envtest foobar", {
			llmEnabled: true,
			glossaryText: "foobar=>baz",
			apiKey: undefined,
			baseUrl: undefined,
			// Kein API-Key → Early-Return vor dem Modell-Lookup; env-var hat keinen Nebeneffekt
		});
		assert.equal(result.text, "envtest baz");
		assert.equal(result.usedLlm, false);
		assert.equal(result.warnings.length, 1);
		assert.match(result.warnings[0] ?? "", /kein API-Key/i);
	} finally {
		if (previousEnv === undefined) {
			delete process.env["WHISPER_LLM_MODEL"];
		} else {
			process.env["WHISPER_LLM_MODEL"] = previousEnv;
		}
	}
});
