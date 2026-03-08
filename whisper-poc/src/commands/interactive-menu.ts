export type InteractiveMenuTarget =
	| "record"
	| "record-only"
	| "play"
	| "transcribe"
	| "history"
	| "capabilities"
	| "config"
	| "exit";

export interface InteractiveMenuItem {
	label: string;
	value: InteractiveMenuTarget;
}

const REQUIRED_MENU_TARGETS: ReadonlyArray<InteractiveMenuTarget> = [
	"record",
	"record-only",
	"play",
	"transcribe",
	"history",
	"capabilities",
	"config",
	"exit",
];

export function validateInteractiveMainMenuItems(
	items: ReadonlyArray<InteractiveMenuItem>,
): void {
	const seen = new Set<InteractiveMenuTarget>();
	for (const item of items) {
		if (seen.has(item.value)) {
			throw new Error(`Doppelter Menüeintrag: ${item.value}`);
		}
		seen.add(item.value);
	}

	for (const requiredTarget of REQUIRED_MENU_TARGETS) {
		if (!seen.has(requiredTarget)) {
			throw new Error(`Fehlender Menüeintrag: ${requiredTarget}`);
		}
	}
}

export function getInteractiveMainMenuItems(): InteractiveMenuItem[] {
	const items: InteractiveMenuItem[] = [
		{ label: "🎙  Aufnahme + direkte Transkription", value: "record" },
		{ label: "🎧  Nur Aufnahme (später transkribieren)", value: "record-only" },
		{ label: "▶   Audio abspielen", value: "play" },
		{ label: "📝  Transkribieren", value: "transcribe" },
		{ label: "🗂  History", value: "history" },
		{ label: "🧠  Capability-Optionen", value: "capabilities" },
		{ label: "⚙   Einstellungen", value: "config" },
		{ label: "🚪  Beenden", value: "exit" },
	];
	validateInteractiveMainMenuItems(items);
	return items;
}
