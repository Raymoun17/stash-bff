import type { Prisma } from "@prisma/client";

export const notificationRuleTypes = ["price_at_or_below", "back_in_stock"] as const;
export type NotificationRuleType = (typeof notificationRuleTypes)[number];

export type ProductObservation = {
    effectivePrice: number | null;
    currency: string | null;
    status: string;
};

export type ConditionResult = {
    matched: boolean;
    payload: Prisma.InputJsonObject;
};

export type NotificationConditionHandler = {
    validate(configuration: unknown): Prisma.InputJsonObject;
    evaluate(
        configuration: unknown,
        previous: ProductObservation,
        current: ProductObservation
    ): ConditionResult;
};

export type NotificationRuleState = {
    id: string;
    userId: string;
    watchlistItemId: string;
    type: string;
    configuration: unknown;
    lastMatched: boolean | null;
};

export type RuleEvaluation = {
    ruleId: string;
    matched: boolean;
    notification?: {
        userId: string;
        watchlistItemId: string;
        type: string;
        payload: Prisma.InputJsonObject;
    };
};
