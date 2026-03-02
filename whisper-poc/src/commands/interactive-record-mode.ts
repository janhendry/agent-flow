import type { RecordingMode } from "../types.js";

export type RecordModePreflightDecision =
	| { type: "start-recording" }
	| { type: "open-setup" };

export function resolveRecordModePreflightDecision(
	mode: RecordingMode,
	hasSystemDevice: boolean,
): RecordModePreflightDecision {
	if ((mode === "system" || mode === "both") && !hasSystemDevice) {
		return { type: "open-setup" };
	}
	return { type: "start-recording" };
}
