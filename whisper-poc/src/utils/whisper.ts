import fs from "fs";
import OpenAI from "openai";

export async function transcribeFile(
	filePath: string,
	apiKey: string,
	language = "de",
	baseUrl?: string,
): Promise<string> {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Datei nicht gefunden: ${filePath}`);
	}

	const client = new OpenAI({
		apiKey,
		...(baseUrl ? { baseURL: baseUrl } : {}),
	});

	const transcription = await client.audio.transcriptions.create({
		file: fs.createReadStream(filePath),
		model: "whisper-1",
		language,
		response_format: "text",
	});

	return transcription as unknown as string;
}
