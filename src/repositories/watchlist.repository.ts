import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

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
};

export class WatchlistRepository {
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

    static deleteByIdForUser(id: string, userId: string) {
        return prisma.watchlistItem.deleteMany({
            where: {
                id,
                userId,
            },
        });
    }
}
