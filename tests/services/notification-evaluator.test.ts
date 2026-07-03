import { describe, expect, test } from "vitest";
import type { NotificationRuleState, ProductObservation } from "../../src/domain/notifications/notification-condition";
import { NotificationEvaluator } from "../../src/services/notification-evaluator.service";

const active = (price: number | null): ProductObservation => ({ effectivePrice: price, currency: "CAD", status: "active" });
const rule = (overrides: Partial<NotificationRuleState> = {}): NotificationRuleState => ({
    id: "rule-1",
    userId: "user-1",
    watchlistItemId: "item-1",
    type: "price_at_or_below",
    configuration: { targetPrice: 50, currency: "CAD" },
    lastMatched: false,
    ...overrides,
});

describe("NotificationEvaluator", () => {
    test("notifies when price first reaches the inclusive target", () => {
        const [result] = NotificationEvaluator.evaluate([rule()], active(70), active(50));
        expect(result.matched).toBe(true);
        expect(result.notification?.payload).toMatchObject({ currentPrice: 50, targetPrice: 50 });
    });

    test("does not repeat while a rule remains matched", () => {
        const [result] = NotificationEvaluator.evaluate([rule({ lastMatched: true })], active(50), active(45));
        expect(result.matched).toBe(true);
        expect(result.notification).toBeUndefined();
    });

    test("re-arms a rule after it stops matching", () => {
        const [result] = NotificationEvaluator.evaluate([rule({ lastMatched: true })], active(45), active(60));
        expect(result).toMatchObject({ matched: false });
    });

    test("requires an unavailable to active transition for back in stock", () => {
        const backInStock = rule({ type: "back_in_stock", configuration: {}, lastMatched: null });
        const unavailable: ProductObservation = { effectivePrice: null, currency: null, status: "unavailable" };
        const [transition] = NotificationEvaluator.evaluate([backInStock], unavailable, active(40));
        const [alreadyActive] = NotificationEvaluator.evaluate([backInStock], active(40), active(40));
        expect(transition.notification).toBeDefined();
        expect(alreadyActive.notification).toBeUndefined();
    });

    test("does not match a price in a different currency", () => {
        const [result] = NotificationEvaluator.evaluate([rule()], active(70), { ...active(40), currency: "USD" });
        expect(result.matched).toBe(false);
    });
});
