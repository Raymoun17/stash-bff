import { z } from "zod";

export const createNotificationRuleSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("price_at_or_below"),
        targetPrice: z.number().positive().finite(),
        currency: z.string().trim().length(3),
    }),
    z.object({ type: z.literal("back_in_stock") }),
]);

export const updateNotificationRuleSchema = z.object({
    enabled: z.boolean(),
});

export type CreateNotificationRuleInput = z.infer<typeof createNotificationRuleSchema>;
