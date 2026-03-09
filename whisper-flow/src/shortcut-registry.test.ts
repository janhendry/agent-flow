import assert from "node:assert/strict";
import test from "node:test";
import {
	type ShortcutBindings,
	ShortcutRegistry,
	type ShortcutProvider,
} from "./shortcut-registry";

function createProvider() {
	const callbacks = new Map<string, () => void>();
	const blocked = new Set<string>();

	const provider: ShortcutProvider = {
		register(accelerator, callback) {
			if (blocked.has(accelerator)) {
				return false;
			}
			if (accelerator === "bad") {
				throw new Error("invalid");
			}
			callbacks.set(accelerator, callback);
			return true;
		},
		unregisterAll() {
			callbacks.clear();
		},
		isRegistered(accelerator) {
			return callbacks.has(accelerator);
		},
	};

	return {
		provider,
		block(accelerator: string) {
			blocked.add(accelerator);
		},
		has(accelerator: string) {
			return callbacks.has(accelerator);
		},
	};
}

function createBindings(overrides?: Partial<ShortcutBindings>): ShortcutBindings {
	return {
		recordingToggle: "CommandOrControl+Shift+Space",
		profileOverlayToggle: "CommandOrControl+Shift+P",
		historyOverlayToggle: "CommandOrControl+Shift+H",
		...overrides,
	};
}

test("ShortcutRegistry apply registriert alle Shortcuts", () => {
	const harness = createProvider();
	const registry = new ShortcutRegistry(harness.provider, {
		recordingToggle: () => undefined,
		profileOverlayToggle: () => undefined,
		historyOverlayToggle: () => undefined,
	});

	const result = registry.apply(createBindings());
	assert.equal(result.ok, true);
	assert.equal(result.statuses.length, 3);
	assert.equal(harness.has("CommandOrControl+Shift+Space"), true);
	assert.equal(harness.has("CommandOrControl+Shift+P"), true);
	assert.equal(harness.has("CommandOrControl+Shift+H"), true);
});

test("ShortcutRegistry meldet Registrierungskonflikte und ungueltige Syntax", () => {
	const harness = createProvider();
	harness.block("CommandOrControl+Shift+P");
	const registry = new ShortcutRegistry(harness.provider, {
		recordingToggle: () => undefined,
		profileOverlayToggle: () => undefined,
		historyOverlayToggle: () => undefined,
	});

	const result = registry.apply(
		createBindings({
			historyOverlayToggle: "bad",
		}),
	);

	assert.equal(result.ok, false);
	assert.equal(result.statuses.find((s) => s.action === "recordingToggle")?.registered, true);
	assert.equal(result.statuses.find((s) => s.action === "profileOverlayToggle")?.registered, false);
	assert.equal(result.statuses.find((s) => s.action === "historyOverlayToggle")?.registered, false);
});
