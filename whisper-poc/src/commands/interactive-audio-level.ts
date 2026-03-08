function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function normalizeDb(db: number): number {
	return clamp((db + 60) / 60, 0, 1);
}

function smooth(previous: number, current: number): number {
	return clamp(Math.max(previous * 0.55, current), 0, 1);
}

// ── Single-Level Detection ─────────────────────────────────────────────

/** Findet den ersten RMS-dB-Wert in einem Text-Chunk. */
function detectDbLevel(text: string): number | undefined {
	const patterns = [
		/RMS\s+level\s+dB\s*:\s*(-?\d+(?:\.\d+)?)/i,
		/lavfi\.astats\.Overall\.RMS_level\s*=\s*(-?\d+(?:\.\d+)?)/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (!match) {
			continue;
		}
		const db = Number.parseFloat(match[1]);
		if (!Number.isNaN(db) && Number.isFinite(db)) {
			return normalizeDb(db);
		}
	}

	return undefined;
}

/**
 * Findet ALLE RMS-dB-Werte in einem Text-Chunk (für Dual-Meter im both-Modus).
 * Gibt normalisierte 0..1-Werte zurück, in der Reihenfolge ihres Auftretens.
 */
function detectAllDbLevels(text: string): number[] {
	const results: number[] = [];
	const pattern =
		/lavfi\.astats\.Overall\.RMS_level\s*=\s*(-?\d+(?:\.\d+)?)/gi;
	for (const match of text.matchAll(pattern)) {
		const db = Number.parseFloat(match[1]);
		if (!Number.isNaN(db) && Number.isFinite(db)) {
			results.push(normalizeDb(db));
		}
	}
	if (results.length === 0) {
		const fallback = /RMS\s+level\s+dB\s*:\s*(-?\d+(?:\.\d+)?)/gi;
		for (const match of text.matchAll(fallback)) {
			const db = Number.parseFloat(match[1]);
			if (!Number.isNaN(db) && Number.isFinite(db)) {
				results.push(normalizeDb(db));
			}
		}
	}
	return results;
}

// ── Single-Channel Derivation ──────────────────────────────────────────

/**
 * Leitet den Audio-Pegel aus ffmpeg-stderr ab (Single-Channel: mic oder system).
 * Kein Decay bei fehlendem Signal — der UI-Timer übernimmt den Decay.
 */
export function deriveAudioLevelFromFfmpegOutput(
	text: string,
	previousLevel = 0,
): number {
	const fromDb = detectDbLevel(text);
	if (fromDb !== undefined) {
		return smooth(previousLevel, fromDb);
	}
	// Kein Decay hier — der 100ms-Timer in der UI übernimmt das.
	return previousLevel;
}

// ── Dual-Level (both-Modus) ────────────────────────────────────────────

export interface DualAudioLevel {
	mic: number;
	sys: number;
}

/**
 * Erzeugt einen zustandsbehafteten Parser für zwei getrennte Audio-Pegel im both-Modus.
 *
 * ffmpeg gibt pro Zeitfenster (reset=1 → 1 s) zwei RMS-Werte auf stderr aus:
 * zuerst vom Mic-Branch [0:a], dann vom System-Branch [1:a]
 * (deterministische Filter-Graph-Reihenfolge).
 *
 * Der Toggle-Zähler ordnet gerade Werte dem Mic und ungerade dem System zu.
 */
export function createDualLevelParser(): {
	parse(text: string): DualAudioLevel;
	current(): DualAudioLevel;
} {
	let mic = 0;
	let sys = 0;
	let expectMic = true;

	return {
		parse(text: string): DualAudioLevel {
			const levels = detectAllDbLevels(text);
			for (const level of levels) {
				if (expectMic) {
					mic = smooth(mic, level);
				} else {
					sys = smooth(sys, level);
				}
				expectMic = !expectMic;
			}
			return { mic, sys };
		},
		current(): DualAudioLevel {
			return { mic, sys };
		},
	};
}

export function renderAudioLevelBars(level: number, width = 20): string {
	const normalized = clamp(level, 0, 1);
	const activeBars = Math.round(normalized * width);
	let bars = "";
	for (let index = 0; index < width; index += 1) {
		bars += index < activeBars ? "█" : "▁";
	}
	return bars;
}
