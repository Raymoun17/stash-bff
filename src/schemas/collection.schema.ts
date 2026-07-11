import { z } from "zod";

export const createCollectionSchema = z.object({
    name: z.string().trim().min(1).max(60),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
