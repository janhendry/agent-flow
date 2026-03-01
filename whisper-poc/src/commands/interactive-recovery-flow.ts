export type TranscriptOrigin = "record-flow" | "filepick";

export type ConfigReturnTarget =
	| { id: "menu" }
	| { id: "transcript"; filePath: string; origin: TranscriptOrigin };

export interface SetupTransition {
	nextScreen: { id: "config" };
	configReturnTarget: Extract<ConfigReturnTarget, { id: "transcript" }>;
}

export function buildSetupTransitionFromTranscript(input: {
	filePath: string;
	origin: TranscriptOrigin;
}): SetupTransition {
	return {
		nextScreen: { id: "config" },
		configReturnTarget: {
			id: "transcript",
			filePath: input.filePath,
			origin: input.origin,
		},
	};
}

export function completeConfigRecovery(
	currentReturnTarget: ConfigReturnTarget,
): {
	nextScreen: ConfigReturnTarget;
	resetReturnTarget: { id: "menu" };
} {
	return {
		nextScreen: currentReturnTarget,
		resetReturnTarget: { id: "menu" },
	};
}
