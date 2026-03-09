import type { AppState } from "./ipc-types";

export type StateTransition =
	| { from: "idle"; to: "recording" }
	| { from: "recording"; to: "transcribing" }
	| { from: "transcribing"; to: "success" }
	| { from: "transcribing"; to: "error" }
	| { from: "success"; to: "idle" }
	| { from: "error"; to: "idle" }
	| { from: "recording"; to: "error" }
	| { from: "recording"; to: "idle" };

const VALID_TRANSITIONS: ReadonlySet<string> = new Set<string>([
	"idle->recording",
	"recording->transcribing",
	"recording->error",
	"recording->idle",
	"transcribing->success",
	"transcribing->error",
	"success->idle",
	"error->idle",
]);

export type StateChangeListener = (state: AppState, previousState: AppState) => void;

export class StateMachine {
	private current: AppState = "idle";
	private readonly listeners: Set<StateChangeListener> = new Set();

	getState(): AppState {
		return this.current;
	}

	canTransition(to: AppState): boolean {
		return VALID_TRANSITIONS.has(`${this.current}->${to}`);
	}

	transition(to: AppState): void {
		if (!this.canTransition(to)) {
			throw new Error(`Invalid state transition: ${this.current} -> ${to}`);
		}
		const previous = this.current;
		this.current = to;
		for (const listener of this.listeners) {
			listener(this.current, previous);
		}
	}

	onStateChange(listener: StateChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	reset(): void {
		const previous = this.current;
		this.current = "idle";
		if (previous !== "idle") {
			for (const listener of this.listeners) {
				listener("idle", previous);
			}
		}
	}
}
