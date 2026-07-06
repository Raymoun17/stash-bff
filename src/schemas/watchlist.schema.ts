import { z } from "zod";

export const extractionModeSchema = z.enum([
    "standard",
    "ai_fallback",
    "ai_only",
]);

export const previewWatchlistItemSchema = z.object({
    url: z.url(),
    extractionMode: extractionModeSchema,
});

export const createWatchlistItemSchema = z.object({
    url: z.url(),
    retailer: z.string().min(1),
    title: z.string().nullable().optional(),
    imageUrl: z.url().nullable().optional(),
    currentPrice: z.number().nullable().optional(),
    salePrice: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    extractionMode: extractionModeSchema,
});

export const updateWatchlistExtractionModeSchema = z.object({
    extractionMode: extractionModeSchema,
});

export type PreviewWatchlistItemInput = z.infer<
    typeof previewWatchlistItemSchema
>;

export type CreateWatchlistItemInput = z.infer<
    typeof createWatchlistItemSchema
>;

export type UpdateWatchlistExtractionModeInput = z.infer<
    typeof updateWatchlistExtractionModeSchema
>;
