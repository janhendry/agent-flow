import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SecretStorePort } from "../../core/ports/secret-store.port.js";
import { type Config, type RecordingMode } from "../../types.js";
import { configExists, loadConfig, saveConfig } from "../../utils/config.js";

interface SecretPayload {
	apiKey?: string;
}

interface ConfigAccessor {
	exists(): boolean;
	load(): Config;
	save(config: Config): void;
}

interface CliSecretStoreAdapterOptions {
	baseDir?: string;
	configAccessor?: ConfigAccessor;
}

const DEFAULT_OUTPUT_DIR = path.join(
	os.homedir(),
	"Desktop",
	"whisper-recordings",
);

function normalizeLegacyConfig(rawConfig: Config): Config {
	const normalizedMode: RecordingMode =
		rawConfig.mode === "mic" ||
			rawConfig.mode === "system" ||
			rawConfig.mode === "both"
			? rawConfig.mode
			: "mic";

	return {
		mode: normalizedMode,
		micIndex: Number.isInteger(rawConfig.micIndex) ? rawConfig.micIndex : 0,
		micName: rawConfig.micName?.trim() || "Standard",
		systemIndex: rawConfig.systemIndex,
		systemName: rawConfig.systemName,
		outputDir: rawConfig.outputDir?.trim() || DEFAULT_OUTPUT_DIR,
		baseUrl: rawConfig.baseUrl,
		apiKey: rawConfig.apiKey,
	};
}

function resolveConfigAccessor(
	override?: ConfigAccessor,
): ConfigAccessor {
	if (override) {
		return override;
	}

	return {
		exists: () => configExists(),
		load: () => loadConfig(),
		save: (config) => saveConfig(config),
	};
}

function loadSecrets(secretFile: string): SecretPayload {
	if (!fs.existsSync(secretFile)) {
		return {};
	}
	try {
		const raw = fs.readFileSync(secretFile, "utf-8");
		return JSON.parse(raw) as SecretPayload;
	} catch {
		return {};
	}
}

function saveSecrets(secretFile: string, payload: SecretPayload): void {
	const configDir = path.dirname(secretFile);
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}
	if (process.platform !== "win32") {
		try {
			fs.chmodSync(configDir, 0o700);
		} catch {
			// noop
		}
	}
	const tempFile = `${secretFile}.tmp`;
	fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf-8");
	if (process.platform !== "win32") {
		try {
			fs.chmodSync(tempFile, 0o600);
		} catch {
			// noop
		}
	}
	fs.renameSync(tempFile, secretFile);
	if (process.platform !== "win32") {
		try {
			fs.chmodSync(secretFile, 0o600);
		} catch {
			// noop
		}
	}
}

class CliSecretStoreAdapter implements SecretStorePort {
	private readonly secretFile: string;

	private readonly configAccessor: ConfigAccessor;

	constructor(options?: CliSecretStoreAdapterOptions) {
		const baseDir = options?.baseDir ?? path.join(os.homedir(), ".whisper-poc");
		this.secretFile = path.join(baseDir, "secrets.json");
		this.configAccessor = resolveConfigAccessor(options?.configAccessor);
	}

	private migrateLegacyApiKeyIfNeeded(): string | undefined {
		if (!this.configAccessor.exists()) {
			return undefined;
		}

		const loadedConfig = this.configAccessor.load();
		const legacyApiKey = loadedConfig.apiKey?.trim();
		if (!legacyApiKey) {
			return undefined;
		}

		saveSecrets(this.secretFile, { apiKey: legacyApiKey });
		const normalizedConfig = normalizeLegacyConfig(loadedConfig);
		normalizedConfig.apiKey = undefined;
		this.configAccessor.save(normalizedConfig);
		return legacyApiKey;
	}

	getApiKey(): string | undefined {
		const fromSecretFile = loadSecrets(this.secretFile).apiKey?.trim();
		if (fromSecretFile) {
			return fromSecretFile;
		}

		try {
			return this.migrateLegacyApiKeyIfNeeded();
		} catch (err) {
			throw new Error(
				`Secret-Store-Lesezugriff fehlgeschlagen. Prüfe Dateirechte und Konfiguration: ${(err as Error).message}`,
			);
		}
	}

	setApiKey(apiKey: string): void {
		try {
			saveSecrets(this.secretFile, { apiKey: apiKey.trim() });
		} catch (err) {
			throw new Error(
				`Secret-Store-Schreibzugriff fehlgeschlagen. Prüfe Dateirechte: ${(err as Error).message}`,
			);
		}
	}

	clearApiKey(): void {
		try {
			saveSecrets(this.secretFile, {});
		} catch (err) {
			throw new Error(
				`Secret-Store-Löschzugriff fehlgeschlagen. Prüfe Dateirechte: ${(err as Error).message}`,
			);
		}
	}

	providerName(): string {
		return "cli-file-secret-store";
	}
}

export function createCliSecretStore(
	options?: CliSecretStoreAdapterOptions,
): SecretStorePort {
	return new CliSecretStoreAdapter(options);
}
