import { z } from "zod";

export const previewWatchlistItemSchema = z.object({
    url: z.url(),
    extractionMode: z
        .enum(["standard", "ai_fallback", "ai_only"])
        .default("standard"),
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
});

export type PreviewWatchlistItemInput = z.infer<
    typeof previewWatchlistItemSchema
>;

export type CreateWatchlistItemInput = z.infer<
    typeof createWatchlistItemSchema
>;
