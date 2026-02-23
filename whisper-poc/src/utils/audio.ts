import { ChildProcess, exec, spawn } from "child_process";
import { promisify } from "util";
import { AudioDevice, RecordingMode } from "../types.js";

const execAsync = promisify(exec);

const IS_WINDOWS = process.platform === "win32";
const IS_MAC = process.platform === "darwin";

// ── Geräteliste ────────────────────────────────────────────────────────────

/**
 * Listet Audio-Eingabegeräte plattformabhängig auf.
 * macOS:   avfoundation (Index-basiert)
 * Windows: dshow (Name-basiert)
 */
export async function listAudioDevices(): Promise<AudioDevice[]> {
	return IS_WINDOWS ? listAudioDevicesWindows() : listAudioDevicesMac();
}

function listAudioDevicesMac(): Promise<AudioDevice[]> {
	return new Promise((resolve) => {
		exec(
			'ffmpeg -f avfoundation -list_devices true -i "" 2>&1',
			(_, stdout, stderr) => {
				const output = stdout + stderr;
				const devices: AudioDevice[] = [];
				const audioSection =
					output.split("AVFoundation audio devices")[1] || "";
				for (const line of audioSection.split("\n")) {
					const match = line.match(/\[(\d+)\]\s+(.+)/);
					if (match) {
						devices.push({
							index: parseInt(match[1], 10),
							name: match[2].trim(),
						});
					}
				}
				resolve(devices);
			},
		);
	});
}

function listAudioDevicesWindows(): Promise<AudioDevice[]> {
	return new Promise((resolve) => {
		exec(
			"ffmpeg -list_devices true -f dshow -i dummy 2>&1",
			(_, stdout, stderr) => {
				const output = stdout + stderr;
				const devices: AudioDevice[] = [];
				// Robust gegen ffmpeg-Ausgaben mit/ohne Abschnittsüberschriften
				let index = 0;
				for (const line of output.split("\n")) {
					const match = line.match(/"([^"]+)"\s+\(audio\)/i);
					if (match) {
						devices.push({ index: index++, name: match[1].trim() });
					}
				}
				resolve(devices);
			},
		);
	});
}

// ── System-Audio-Erkennung ─────────────────────────────────────────────────

/**
 * Sucht das virtuelle System-Audio-Gerät:
 * macOS:   BlackHole
 * Windows: VB-Cable ("CABLE Output"), Stereo Mix, Voicemeeter
 */
export function findSystemAudioDevice(
	devices: AudioDevice[],
): AudioDevice | undefined {
	const keywords = IS_WINDOWS
		? [
			"cable output",
			"stereo mix",
			"voicemeeter",
			"vb-audio",
			"wave out mix",
			"what u hear",
		]
		: ["blackhole"];

	for (const keyword of keywords) {
		const matchedDevice = devices.find((device) =>
			device.name.toLowerCase().includes(keyword),
		);
		if (matchedDevice) return matchedDevice;
	}

	return undefined;
}

/** @deprecated Verwende findSystemAudioDevice */
export const findBlackHoleDevice = findSystemAudioDevice;

// ── ffmpeg-Argumente ───────────────────────────────────────────────────────

function deviceInput(device: AudioDevice): string {
	return IS_WINDOWS ? `audio=${device.name}` : `:${device.index}`;
}

function audioFormat(): string {
	if (IS_MAC) return "avfoundation";
	if (IS_WINDOWS) return "dshow";
	return "alsa";
}

function systemAudioError(): string {
	if (IS_MAC) {
		return (
			"System-Audio-Gerät nicht gefunden.\n" +
			"  → BlackHole 2ch installieren: https://existential.audio/blackhole/\n" +
			"  → macOS Systemeinstellungen → Ton → BlackHole als Ausgabe setzen"
		);
	}
	return (
		"System-Audio-Gerät nicht gefunden.\n" +
		"  → VB-Cable installieren: https://vb-audio.com/Cable/\n" +
		"     ODER Windows-Einstellungen → Sound → Aufnahme →\n" +
		'     Rechtsklick → "Deaktivierte Geräte anzeigen" → Stereo Mix aktivieren'
	);
}

/**
 * Baut die ffmpeg-Argumente für die gewählte Aufnahme-Konfiguration (plattformübergreifend).
 *
 *  mic:    nur Mikrofon
 *  system: nur System-Audio (BlackHole / VB-Cable / Stereo Mix)
 *  both:   Mikrofon + System-Audio gemischt
 */
export function buildFfmpegArgs(
	mode: RecordingMode,
	micDevice: AudioDevice,
	systemDevice: AudioDevice | undefined,
	outputFile: string,
): string[] {
	const fmt = audioFormat();
	const commonOut = ["-y", "-ar", "44100", "-ac", "2", outputFile];

	if (mode === "mic") {
		return ["-f", fmt, "-i", deviceInput(micDevice), ...commonOut];
	}

	if (mode === "system") {
		if (!systemDevice) throw new Error(systemAudioError());
		if (IS_MAC) {
			// BlackHole kann 64ch liefern → explizit auf Stereo via pan
			return [
				"-f",
				fmt,
				"-i",
				deviceInput(systemDevice),
				"-filter_complex",
				"[0:a]aresample=44100,pan=stereo|c0=c0|c1=c1[out]",
				"-map",
				"[out]",
				...commonOut,
			];
		}
		return ["-f", fmt, "-i", deviceInput(systemDevice), ...commonOut];
	}

	// both
	if (!systemDevice) throw new Error(systemAudioError());

	if (IS_MAC) {
		// BlackHole 64ch → Stereo; Mono-Mic auf beide Kanäle duplizieren
		return [
			"-f",
			fmt,
			"-i",
			deviceInput(micDevice),
			"-f",
			fmt,
			"-i",
			deviceInput(systemDevice),
			"-filter_complex",
			"[0:a]aresample=44100,pan=stereo|c0=c0|c1=c0[mic];" +
			"[1:a]aresample=44100,pan=stereo|c0=c0|c1=c1[sys];" +
			"[mic][sys]amix=inputs=2:duration=first:dropout_transition=3[out]",
			"-map",
			"[out]",
			...commonOut,
		];
	}

	// Windows: dshow liefert korrekte Kanalzahl, direkt mixen
	return [
		"-f",
		fmt,
		"-i",
		deviceInput(micDevice),
		"-f",
		fmt,
		"-i",
		deviceInput(systemDevice),
		"-filter_complex",
		"amix=inputs=2:duration=first:dropout_transition=3",
		...commonOut,
	];
}

// ── Recording-Prozess ──────────────────────────────────────────────────────

export function startRecording(ffmpegArgs: string[]): ChildProcess {
	return spawn("ffmpeg", ffmpegArgs, { stdio: ["pipe", "pipe", "pipe"] });
}

export async function checkFfmpeg(): Promise<boolean> {
	try {
		await execAsync("ffmpeg -version");
		return true;
	} catch {
		return false;
	}
}

// ── Plattform-Info ─────────────────────────────────────────────────────────

export function getPlatformInfo(): { name: string; installHint: string } {
	if (IS_MAC)
		return { name: "macOS (avfoundation)", installHint: "brew install ffmpeg" };
	if (IS_WINDOWS)
		return {
			name: "Windows (dshow)",
			installHint:
				"winget install Gyan.FFmpeg  oder  https://ffmpeg.org/download.html",
		};
	return { name: "Linux (alsa)", installHint: "sudo apt install ffmpeg" };
}

// ── Wiedergabe ─────────────────────────────────────────────────────────────

/**
 * Spielt eine Audiodatei ab (plattformabhängig).
 * Gibt den Prozess zurück – kill() stoppt die Wiedergabe.
 */
export function playAudio(filePath: string): ChildProcess {
	if (IS_MAC) {
		return spawn("afplay", [filePath], { stdio: "inherit" });
	}
	if (IS_WINDOWS) {
		return spawn("cmd", ["/c", "start", "", "/wait", filePath], {
			stdio: "inherit",
		});
	}
	// Linux
	return spawn("aplay", [filePath], { stdio: "inherit" });
}
