import assert from "node:assert/strict";
import test from "node:test";
import {
	createInitialInteractiveState,
	INTERACTIVE_KEYMAP,
	MAIN_MENU_ITEMS,
	reduceInteractiveState,
} from "./interactive-state-machine.js";

test("interactive state machine: initial state ist main-menu mit index 0", () => {
	const initialState = createInitialInteractiveState();
	assert.equal(initialState.screen, "main-menu");
	assert.equal(initialState.menuIndex, 0);
	assert.equal(initialState.errorDetailsVisible, false);
});

test("interactive state machine: move-down rotiert über main menu", () => {
	let state = createInitialInteractiveState();
	for (let index = 0; index < MAIN_MENU_ITEMS.length; index += 1) {
		state = reduceInteractiveState(state, {
			action: "move-down",
			nextScreen: "main-menu",
		});
	}
	assert.equal(state.menuIndex, 0);
});

test("interactive state machine: move-up von 0 rotiert ans Ende", () => {
	const state = reduceInteractiveState(createInitialInteractiveState(), {
		action: "move-up",
		nextScreen: "main-menu",
	});
	assert.equal(state.menuIndex, MAIN_MENU_ITEMS.length - 1);
});

test("interactive state machine: error details toggeln nur im error-screen", () => {
	const errorState = {
		...createInitialInteractiveState(),
		screen: "error" as const,
	};
	const withDetails = reduceInteractiveState(errorState, {
		action: "show-details",
		nextScreen: "error",
	});
	assert.equal(withDetails.errorDetailsVisible, true);

	const hiddenDetails = reduceInteractiveState(withDetails, {
		action: "show-details",
		nextScreen: "error",
	});
	assert.equal(hiddenDetails.errorDetailsVisible, false);
});

test("interactive keymap: error-screen enthält recovery-aktionen", () => {
	const keymap = INTERACTIVE_KEYMAP.error;
	assert.ok(keymap.includes("retry"));
	assert.ok(keymap.includes("show-details"));
	assert.ok(keymap.includes("open-setup"));
	assert.ok(keymap.includes("back"));
});
