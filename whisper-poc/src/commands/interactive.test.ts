import assert from "node:assert/strict";
import test from "node:test";
import { interactiveCommand } from "./interactive.js";
import {
	getInteractiveMainMenuItems,
	validateInteractiveMainMenuItems,
} from "./interactive-menu.js";

test("interactive menu: enthält erwartete Hauptmenü-Einträge in stabiler Reihenfolge", () => {
	const items = getInteractiveMainMenuItems();
	assert.deepEqual(
		items.map((item) => item.value),
		[
			"record",
			"record-only",
			"play",
			"transcribe",
			"history",
			"capabilities",
			"config",
			"exit",
		],
	);
	assert.equal(items[0]?.label.includes("Aufnahme"), true);
	assert.equal(items[3]?.label.includes("Transkribieren"), true);
});

test("interactive menu: Validierung schlägt bei doppeltem Eintrag fehl", () => {
	assert.throws(() =>
		validateInteractiveMainMenuItems([
			{ label: "A", value: "record" },
			{ label: "B", value: "record" },
			{ label: "C", value: "record-only" },
			{ label: "D", value: "play" },
			{ label: "E", value: "transcribe" },
			{ label: "F", value: "history" },
			{ label: "G", value: "capabilities" },
			{ label: "H", value: "config" },
			{ label: "I", value: "exit" },
		]),
	);
});

test("interactive command: führt setup aus und kehrt danach ins Menü zurück", async () => {
	const callOrder: string[] = [];
	const exitReasons: Array<"open-setup" | "exit"> = ["open-setup", "exit"];

	await interactiveCommand({
		startApp: async () => {
			callOrder.push("startApp");
			const next = exitReasons.shift();
			return next ?? "exit";
		},
		setupCommand: async () => {
			callOrder.push("setupCommand");
		},
	});

	assert.deepEqual(callOrder, ["startApp", "setupCommand", "startApp"]);
});

test("interactive command: beendet direkt bei normalem Exit", async () => {
	let startCalls = 0;
	let setupCalls = 0;

	await interactiveCommand({
		startApp: async () => {
			startCalls += 1;
			return "exit";
		},
		setupCommand: async () => {
			setupCalls += 1;
		},
	});

	assert.equal(startCalls, 1);
	assert.equal(setupCalls, 0);
});

test("interactive command: bricht bei zu vielen setup-Weiterleitungen ab", async () => {
	await assert.rejects(
		interactiveCommand(
			{
				startApp: async () => "open-setup",
				setupCommand: async () => { },
				ensureRuntimeReady: async () => { },
			},
			2,
		),
	);
});
