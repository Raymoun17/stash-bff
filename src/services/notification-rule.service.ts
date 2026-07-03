import { getNotificationCondition } from "../domain/notifications/condition-registry";
import { BadRequestError, NotFoundError } from "../lib/http-error";
import { NotificationRuleRepository } from "../repositories/notification-rule.repository";
import type { CreateNotificationRuleInput } from "../schemas/notification-rule.schema";
import { WatchlistService } from "./watchlist.service";

export class NotificationRuleService {
    static async list(userId: string, watchlistItemId: string) {
        await WatchlistService.getById(userId, watchlistItemId);
        return NotificationRuleRepository.findManyForItem(userId, watchlistItemId);
    }

    static async create(userId: string, watchlistItemId: string, input: CreateNotificationRuleInput) {
        await WatchlistService.getById(userId, watchlistItemId);
        const handler = getNotificationCondition(input.type);
        if (!handler) throw new BadRequestError("Unsupported notification rule type");
        const configuration = handler.validate(
            input.type === "price_at_or_below"
                ? { targetPrice: input.targetPrice, currency: input.currency }
                : {}
        );
        const rule = await NotificationRuleRepository.create({
            userId,
            watchlistItemId,
            type: input.type,
            configuration,
        });
        console.info("notification rule created", {
            ruleId: rule.id,
            userId,
            watchlistItemId,
            type: rule.type,
        });
        return rule;
    }

    static async setEnabled(userId: string, id: string, enabled: boolean) {
        const rule = await NotificationRuleRepository.setEnabled(id, userId, enabled);
        if (!rule) throw new NotFoundError("Notification rule not found");
        return rule;
    }

    static async remove(userId: string, id: string) {
        const result = await NotificationRuleRepository.delete(id, userId);
        if (result.count === 0) throw new NotFoundError("Notification rule not found");
        return { deleted: true };
    }
}
