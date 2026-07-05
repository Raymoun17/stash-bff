import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ProductPreview } from "../../../domain/product/product-preview";
import { ProductDataUnavailableError } from "../../integration-error";
import type { ProductExtractionInput, ProductExtractor } from "../product-extractor";
import { cleanProductHtml } from "./html-cleaner";

export const GEMINI_PRODUCT_MODEL = "gemini-2.5-flash";
export const PRODUCT_RESPONSE_JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        title: { type: "string", description: "The primary product name." },
        imageUrl: {
            type: ["string", "null"],
            description: "The best primary product image URL, or null.",
        },
        currentPrice: {
            type: "number",
            minimum: 0,
            description: "Regular/original price, or the sole price when not discounted.",
        },
        salePrice: {
            type: ["number", "null"],
            minimum: 0,
            description: "Lower discounted price, or null.",
        },
        currency: {
            type: "string",
            description: "Three-letter ISO 4217 currency code.",
        },
        status: { type: "string", enum: ["active", "unavailable"] },
    },
    required: ["title", "imageUrl", "currentPrice", "salePrice", "currency", "status"],
} as const;

const aiResultSchema = z
    .object({
        title: z.string().trim().min(1),
        imageUrl: z.string().trim().nullable(),
        currentPrice: z.number().finite().nonnegative(),
        salePrice: z.number().finite().nonnegative().nullable(),
        currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
        status: z.enum(["active", "unavailable"]),
    })
    .strict()
    .refine(
        ({ currentPrice, salePrice }) => salePrice === null || salePrice <= currentPrice,
        { message: "salePrice cannot exceed currentPrice", path: ["salePrice"] }
    );

type GeminiClient = Pick<GoogleGenAI, "models">;

export class GeminiProductExtractor implements ProductExtractor {
    private client?: GeminiClient;

    constructor(
        private readonly prompt: string,
        private readonly createClient: (apiKey: string) => GeminiClient =
            (apiKey) => new GoogleGenAI({ apiKey })
    ) {}

    async extract(input: ProductExtractionInput): Promise<ProductPreview> {
        const startedAt = Date.now();
        const target = safeUrlForLog(input.finalUrl);
        console.info("AI product extraction started", {
            retailer: input.retailerId,
            target,
            model: GEMINI_PRODUCT_MODEL,
        });
        try {
            const { html, jsonLd } = cleanProductHtml(input.html);
            const response = await this.getClient().models.generateContent({
                model: GEMINI_PRODUCT_MODEL,
                contents: [
                    this.prompt,
                    "\n--- REQUEST CONTEXT (UNTRUSTED SOURCE DATA) ---",
                    `Requested URL: ${input.requestedUrl}`,
                    `Final URL: ${input.finalUrl}`,
                    `Retailer identifier: ${input.retailerId}`,
                    `Page title: ${input.pageTitle ?? ""}`,
                    `Visible text:\n${input.bodyText ?? ""}`,
                    `Product JSON-LD candidates:\n${jsonLd.join("\n")}`,
                    `Cleaned rendered HTML:\n${html}`,
                ].join("\n"),
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: PRODUCT_RESPONSE_JSON_SCHEMA,
                    temperature: 0,
                },
            });
            if (!response.text) throw new Error("Gemini returned no text");
            const result = aiResultSchema.parse(JSON.parse(response.text));
            console.info("AI product extraction completed", {
                retailer: input.retailerId,
                target,
                model: GEMINI_PRODUCT_MODEL,
                durationMs: Date.now() - startedAt,
                status: result.status,
            });
            return {
                url: input.finalUrl,
                retailer: input.retailerId,
                title: result.title,
                imageUrl: safeImageUrl(result.imageUrl, input.finalUrl),
                currentPrice: result.currentPrice,
                salePrice: result.salePrice,
                currency: result.currency,
                status: result.status,
                metadata: { extractionMethod: "ai", model: GEMINI_PRODUCT_MODEL },
            };
        } catch (cause) {
            console.warn("AI product extraction failed", {
                retailer: input.retailerId,
                target,
                model: GEMINI_PRODUCT_MODEL,
                durationMs: Date.now() - startedAt,
                errorType: cause instanceof Error ? cause.name : "UnknownError",
            });
            if (cause instanceof ProductDataUnavailableError) throw cause;
            throw new ProductDataUnavailableError(
                "AI could not extract complete product data",
                cause
            );
        }
    }

    private getClient() {
        if (this.client) return this.client;
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
            throw new ProductDataUnavailableError(
                "AI product extraction is not configured"
            );
        }
        this.client = this.createClient(apiKey);
        return this.client;
    }
}

function safeUrlForLog(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
        return "<invalid-url>";
    }
}

function safeImageUrl(value: string | null, baseUrl: string) {
    if (!value) return null;
    try {
        const url = new URL(value, baseUrl);
        const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.username ||
            url.password ||
            isPrivateLookingHostname(hostname)
        ) {
            return null;
        }
        return url.href;
    } catch {
        return null;
    }
}

export function isPrivateLookingHostname(hostname: string) {
    return (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        !hostname.includes(".") ||
        /^\[.*\]$/.test(hostname) ||
        /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    );
}
