import type { RecordingMode } from "@whisper-poc/types";

export const SETTINGS_TABS = [
	"General",
	"Shortcuts",
	"Profile",
	"System Prompts",
	"Glossare",
	"API Key",
	"Audio",
	"Display",
	"About",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export type ThemeMode = "system" | "light" | "dark";

export type OverlayPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export interface ShortcutBindings {
	recordingToggle: string;
	profileOverlayToggle: string;
	historyOverlayToggle: string;
}

export interface ProfileSettings {
	id: string;
	name: string;
	recordingMode: RecordingMode;
	whisperModel: string;
	glossaryId?: string;
	llmEnabled: boolean;
	llmModel?: string;
	systemPromptId?: string;
}

export interface PromptTemplate {
	id: string;
	name: string;
	text: string;
}

export interface GlossaryItem {
	id: string;
	name: string;
	text: string;
}

export interface AudioSettings {
	mode: RecordingMode;
	micDeviceIndex: number;
	systemDeviceIndex?: number;
	autoStopSeconds: number;
}

export interface DisplaySettings {
	theme: ThemeMode;
	hudOverlayPosition: OverlayPosition;
	historyOverlayPosition: OverlayPosition;
	transcriptOverlayPosition: OverlayPosition;
	windowScale: number;
}

export interface GeneralSettings {
	language: "de" | "en";
	returnTarget: "clipboard" | "stdout";
	launchOnBoot: boolean;
}

export interface ApiSettings {
	baseUrl?: string;
	hasApiKey: boolean;
}

export interface AppSettings {
	general: GeneralSettings;
	shortcuts: ShortcutBindings;
	profiles: ProfileSettings[];
	activeProfileId: string;
	systemPrompts: PromptTemplate[];
	glossaries: GlossaryItem[];
	audio: AudioSettings;
	display: DisplaySettings;
	api: ApiSettings;
}

export interface ValidationIssue {
	path: string;
	message: string;
}

export interface SettingsValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
}

export function createDefaultSettings(): AppSettings {
	const promptId = "prompt-default";
	const glossaryId = "glossary-default";
	const profileId = "profile-default";
	return {
		general: {
			language: "de",
			returnTarget: "clipboard",
			launchOnBoot: false,
		},
		shortcuts: {
			recordingToggle: "CommandOrControl+Shift+Space",
			profileOverlayToggle: "CommandOrControl+Shift+P",
			historyOverlayToggle: "CommandOrControl+Shift+H",
		},
		profiles: [
			{
				id: profileId,
				name: "Standard",
				recordingMode: "mic",
				whisperModel: "whisper-1",
				glossaryId,
				llmEnabled: false,
				llmModel: "gpt-4o-mini",
				systemPromptId: promptId,
			},
		],
		activeProfileId: profileId,
		systemPrompts: [
			{
				id: promptId,
				name: "Standard Prompt",
				text: "Korrigiere nur Rechtschreibung und Interpunktion, ohne Bedeutung zu aendern.",
			},
		],
		glossaries: [
			{
				id: glossaryId,
				name: "Standard Glossar",
				text: "",
			},
		],
		audio: {
			mode: "mic",
			micDeviceIndex: 0,
			autoStopSeconds: 60,
		},
		display: {
			theme: "system",
			hudOverlayPosition: "top-center",
			historyOverlayPosition: "bottom-right",
			transcriptOverlayPosition: "bottom-center",
			windowScale: 1,
		},
		api: {
			baseUrl: undefined,
			hasApiKey: false,
		},
	};
}

function normalizeShortcut(value: string): string {
	return value
		.split("+")
		.map((part) => part.trim())
		.filter(Boolean)
		.join("+");
}

export function validateSettings(settings: AppSettings): SettingsValidationResult {
	const issues: ValidationIssue[] = [];

	if (settings.profiles.length === 0) {
		issues.push({
			path: "profiles",
			message: "Mindestens ein Profil ist erforderlich.",
		});
	}

	if (!settings.profiles.some((profile) => profile.id === settings.activeProfileId)) {
		issues.push({
			path: "activeProfileId",
			message: "Aktives Profil muss in der Profil-Liste vorhanden sein.",
		});
	}

	for (const [key, value] of Object.entries(settings.shortcuts)) {
		const normalized = normalizeShortcut(value);
		if (normalized.length < 3) {
			issues.push({
				path: `shortcuts.${key}`,
				message: "Shortcut ist ungueltig oder zu kurz.",
			});
		}
	}

	const shortcutValues = Object.entries(settings.shortcuts).map(([key, value]) => ({
		key,
		value: normalizeShortcut(value).toLowerCase(),
	}));
	const seen = new Map<string, string>();
	for (const item of shortcutValues) {
		const existing = seen.get(item.value);
		if (existing) {
			issues.push({
				path: `shortcuts.${item.key}`,
				message: `Shortcut-Konflikt mit ${existing}.`,
			});
		} else {
			seen.set(item.value, item.key);
		}
	}

	if (settings.audio.autoStopSeconds < 5 || settings.audio.autoStopSeconds > 60) {
		issues.push({
			path: "audio.autoStopSeconds",
			message: "Auto-Stop muss zwischen 5 und 60 Sekunden liegen.",
		});
	}

	if (settings.display.windowScale < 0.8 || settings.display.windowScale > 1.5) {
		issues.push({
			path: "display.windowScale",
			message: "Fensterskalierung muss zwischen 0.8 und 1.5 liegen.",
		});
	}

	for (const profile of settings.profiles) {
		if (!profile.name.trim()) {
			issues.push({
				path: `profiles.${profile.id}.name`,
				message: "Profilname darf nicht leer sein.",
			});
		}
		if (!profile.whisperModel.trim()) {
			issues.push({
				path: `profiles.${profile.id}.whisperModel`,
				message: "Whisper-Modell darf nicht leer sein.",
			});
		}
	}

	for (const prompt of settings.systemPrompts) {
		if (!prompt.name.trim()) {
			issues.push({
				path: `systemPrompts.${prompt.id}.name`,
				message: "Prompt-Name darf nicht leer sein.",
			});
		}
		if (!prompt.text.trim()) {
			issues.push({
				path: `systemPrompts.${prompt.id}.text`,
				message: "Prompt-Text darf nicht leer sein.",
			});
		}
	}

	for (const glossary of settings.glossaries) {
		if (!glossary.name.trim()) {
			issues.push({
				path: `glossaries.${glossary.id}.name`,
				message: "Glossar-Name darf nicht leer sein.",
			});
		}
	}

	return {
		valid: issues.length === 0,
		issues,
	};
}
