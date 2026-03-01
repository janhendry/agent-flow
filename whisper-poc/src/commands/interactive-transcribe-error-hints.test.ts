import assert from "node:assert/strict";
import test from "node:test";
import { toActionableTranscribeErrorHint } from "./interactive-transcribe-error-hints.js";

test("error hints: ordnet API-Key Fehler handlungsorientiert zu", () => {
	const hint = toActionableTranscribeErrorHint(
		"Kein OpenAI API-Key. Einstellungen öffnen oder OPENAI_API_KEY setzen.",
	);

	assert.equal(hint.message, "API-Key fehlt oder ist ungültig.");
	assert.match(hint.action, /Setup/);
});

test("error hints: ordnet 429-Fehler handlungsorientiert zu", () => {
	const hint = toActionableTranscribeErrorHint("HTTP 429 rate limit exceeded");

	assert.equal(hint.message, "API-Limit erreicht oder Anfrage gedrosselt.");
	assert.match(hint.action, /\[r\]/);
});

test("error hints: ordnet Netzwerkfehler handlungsorientiert zu", () => {
	const hint = toActionableTranscribeErrorHint("ETIMEDOUT while uploading");

	assert.equal(hint.message, "Netzwerkproblem bei der Transkription.");
	assert.match(hint.action, /Proxy/);
});

test("error hints: fallback bleibt kurz und handlungsorientiert", () => {
	const hint = toActionableTranscribeErrorHint("Unbekannter Fehler XYZ");

	assert.equal(hint.message, "Transkription ist fehlgeschlagen.");
	assert.match(hint.action, /Retry|Setup/);
});
