export type CliErrorClass = "validation" | "api" | "runtime";

export type CliErrorCode =
	| "invalid-options"
	| "file-not-found"
	| "mic-device-missing"
	| "system-device-missing"
	| "system-audio-missing"
	| "ffmpeg-args"
	| "missing-api-key"
	| "transcription-failed"
	| "runtime-transcription-failed"
	| "ffmpeg-missing"
	| "ffmpeg-record"
	| "recording-failed"
	| "clipboard-failed"
	| "setup-runtime"
	| "diagnose-runtime";

export const CLI_EXIT_CODES: Record<CliErrorClass, number> = {
	validation: 2,
	api: 10,
	runtime: 20,
};

const VALIDATION_ERROR_CODES: ReadonlySet<CliErrorCode> = new Set([
	"invalid-options",
	"file-not-found",
	"mic-device-missing",
	"system-device-missing",
	"system-audio-missing",
	"ffmpeg-args",
]);

const API_ERROR_CODES: ReadonlySet<CliErrorCode> = new Set([
	"missing-api-key",
	"transcription-failed",
]);

export function classifyCliErrorCode(code: CliErrorCode): CliErrorClass {
	if (VALIDATION_ERROR_CODES.has(code)) {
		return "validation";
	}

	if (API_ERROR_CODES.has(code)) {
		return "api";
	}

	return "runtime";
}

export function resolveCliExitCode(code: CliErrorCode): number {
	return CLI_EXIT_CODES[classifyCliErrorCode(code)];
}

export interface CliErrorEvent {
	command: string;
	status: "error";
	code: CliErrorCode;
	errorClass: CliErrorClass;
	message: string;
}

export function buildCliErrorEvent(
	command: string,
	code: CliErrorCode,
	message: string,
): CliErrorEvent {
	return {
		command,
		status: "error",
		code,
		errorClass: classifyCliErrorCode(code),
		message,
	};
}

export function emitCliErrorAndExit(
	command: string,
	code: CliErrorCode,
	message: string,
): never {
	const event = buildCliErrorEvent(command, code, message);
	console.error(JSON.stringify(event));
	process.exit(resolveCliExitCode(code));
}
