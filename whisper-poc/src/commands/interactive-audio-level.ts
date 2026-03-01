function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function detectDbLevel(text: string): number | undefined {
	const patterns = [
		/RMS\s+level\s+dB\s*:\s*(-?\d+(?:\.\d+)?)/i,
		/lavfi\.astats\.Overall\.RMS_level\s*=\s*(-?\d+(?:\.\d+)?)/i,
		/mean_volume\s*:\s*(-?\d+(?:\.\d+)?)\s*dB/i,
		/max_volume\s*:\s*(-?\d+(?:\.\d+)?)\s*dB/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (!match) {
			continue;
		}
		const db = Number.parseFloat(match[1]);
		if (!Number.isNaN(db) && Number.isFinite(db)) {
			const normalized = (db + 60) / 60;
			return clamp(normalized, 0, 1);
		}
	}

	return undefined;
}

export function deriveAudioLevelFromFfmpegOutput(
	text: string,
	previousLevel = 0,
): number {
	const fromDb = detectDbLevel(text);
	if (fromDb !== undefined) {
		return clamp(Math.max(previousLevel * 0.55, fromDb), 0, 1);
	}

	// Kein valider Pegel im ffmpeg-Output erkannt: nur sanfter Decay, kein künstlicher Anstieg.
	return clamp(previousLevel * 0.9, 0, 1);
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
