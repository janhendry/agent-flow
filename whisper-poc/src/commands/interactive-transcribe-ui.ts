export type TranscribeUiMode = "loading" | "done" | "error";

export interface TranscribeUiState {
	mode: TranscribeUiMode;
	showDetails: boolean;
}

export type TranscribeUiCommand =
	| { type: "none" }
	| { type: "back" }
	| { type: "retry" }
	| { type: "open-setup" }
	| { type: "copy" }
	| { type: "save" }
	| { type: "toggle-details" };

function normalizeKey(input: string): string {
	return input.trim().toLowerCase();
}

export function resolveTranscribeUiCommand(
	state: TranscribeUiState,
	key: string,
): TranscribeUiCommand {
	const normalizedKey = normalizeKey(key);

	if (state.mode === "loading") {
		if (normalizedKey === "q" || normalizedKey === "esc") {
			return { type: "back" };
		}
		return { type: "none" };
	}

	if (state.mode === "done") {
		if (normalizedKey === "c") {
			return { type: "copy" };
		}
		if (normalizedKey === "s") {
			return { type: "save" };
		}
		if (normalizedKey === "q" || normalizedKey === "esc") {
			return { type: "back" };
		}
		return { type: "none" };
	}

	if (normalizedKey === "r") {
		return { type: "retry" };
	}
	if (normalizedKey === "d") {
		return { type: "toggle-details" };
	}
	if (normalizedKey === "k") {
		return { type: "open-setup" };
	}
	if (normalizedKey === "q" || normalizedKey === "esc") {
		return { type: "back" };
	}

	return { type: "none" };
}
