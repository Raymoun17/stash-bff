import { z } from "zod";
import type { NotificationConditionHandler } from "./notification-condition";

const backInStockConfigurationSchema = z.object({}).strict();

export const backInStockCondition: NotificationConditionHandler = {
    validate(configuration) {
        return backInStockConfigurationSchema.parse(configuration);
    },
    evaluate(configuration, previous, current) {
        backInStockConfigurationSchema.parse(configuration);
        const matched = previous.status === "unavailable" && current.status === "active";
        return {
            matched,
            payload: {
                version: 1,
                previousStatus: previous.status,
                currentStatus: current.status,
            },
        };
    },
};
