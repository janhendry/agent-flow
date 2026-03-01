import fs from "fs";
import os from "os";
import path from "path";
import { SecretStorePort } from "../../core/ports/secret-store.port.js";
import { configExists, loadConfig } from "../../utils/config.js";

interface SecretPayload {
	apiKey?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".whisper-poc");
const SECRET_FILE = path.join(CONFIG_DIR, "secrets.json");

function loadSecrets(): SecretPayload {
	if (!fs.existsSync(SECRET_FILE)) {
		return {};
	}
	try {
		const raw = fs.readFileSync(SECRET_FILE, "utf-8");
		return JSON.parse(raw) as SecretPayload;
	} catch {
		return {};
	}
}

function saveSecrets(payload: SecretPayload): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	const tempFile = `${SECRET_FILE}.tmp`;
	fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf-8");
	if (process.platform !== "win32") {
		try {
			fs.chmodSync(tempFile, 0o600);
		} catch {
			// noop
		}
	}
	fs.renameSync(tempFile, SECRET_FILE);
}

class CliSecretStoreAdapter implements SecretStorePort {
	getApiKey(): string | undefined {
		const fromSecretFile = loadSecrets().apiKey?.trim();
		if (fromSecretFile) {
			return fromSecretFile;
		}
		if (!configExists()) {
			return undefined;
		}
		return loadConfig().apiKey?.trim() || undefined;
	}

	setApiKey(apiKey: string): void {
		saveSecrets({ apiKey: apiKey.trim() });
	}

	clearApiKey(): void {
		saveSecrets({});
	}

	providerName(): string {
		return "cli-file-secret-store";
	}
}

export function createCliSecretStore(): SecretStorePort {
	return new CliSecretStoreAdapter();
}
