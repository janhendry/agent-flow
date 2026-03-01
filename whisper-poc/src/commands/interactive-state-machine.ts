export type InteractiveScreenId =
	| "main-menu"
	| "recording"
	| "transcribing"
	| "success"
	| "error"
	| "setup-diagnostics";

export type InteractiveActionId =
	| "move-up"
	| "move-down"
	| "select"
	| "back"
	| "stop-recording"
	| "cancel-recording"
	| "retry"
	| "show-details"
	| "open-setup"
	| "run-diagnostics"
	| "copy"
	| "save"
	| "quit";

export interface InteractiveState {
	screen: InteractiveScreenId;
	menuIndex: number;
	errorDetailsVisible: boolean;
}

export interface InteractiveTransition {
	action: InteractiveActionId;
	nextScreen: InteractiveScreenId;
}

export const MAIN_MENU_ITEMS = [
	"record-and-transcribe",
	"profiles",
	"history",
	"setup-and-diagnostics",
	"exit",
] as const;

export const INTERACTIVE_KEYMAP: Record<
	InteractiveScreenId,
	ReadonlyArray<InteractiveActionId>
> = {
	"main-menu": ["move-up", "move-down", "select", "quit"],
	recording: ["stop-recording", "cancel-recording", "quit"],
	transcribing: ["quit"],
	success: ["copy", "save", "back", "quit"],
	error: ["retry", "show-details", "open-setup", "back", "quit"],
	"setup-diagnostics": ["run-diagnostics", "back", "quit"],
};

export function createInitialInteractiveState(): InteractiveState {
	return {
		screen: "main-menu",
		menuIndex: 0,
		errorDetailsVisible: false,
	};
}

export function reduceInteractiveState(
	state: InteractiveState,
	transition: InteractiveTransition,
): InteractiveState {
	if (transition.action === "move-up") {
		return {
			...state,
			menuIndex:
				(state.menuIndex - 1 + MAIN_MENU_ITEMS.length) % MAIN_MENU_ITEMS.length,
		};
	}

	if (transition.action === "move-down") {
		return {
			...state,
			menuIndex: (state.menuIndex + 1) % MAIN_MENU_ITEMS.length,
		};
	}

	if (transition.action === "show-details" && state.screen === "error") {
		return {
			...state,
			errorDetailsVisible: !state.errorDetailsVisible,
		};
	}

	const nextScreen = transition.nextScreen;
	return {
		...state,
		screen: nextScreen,
		errorDetailsVisible: nextScreen === "error" ? state.errorDetailsVisible : false,
	};
}
