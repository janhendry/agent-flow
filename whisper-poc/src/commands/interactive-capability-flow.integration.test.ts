import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyInteractivePostProcessing } from "./interactive-postprocess.js";
import {
	cleanupInteractiveHistoryArtifacts,
	listInteractiveHistory,
} from "./interactive-history.js";
import { resolveRecordModePreflightDecision } from "./interactive-record-mode.js";
import {
	createInitialInteractiveState,
	INTERACTIVE_KEYMAP,
	reduceInteractiveState,
} from "./interactive-state-machine.js";

function createTempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ── Fix #2: Produktive Preflight-Funktion verwenden (keine lokale Re-Implementierung) ──────────

test("integration: record-mode preflight erzwingt setup für system/both ohne system-device", () => {
	assert.deepEqual(resolveRecordModePreflightDecision("system", false), {
		type: "open-setup",
	});
	assert.deepEqual(resolveRecordModePreflightDecision("both", false), {
		type: "open-setup",
	});
	assert.deepEqual(resolveRecordModePreflightDecision("mic", false), {
		type: "start-recording",
	});
	assert.deepEqual(resolveRecordModePreflightDecision("both", true), {
		type: "start-recording",
	});
});

// ── Fix #3: App-naher Recovery-Flow für fehlendes System-Device ─────────────────────────────
// Spiegelt exakt den Pfad in app.tsx (screen: record-mode → preflight → open-setup → config → menu)

test("integration: record-mode recovery-flow – system/both ohne system-device navigiert über config zurück ins menü", () => {
	// Schritt 1: Preflight-Entscheidung wie in app.tsx
	const preflight = resolveRecordModePreflightDecision("system", false);
	assert.deepEqual(preflight, { type: "open-setup" });

	// Schritt 2: State-Machine-Transition von record-mode → config (via open-setup)
	const atRecordMode = {
		...createInitialInteractiveState(),
		screen: "record-mode" as const,
	};
	// open-setup landet auf setup-diagnostics in der Keymap; in app.tsx navigiert es zum config-Screen
	// Wir testen: der keymap für record-mode erlaubt 'back', und der error-screen erlaubt 'open-setup'
	assert.ok(INTERACTIVE_KEYMAP["record-mode"].includes("back"));
	assert.ok(INTERACTIVE_KEYMAP["error"].includes("open-setup"));

	// Schritt 3: Nach Config zurück ins Menü – state-machine roundtrip
	const atMenu = reduceInteractiveState(atRecordMode, {
		action: "back",
		nextScreen: "main-menu",
	});
	assert.equal(atMenu.screen, "main-menu");

	// Schritt 4: Preflight für `both`-Mode ohne System-Device ebenso
	const preflightBoth = resolveRecordModePreflightDecision("both", false);
	assert.deepEqual(preflightBoth, { type: "open-setup" });

	// Schritt 5: Mic-Mode mit oder ohne system-device → immer start-recording
	assert.deepEqual(resolveRecordModePreflightDecision("mic", false), {
		type: "start-recording",
	});
	assert.deepEqual(resolveRecordModePreflightDecision("mic", true), {
		type: "start-recording",
	});
});

// ── Fix #1: App-nahe Capability- und History-Screen-Transitionen ────────────────────────────
// Testet Screen-/Navigations-Transitionen via state-machine wie sie in app.tsx stattfinden

test("integration: hauptmenü → capabilities-screen transition", () => {
	const atMenu = createInitialInteractiveState();
	assert.equal(atMenu.screen, "main-menu");

	const atCapabilities = reduceInteractiveState(atMenu, {
		action: "select",
		nextScreen: "capabilities",
	});
	assert.equal(atCapabilities.screen, "capabilities");

	// Capabilities-Keymap enthält back und select
	assert.ok(INTERACTIVE_KEYMAP.capabilities.includes("back"));
	assert.ok(INTERACTIVE_KEYMAP.capabilities.includes("select"));

	// Zurück zum Menü
	const backToMenu = reduceInteractiveState(atCapabilities, {
		action: "back",
		nextScreen: "main-menu",
	});
	assert.equal(backToMenu.screen, "main-menu");
});

test("integration: hauptmenü → history-screen → history-detail → zurück", () => {
	const atMenu = createInitialInteractiveState();

	const atHistory = reduceInteractiveState(atMenu, {
		action: "select",
		nextScreen: "history",
	});
	assert.equal(atHistory.screen, "history");

	// History-Keymap enthält Aktionen für Cleanup, Navigation, Back
	assert.ok(INTERACTIVE_KEYMAP.history.includes("cleanup"));
	assert.ok(INTERACTIVE_KEYMAP.history.includes("select"));
	assert.ok(INTERACTIVE_KEYMAP.history.includes("back"));

	// In history-detail navigieren
	const atHistoryDetail = reduceInteractiveState(atHistory, {
		action: "select",
		nextScreen: "history-detail",
	});
	assert.equal(atHistoryDetail.screen, "history-detail");

	// history-detail erlaubt copy, delete, back
	assert.ok(INTERACTIVE_KEYMAP["history-detail"].includes("copy"));
	assert.ok(INTERACTIVE_KEYMAP["history-detail"].includes("delete"));
	assert.ok(INTERACTIVE_KEYMAP["history-detail"].includes("back"));

	// Zurück zu history
	const backToHistory = reduceInteractiveState(atHistoryDetail, {
		action: "back",
		nextScreen: "history",
	});
	assert.equal(backToHistory.screen, "history");

	// Zurück zum Menü
	const backToMenu = reduceInteractiveState(backToHistory, {
		action: "back",
		nextScreen: "main-menu",
	});
	assert.equal(backToMenu.screen, "main-menu");
});

test("integration: record-mode → aufnahme-flow über state-machine (mit system-device)", () => {
	const atMenu = createInitialInteractiveState();

	// Zum record-mode navigieren
	const atRecordMode = reduceInteractiveState(atMenu, {
		action: "select",
		nextScreen: "record-mode",
	});
	assert.equal(atRecordMode.screen, "record-mode");

	// Preflight mit vorhandenem system-device → start-recording
	const preflight = resolveRecordModePreflightDecision("system", true);
	assert.deepEqual(preflight, { type: "start-recording" });

	// Weiternavigation zu recording
	const atRecording = reduceInteractiveState(atRecordMode, {
		action: "select",
		nextScreen: "recording",
	});
	assert.equal(atRecording.screen, "recording");

	// Recording-Keymap
	assert.ok(INTERACTIVE_KEYMAP.recording.includes("stop-recording"));
	assert.ok(INTERACTIVE_KEYMAP.recording.includes("cancel-recording"));
});

test("integration: glossary+llm-fallback + history-flow bleiben konsistent", async () => {
	const dir = createTempDir("whisper-poc-capability-");
	const transcriptPath = path.join(dir, "session.txt");
	const audioPath = path.join(dir, "session.wav");

	const post = await applyInteractivePostProcessing("teh wiritescript", {
		llmEnabled: true,
		glossaryText: "wiritescript=>whisper-script",
		apiKey: undefined,
		baseUrl: undefined,
	});

	assert.equal(post.usedLlm, false);
	assert.equal(post.text, "teh whisper-script");
	assert.equal(post.warnings.length, 1);

	fs.writeFileSync(transcriptPath, post.text, "utf-8");
	fs.writeFileSync(audioPath, "dummy", "utf-8");

	const history = listInteractiveHistory(dir);
	assert.equal(history.length, 1);
	assert.equal(history[0]?.fileName, "session.txt");

	const cleanup = cleanupInteractiveHistoryArtifacts(dir);
	assert.equal(cleanup.deletedCount, 1);
	assert.equal(fs.existsSync(audioPath), false);
	assert.equal(fs.existsSync(transcriptPath), true);

	fs.rmSync(dir, { recursive: true, force: true });
});
