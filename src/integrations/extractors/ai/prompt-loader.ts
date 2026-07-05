import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_AI_PROMPT_PATH = "prompts/product-extraction.md";

export function loadProductExtractionPrompt(
    path = process.env.AI_EXTRACTION_PROMPT_PATH ?? DEFAULT_AI_PROMPT_PATH
) {
    const absolutePath = resolve(process.cwd(), path);
    let prompt: string;
    try {
        prompt = readFileSync(absolutePath, "utf8").trim();
    } catch (cause) {
        throw new Error(`Unable to load AI extraction prompt at ${absolutePath}`, {
            cause,
        });
    }
    if (!prompt) {
        throw new Error(`AI extraction prompt is empty at ${absolutePath}`);
    }
    return prompt;
}
