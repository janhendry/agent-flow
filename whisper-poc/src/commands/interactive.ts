import { AppExitReason, startApp } from "../app.js";
import {
	type CliErrorCode,
	resolveCliExitCode,
} from "../utils/cli-error-contract.js";
import { checkFfmpeg, getPlatformInfo } from "../utils/audio.js";
import { setupCommand } from "./setup.js";

interface InteractiveDependencies {
	startApp: () => Promise<AppExitReason>;
	setupCommand: () => Promise<void>;
	ensureRuntimeReady: () => Promise<void>;
}

const defaultDependencies: InteractiveDependencies = {
	startApp,
	setupCommand,
	ensureRuntimeReady: async () => {
		const hasFfmpeg = await checkFfmpeg();
		if (!hasFfmpeg) {
			throw new InteractiveCommandError(
				"ffmpeg-missing",
				`ffmpeg nicht gefunden. Installiere: ${getPlatformInfo().installHint}`,
			);
		}
	},
};

export class InteractiveCommandError extends Error {
	readonly code: CliErrorCode;

	constructor(code: CliErrorCode, message: string) {
		super(message);
		this.name = "InteractiveCommandError";
		this.code = code;
	}
}

export async function interactiveCommand(
	dependencies: Partial<InteractiveDependencies> = defaultDependencies,
	maxSetupRedirects = 10,
): Promise<void> {
	const runtime = dependencies.ensureRuntimeReady ?? (async () => { });
	const runStartApp = dependencies.startApp ?? defaultDependencies.startApp;
	const runSetup = dependencies.setupCommand ?? defaultDependencies.setupCommand;

	await runtime();

	let setupRedirectCount = 0;
	while (true) {
		const result = await runStartApp();
		if (result === "open-setup") {
			setupRedirectCount += 1;
			if (setupRedirectCount > maxSetupRedirects) {
				throw new InteractiveCommandError(
					"setup-runtime",
					"Zu viele Setup-Weiterleitungen im Interactive-Modus. Abbruch zum Schutz vor Endlosschleife.",
				);
			}
			await runSetup();
			continue;
		}
		break;
	}
}
