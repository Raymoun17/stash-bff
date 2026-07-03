import { getNotificationCondition } from "../domain/notifications/condition-registry";
import type { NotificationRuleState, ProductObservation, RuleEvaluation } from "../domain/notifications/notification-condition";

export class NotificationEvaluator {
    static evaluate(
        rules: NotificationRuleState[],
        previous: ProductObservation,
        current: ProductObservation
    ): RuleEvaluation[] {
        return rules.flatMap((rule) => {
            const handler = getNotificationCondition(rule.type);
            if (!handler) return [];
            const result = handler.evaluate(rule.configuration, previous, current);
            const shouldNotify = result.matched && rule.lastMatched !== true;
            return [{
                ruleId: rule.id,
                matched: result.matched,
                ...(shouldNotify ? {
                    notification: {
                        userId: rule.userId,
                        watchlistItemId: rule.watchlistItemId,
                        type: rule.type,
                        payload: result.payload,
                    },
                } : {}),
            }];
        });
    }
}
