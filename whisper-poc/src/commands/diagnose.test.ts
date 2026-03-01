import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagnoseReport } from "./diagnose.js";

test("diagnose: report ist scriptbar und enthält erwartete Struktur", async () => {
	const report = await buildDiagnoseReport(
		{ OPENAI_API_KEY: "env-key" },
		{
			checkFfmpegFn: async () => true,
			configExistsFn: () => false,
			loadConfigFn: () => {
				throw new Error("not used");
			},
			getApiKeyFn: () => undefined,
		},
	);

	assert.equal(report.command, "diagnose");
	assert.equal(typeof report.timestamp, "string");
	assert.equal(typeof report.checks.ffmpeg.message, "string");
	assert.equal(typeof report.checks.apiKey.message, "string");
	assert.equal(typeof report.checks.config.details.outputDir, "string");
});

test("diagnose: warnt ohne API-Key deterministisch", async () => {
	const report = await buildDiagnoseReport(
		{ OPENAI_API_KEY: "" },
		{
			checkFfmpegFn: async () => true,
			configExistsFn: () => false,
			loadConfigFn: () => {
				throw new Error("not used");
			},
			getApiKeyFn: () => undefined,
		},
	);
	assert.equal(report.checks.apiKey.status, "warning");
	assert.equal(
		report.warnings.some((warning) => warning.includes("Kein API-Key gefunden")),
		true,
	);
});

test("diagnose: Secret-Inhalte erscheinen nicht im Warning-Text", async () => {
	const report = await buildDiagnoseReport(
		{ OPENAI_API_KEY: "super-secret-value" },
		{
			checkFfmpegFn: async () => true,
			configExistsFn: () => false,
			loadConfigFn: () => {
				throw new Error("not used");
			},
			getApiKeyFn: () => undefined,
		},
	);
	const serialized = JSON.stringify(report);
	assert.equal(serialized.includes("super-secret-value"), false);
});
