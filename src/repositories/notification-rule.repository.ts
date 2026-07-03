import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

export class NotificationRuleRepository {
    static findEnabledByWatchlistItemId(watchlistItemId: string) {
        return prisma.notificationRule.findMany({
            where: { watchlistItemId, enabled: true },
            select: {
                id: true,
                userId: true,
                watchlistItemId: true,
                type: true,
                configuration: true,
                lastMatched: true,
            },
        });
    }

    static findManyForItem(userId: string, watchlistItemId: string) {
        return prisma.notificationRule.findMany({
            where: { userId, watchlistItemId },
            orderBy: { createdAt: "desc" },
        });
    }

    static create(data: {
        userId: string;
        watchlistItemId: string;
        type: string;
        configuration: Prisma.InputJsonObject;
    }) {
        return prisma.notificationRule.create({ data });
    }

    static async setEnabled(id: string, userId: string, enabled: boolean) {
        const result = await prisma.notificationRule.updateMany({
            where: { id, userId },
            data: { enabled, ...(enabled ? { lastMatched: null } : {}) },
        });
        if (result.count === 0) return null;
        return prisma.notificationRule.findUnique({ where: { id } });
    }

    static delete(id: string, userId: string) {
        return prisma.notificationRule.deleteMany({ where: { id, userId } });
    }
}
