import OpenAI from "openai";

export interface InteractivePostProcessOptions {
	llmEnabled: boolean;
	glossaryText: string;
	apiKey: string | undefined;
	baseUrl: string | undefined;
}

export interface InteractivePostProcessResult {
	text: string;
	usedLlm: boolean;
	warnings: string[];
}

interface GlossaryRule {
	from: string;
	to: string;
}

function parseGlossaryRules(glossaryText: string): GlossaryRule[] {
	return glossaryText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"))
		.map((line) => {
			const arrowSplit = line.split("=>");
			if (arrowSplit.length === 2) {
				return {
					from: arrowSplit[0]?.trim() ?? "",
					to: arrowSplit[1]?.trim() ?? "",
				};
			}

			const equalSplit = line.split("=");
			if (equalSplit.length === 2) {
				return {
					from: equalSplit[0]?.trim() ?? "",
					to: equalSplit[1]?.trim() ?? "",
				};
			}

			return {
				from: "",
				to: "",
			};
		})
		.filter((rule) => rule.from.length > 0 && rule.to.length > 0);
}

function applyGlossaryRules(input: string, rules: ReadonlyArray<GlossaryRule>): string {
	let output = input;
	for (const rule of rules) {
		output = output.replaceAll(rule.from, rule.to);
	}
	return output;
}

export async function applyInteractivePostProcessing(
	transcript: string,
	options: InteractivePostProcessOptions,
): Promise<InteractivePostProcessResult> {
	const glossaryRules = parseGlossaryRules(options.glossaryText);
	const glossaryAppliedText = applyGlossaryRules(transcript, glossaryRules);

	if (!options.llmEnabled) {
		return {
			text: glossaryAppliedText,
			usedLlm: false,
			warnings: [],
		};
	}

	if (!options.apiKey) {
		return {
			text: glossaryAppliedText,
			usedLlm: false,
			warnings: [
				"LLM-Post-Processing übersprungen: kein API-Key verfügbar. Nutze Setup oder OPENAI_API_KEY.",
			],
		};
	}

	try {
		const client = new OpenAI({
			apiKey: options.apiKey,
			...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
		});

		const glossaryPrompt =
			glossaryRules.length > 0
				? `Glossary-Regeln (verwende sie strikt, falls passend):\n${glossaryRules
					.map((rule) => `- ${rule.from} => ${rule.to}`)
					.join("\n")}`
				: "Keine Glossary-Regeln gesetzt.";

		const response = await client.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0,
			messages: [
				{
					role: "system",
					content:
						"Du optimierst ein Roh-Transkript für Entwickler-Workflows. Gib ausschließlich den finalen Text zurück, ohne Erklärungen.",
				},
				{
					role: "user",
					content: `Verbessere das folgende Transkript minimal (Rechtschreibung, technische Begriffe, Lesbarkeit), ohne Bedeutung zu ändern.\n\n${glossaryPrompt}\n\nTranskript:\n${glossaryAppliedText}`,
				},
			],
		});

		const llmText = response.choices[0]?.message?.content?.trim();
		if (!llmText) {
			return {
				text: glossaryAppliedText,
				usedLlm: false,
				warnings: [
					"LLM-Post-Processing lieferte keinen Text. Originaltranskript mit Glossary-Regeln wird verwendet.",
				],
			};
		}

		return {
			text: llmText,
			usedLlm: true,
			warnings: [],
		};
	} catch (error) {
		return {
			text: glossaryAppliedText,
			usedLlm: false,
			warnings: [
				`LLM-Post-Processing fehlgeschlagen, Fallback auf Transkript mit Glossary-Regeln: ${(error as Error).message}`,
			],
		};
	}
}
