import { GeminiProductExtractor } from "./gemini-product.extractor";
import { loadProductExtractionPrompt } from "./prompt-loader";

export const aiExtractionPrompt = loadProductExtractionPrompt();
export const aiProductExtractor = new GeminiProductExtractor(aiExtractionPrompt);
