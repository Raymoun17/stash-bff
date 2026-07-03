import { z } from "zod";
import type { NotificationConditionHandler } from "./notification-condition";

export const priceAtOrBelowConfigurationSchema = z.object({
    targetPrice: z.number().positive().finite(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export const priceAtOrBelowCondition: NotificationConditionHandler = {
    validate(configuration) {
        return priceAtOrBelowConfigurationSchema.parse(configuration);
    },
    evaluate(configuration, _previous, current) {
        const config = priceAtOrBelowConfigurationSchema.parse(configuration);
        const matched = current.effectivePrice !== null &&
            current.currency?.toUpperCase() === config.currency &&
            current.effectivePrice <= config.targetPrice;
        return {
            matched,
            payload: {
                version: 1,
                targetPrice: config.targetPrice,
                currentPrice: current.effectivePrice,
                currency: config.currency,
            },
        };
    },
};
