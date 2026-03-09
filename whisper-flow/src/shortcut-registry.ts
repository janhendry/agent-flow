export const SHORTCUT_ACTIONS = [
	"recordingToggle",
	"profileOverlayToggle",
	"historyOverlayToggle",
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export interface ShortcutBindings {
	recordingToggle: string;
	profileOverlayToggle: string;
	historyOverlayToggle: string;
}

export interface ShortcutStatus {
	action: ShortcutAction;
	accelerator: string;
	registered: boolean;
	error?: string;
}

export interface ShortcutApplyResult {
	ok: boolean;
	statuses: ShortcutStatus[];
}

export interface ShortcutProvider {
	register(accelerator: string, callback: () => void): boolean;
	unregisterAll(): void;
	isRegistered(accelerator: string): boolean;
}

export interface ShortcutHandlerMap {
	recordingToggle: () => void;
	profileOverlayToggle: () => void;
	historyOverlayToggle: () => void;
}

function normalizeAccelerator(value: string): string {
	return value
		.split("+")
		.map((part) => part.trim())
		.filter(Boolean)
		.join("+");
}

export class ShortcutRegistry {
	private readonly provider: ShortcutProvider;
	private readonly handlers: ShortcutHandlerMap;
	private statuses: ShortcutStatus[] = [];

	constructor(provider: ShortcutProvider, handlers: ShortcutHandlerMap) {
		this.provider = provider;
		this.handlers = handlers;
	}

	apply(bindings: ShortcutBindings): ShortcutApplyResult {
		this.provider.unregisterAll();

		const statuses: ShortcutStatus[] = [];
		for (const action of SHORTCUT_ACTIONS) {
			const accelerator = normalizeAccelerator(bindings[action]);
			let registered = false;
			let error: string | undefined;

			try {
				registered = this.provider.register(accelerator, this.handlers[action]);
				if (!registered) {
					error = "Shortcut konnte nicht registriert werden (moeglicher Konflikt oder reservierte Kombination).";
				}
			} catch {
				error = "Shortcut konnte nicht registriert werden (ungueltige Accelerator-Syntax).";
			}

			statuses.push({
				action,
				accelerator,
				registered,
				error,
			});
		}

		this.statuses = statuses;
		return {
			ok: statuses.every((item) => item.registered),
			statuses: [...statuses],
		};
	}

	getStatuses(): ShortcutStatus[] {
		return this.statuses.map((status) => ({
			...status,
			registered: this.provider.isRegistered(status.accelerator),
		}));
	}

	unregisterAll(): void {
		this.provider.unregisterAll();
		this.statuses = this.statuses.map((status) => ({
			...status,
			registered: false,
		}));
	}
}
