import { AppExitReason, startApp } from "../app.js";
import { setupCommand } from "./setup.js";

interface InteractiveDependencies {
	startApp: () => Promise<AppExitReason>;
	setupCommand: () => Promise<void>;
}

const defaultDependencies: InteractiveDependencies = {
	startApp,
	setupCommand,
};

export async function interactiveCommand(
	dependencies: InteractiveDependencies = defaultDependencies,
	maxSetupRedirects = 10,
): Promise<void> {
	let setupRedirectCount = 0;
	while (true) {
		const result = await dependencies.startApp();
		if (result === "open-setup") {
			setupRedirectCount += 1;
			if (setupRedirectCount > maxSetupRedirects) {
				throw new Error(
					"Zu viele Setup-Weiterleitungen im Interactive-Modus. Abbruch zum Schutz vor Endlosschleife.",
				);
			}
			await dependencies.setupCommand();
			continue;
		}
		break;
	}
}
