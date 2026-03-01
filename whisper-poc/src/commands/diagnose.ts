import { createCliSecretStore } from "../adapters/cli/secret-store.adapter.js";
import os from "node:os";
import path from "node:path";
import {
	type CliErrorCode,
	emitCliErrorAndExit,
} from "../utils/cli-error-contract.js";
import { checkFfmpeg } from "../utils/audio.js";
import { configExists, loadConfig } from "../utils/config.js";
import { type Config, type RecordingMode } from "../types.js";

interface DiagnoseCheck {
	status: "ok" | "warning";
	message: string;
}

interface ConfigDiagnosticDetails {
	mode: RecordingMode;
	micIndex: number;
	micName: string;
	outputDir: string;
	usesDefaults: boolean;
	hadLegacyApiKeyInConfig: boolean;
}

export interface DiagnoseReport {
	command: "diagnose";
	status: "ok" | "warning";
	checks: {
		ffmpeg: DiagnoseCheck;
		apiKey: DiagnoseCheck;
		config: DiagnoseCheck & { details: ConfigDiagnosticDetails };
	};
	warnings: string[];
	timestamp: string;
}

interface DiagnoseDependencies {
	checkFfmpegFn: () => Promise<boolean>;
	configExistsFn: () => boolean;
	loadConfigFn: () => Config;
	getApiKeyFn: () => string | undefined;
}

const DEFAULT_OUTPUT_DIR = path.join(
	os.homedir(),
	"Desktop",
	"whisper-recordings",
);

function resolveConfigDetails(
	config: Config | null,
): {
	check: DiagnoseCheck;
	details: ConfigDiagnosticDetails;
	warning?: string;
} {
	const resolvedMode: RecordingMode =
		config?.mode === "mic" || config?.mode === "system" || config?.mode === "both"
			? config.mode
			: "mic";
	const resolvedMicIndex = Number.isInteger(config?.micIndex)
		? (config?.micIndex as number)
		: 0;
	const resolvedMicName = config?.micName?.trim() || "Standard";
	const resolvedOutputDir = config?.outputDir?.trim() || DEFAULT_OUTPUT_DIR;
	const hasLegacyApiKey = Boolean(config?.apiKey?.trim());

	const usesDefaults =
		!config ||
		config?.mode !== resolvedMode ||
		config?.micIndex !== resolvedMicIndex ||
		config?.micName !== resolvedMicName ||
		config?.outputDir !== resolvedOutputDir;

	if (usesDefaults || hasLegacyApiKey) {
		const warningParts: string[] = [];
		if (usesDefaults) {
			warningParts.push(
				"Konfiguration ist unvollständig oder inkonsistent; deterministische Defaults greifen",
			);
		}
		if (hasLegacyApiKey) {
			warningParts.push(
				"Legacy-API-Key in config.json erkannt; Secret-Store-Migration erforderlich",
			);
		}

		return {
			check: {
				status: "warning",
				message: warningParts.join("; "),
			},
			details: {
				mode: resolvedMode,
				micIndex: resolvedMicIndex,
				micName: resolvedMicName,
				outputDir: resolvedOutputDir,
				usesDefaults,
				hadLegacyApiKeyInConfig: hasLegacyApiKey,
			},
			warning: warningParts.join("; "),
		};
	}

	return {
		check: {
			status: "ok",
			message: "Konfiguration ist konsistent",
		},
		details: {
			mode: resolvedMode,
			micIndex: resolvedMicIndex,
			micName: resolvedMicName,
			outputDir: resolvedOutputDir,
			usesDefaults,
			hadLegacyApiKeyInConfig: hasLegacyApiKey,
		},
	};
}

function emitDiagnoseError(code: CliErrorCode, message: string): never {
	emitCliErrorAndExit("diagnose", code, message);
}

export async function buildDiagnoseReport(
	env: NodeJS.ProcessEnv = process.env,
	deps?: Partial<DiagnoseDependencies>,
): Promise<DiagnoseReport> {
	const warnings: string[] = [];
	const resolvedDeps: DiagnoseDependencies = {
		checkFfmpegFn: deps?.checkFfmpegFn ?? checkFfmpeg,
		configExistsFn: deps?.configExistsFn ?? configExists,
		loadConfigFn: deps?.loadConfigFn ?? loadConfig,
		getApiKeyFn:
			deps?.getApiKeyFn ??
			(() => {
				const secretStore = createCliSecretStore();
				return secretStore.getApiKey();
			}),
	};

	const ffmpegAvailable = await resolvedDeps.checkFfmpegFn();
	const ffmpegCheck: DiagnoseCheck = ffmpegAvailable
		? {
			status: "ok",
			message: "ffmpeg verfügbar",
		}
		: {
			status: "warning",
			message: "ffmpeg nicht gefunden",
		};
	if (!ffmpegAvailable) {
		warnings.push(ffmpegCheck.message);
	}

	let config: Config | null = null;
	if (resolvedDeps.configExistsFn()) {
		try {
			config = resolvedDeps.loadConfigFn();
		} catch (err) {
			emitDiagnoseError(
				"diagnose-runtime",
				`Konfiguration konnte nicht gelesen werden. Prüfe Dateiinhalt und Rechte: ${(err as Error).message}`,
			);
		}
	}
	const configResult = resolveConfigDetails(config);
	if (configResult.warning) {
		warnings.push(configResult.warning);
	}

	let secretStoreApiKey: string | undefined;
	try {
		secretStoreApiKey = resolvedDeps.getApiKeyFn();
	} catch (err) {
		emitDiagnoseError("diagnose-runtime", (err as Error).message);
	}

	const hasApiKey = Boolean(secretStoreApiKey ?? env["OPENAI_API_KEY"]?.trim());
	const apiKeyCheck: DiagnoseCheck = hasApiKey
		? {
			status: "ok",
			message: "API-Key verfügbar",
		}
		: {
			status: "warning",
			message: "Kein API-Key gefunden (Secret-Store oder OPENAI_API_KEY)",
		};
	if (!hasApiKey) {
		warnings.push(apiKeyCheck.message);
	}

	const status: "ok" | "warning" = warnings.length > 0 ? "warning" : "ok";

	return {
		command: "diagnose",
		status,
		checks: {
			ffmpeg: ffmpegCheck,
			apiKey: apiKeyCheck,
			config: {
				...configResult.check,
				details: configResult.details,
			},
		},
		warnings,
		timestamp: new Date().toISOString(),
	};
}

export async function diagnoseCommand(): Promise<void> {
	const report = await buildDiagnoseReport();
	process.stdout.write(`${JSON.stringify(report)}\n`);
}
