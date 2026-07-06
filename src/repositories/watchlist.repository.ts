import { Prisma, type ExtractionMode } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { RuleEvaluation } from "../domain/notifications/notification-condition";

type CreateWatchlistItemData = {
    userId: string;
    url: string;
    retailer: string;
    title?: string | null;
    imageUrl?: string | null;
    currentPrice?: number | null;
    salePrice?: number | null;
    currency?: string | null;
    status?: string;
    metadata?: Prisma.InputJsonValue | null;
    extractionMode: ExtractionMode;
};

export class WatchlistRepository {
    static findRefreshBatch(afterId: string | undefined, take: number) {
        return prisma.watchlistItem.findMany({
            orderBy: { id: "asc" },
            take,
            ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
            select: {
                id: true,
                url: true,
                extractionMode: true,
                currentPrice: true,
                salePrice: true,
                currency: true,
                status: true,
            },
        });
    }

    static recordRefreshSuccess(id: string, preview: {
        url: string; title: string; imageUrl: string | null;
        currentPrice: number | null; salePrice: number | null;
        currency: string | null; status: string; metadata: Record<string, unknown> | null;
    }, effectivePrice: number | null, attemptedAt: Date, evaluations: RuleEvaluation[] = []) {
        return prisma.$transaction(async (tx) => {
            const item = await tx.watchlistItem.update({
                where: { id },
                data: {
                    url: preview.url, title: preview.title, imageUrl: preview.imageUrl,
                    currentPrice: preview.currentPrice, salePrice: preview.salePrice,
                    currency: preview.currency, status: preview.status,
                    metadata: preview.metadata === null ? Prisma.JsonNull : preview.metadata as Prisma.InputJsonValue,
                    lastRefreshAttemptAt: attemptedAt, lastRefreshedAt: attemptedAt,
                    lastRefreshError: null, consecutiveRefreshFailures: 0,
                },
            });
            if (effectivePrice !== null && preview.currency) {
                await tx.priceSnapshot.create({
                    data: { watchlistItemId: id, price: effectivePrice, currency: preview.currency },
                });
            }
            for (const evaluation of evaluations) {
                await tx.notificationRule.update({
                    where: { id: evaluation.ruleId },
                    data: { lastMatched: evaluation.matched },
                });
                if (evaluation.notification) {
                    await tx.notification.create({
                        data: {
                            ...evaluation.notification,
                            ruleId: evaluation.ruleId,
                        },
                    });
                }
            }
            return item;
        });
    }

    static recordRefreshFailure(id: string, error: string, attemptedAt: Date) {
        return prisma.watchlistItem.update({ where: { id }, data: {
            lastRefreshAttemptAt: attemptedAt, lastRefreshError: error,
            consecutiveRefreshFailures: { increment: 1 },
        }});
    }

    static findPriceHistory(id: string) {
        return prisma.priceSnapshot.findMany({
            where: { watchlistItemId: id }, orderBy: { createdAt: "asc" },
            select: { id: true, price: true, currency: true, createdAt: true },
        });
    }
    static create(data: CreateWatchlistItemData) {
        return prisma.watchlistItem.create({
            data: {
                userId: data.userId,
                url: data.url,
                retailer: data.retailer,
                title: data.title ?? null,
                imageUrl: data.imageUrl ?? null,
                currentPrice: data.currentPrice ?? null,
                salePrice: data.salePrice ?? null,
                currency: data.currency ?? null,
                status: data.status ?? "active",
                extractionMode: data.extractionMode,
                metadata:
                    data.metadata === null || data.metadata === undefined
                        ? Prisma.JsonNull
                        : data.metadata,
            },
        });
    }

    static findManyByUserId(userId: string) {
        return prisma.watchlistItem.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    static findByIdForUser(id: string, userId: string) {
        return prisma.watchlistItem.findFirst({
            where: {
                id,
                userId,
            },
        });
    }

    static updateExtractionModeByIdForUser(
        id: string,
        userId: string,
        extractionMode: ExtractionMode
    ) {
        return prisma.$transaction(async (tx) => {
            const result = await tx.watchlistItem.updateMany({
                where: { id, userId },
                data: { extractionMode },
            });
            if (result.count === 0) return null;
            return tx.watchlistItem.findUniqueOrThrow({ where: { id } });
        });
    }

    static deleteByIdForUser(id: string, userId: string) {
        return prisma.watchlistItem.deleteMany({
            where: {
                id,
                userId,
            },
        });
    }
}
