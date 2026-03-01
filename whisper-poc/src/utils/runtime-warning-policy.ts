export interface RuntimeWarningPolicyTarget {
	noDeprecation?: boolean;
}

export function shouldSuppressDeprecationWarnings(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return env["WHISPER_POC_ALLOW_NODE_DEPRECATIONS"] !== "1";
}

export function applyRuntimeWarningPolicy(
	target: RuntimeWarningPolicyTarget = process,
	env: NodeJS.ProcessEnv = process.env,
): void {
	target.noDeprecation = shouldSuppressDeprecationWarnings(env);
}
