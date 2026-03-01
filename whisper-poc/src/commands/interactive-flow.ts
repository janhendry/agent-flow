export interface RecordingResult {
	success: boolean;
	rawFile: string;
	durationSec: number;
	error?: string;
}

export interface SummaryScreenState {
	id: "summary";
	filePath: string;
	durationSec: number;
	error?: string;
}

export interface TranscriptScreenState {
	id: "transcript";
	filePath: string;
	origin: "record-flow" | "filepick";
}

export function resolvePostRecordingScreen(
	result: RecordingResult,
): SummaryScreenState | TranscriptScreenState {
	if (!result.success) {
		return {
			id: "summary",
			filePath: result.rawFile,
			durationSec: result.durationSec,
			error: result.error,
		};
	}

	return {
		id: "transcript",
		filePath: result.rawFile,
		origin: "record-flow",
	};
}
