export interface ActionableTranscribeErrorHint {
	message: string;
	action: string;
}

function includesAny(source: string, patterns: string[]): boolean {
	return patterns.some((pattern) => source.includes(pattern));
}

export function toActionableTranscribeErrorHint(
	rawMessage: string,
): ActionableTranscribeErrorHint {
	const lower = rawMessage.toLowerCase();

	if (
		includesAny(lower, [
			"kein openai api-key",
			"openai_api_key",
			"invalid api key",
			"incorrect api key",
			"401",
			"403",
		])
	) {
		return {
			message: "API-Key fehlt oder ist ungültig.",
			action: "Drücke [k] für Setup und prüfe API-Key/Base URL.",
		};
	}

	if (includesAny(lower, ["429", "rate limit", "quota", "insufficient_quota"])) {
		return {
			message: "API-Limit erreicht oder Anfrage gedrosselt.",
			action: "Warte kurz und versuche es mit [r] erneut.",
		};
	}

	if (
		includesAny(lower, [
			"timeout",
			"timed out",
			"etimedout",
			"econnreset",
			"enotfound",
			"network",
			"socket hang up",
		])
	) {
		return {
			message: "Netzwerkproblem bei der Transkription.",
			action: "Prüfe Internet/Proxy und versuche es mit [r] erneut.",
		};
	}

	if (includesAny(lower, ["ffmpeg", "webm/opus", "konvertierung"])) {
		return {
			message: "Audio-Konvertierung ist fehlgeschlagen.",
			action: "Prüfe ffmpeg/Dateiformat und starte mit [r] neu.",
		};
	}

	if (includesAny(lower, ["datei nicht gefunden", "enoent"])) {
		return {
			message: "Die Eingabedatei wurde nicht gefunden.",
			action: "Wähle die Datei erneut oder starte eine neue Aufnahme.",
		};
	}

	if (includesAny(lower, ["konnte nicht gespeichert", "eacces", "eperm", "enospc"])) {
		return {
			message: "Transkript konnte nicht gespeichert werden.",
			action: "Prüfe Schreibrechte/Festplattenspeicher und versuche es erneut.",
		};
	}

	return {
		message: "Transkription ist fehlgeschlagen.",
		action: "Nutze [r] für Retry oder [k] für Setup/Diagnose.",
	};
}
