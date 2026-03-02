export type RecordingMode = "mic" | "system" | "both";

export interface AudioDevice {
	index: number;
	name: string;
}

export interface Config {
	mode: RecordingMode;
	micIndex: number;
	micName: string;
	systemIndex?: number;
	systemName?: string;
	outputDir: string;
	apiKey?: string;
	baseUrl?: string;
	llmEnabled?: boolean;
	glossaryText?: string;
	llmModel?: string;
}
