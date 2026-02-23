import fs from "fs";
import os from "os";
import path from "path";
import { Config } from "../types.js";

const CONFIG_DIR = path.join(os.homedir(), ".whisper-poc");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function configExists(): boolean {
	return fs.existsSync(CONFIG_FILE);
}

export function loadConfig(): Config {
	if (!configExists()) {
		throw new Error(
			"Keine Konfiguration gefunden. Bitte zuerst `whisper-poc setup` ausführen.",
		);
	}
	const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
	return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
	return CONFIG_FILE;
}
