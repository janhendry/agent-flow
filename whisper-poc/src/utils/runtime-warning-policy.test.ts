import assert from "node:assert/strict";
import test from "node:test";
import {
	applyRuntimeWarningPolicy,
	shouldSuppressDeprecationWarnings,
} from "./runtime-warning-policy.js";

test("runtime warning policy: suppress deprecations standardmäßig", () => {
	assert.equal(shouldSuppressDeprecationWarnings({}), true);
});

test("runtime warning policy: Opt-out per Env-Flag", () => {
	assert.equal(
		shouldSuppressDeprecationWarnings({
			WHISPER_POC_ALLOW_NODE_DEPRECATIONS: "1",
		}),
		false,
	);
});

test("runtime warning policy: schreibt in target.noDeprecation", () => {
	const target = { noDeprecation: false };

	applyRuntimeWarningPolicy(target, {});

	assert.equal(target.noDeprecation, true);
});
