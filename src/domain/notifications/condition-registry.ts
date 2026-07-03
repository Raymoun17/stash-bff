import { backInStockCondition } from "./back-in-stock.condition";
import type { NotificationConditionHandler, NotificationRuleType } from "./notification-condition";
import { priceAtOrBelowCondition } from "./price-at-or-below.condition";

export const notificationConditions: Record<NotificationRuleType, NotificationConditionHandler> = {
    price_at_or_below: priceAtOrBelowCondition,
    back_in_stock: backInStockCondition,
};

export function getNotificationCondition(type: string) {
    return notificationConditions[type as NotificationRuleType];
}
