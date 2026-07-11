import { prisma } from "../db/prisma";

const itemPreview = {
    id: true,
    title: true,
    imageUrl: true,
    retailer: true,
} as const;

export class CollectionRepository {
    static create(userId: string, name: string, normalizedName: string) {
        return prisma.collection.create({
            data: { userId, name, normalizedName },
            select: { id: true, name: true, createdAt: true, updatedAt: true },
        });
    }

    static findManyByUser(userId: string) {
        return prisma.collection.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { items: true } },
                items: {
                    orderBy: { createdAt: "desc" },
                    take: 3,
                    select: { watchlistItem: { select: itemPreview } },
                },
            },
        });
    }

    static findByIdForUser(id: string, userId: string) {
        return prisma.collection.findFirst({
            where: { id, userId },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                items: {
                    orderBy: { createdAt: "desc" },
                    select: { watchlistItem: true },
                },
            },
        });
    }

    static findMembershipsForItem(userId: string, watchlistItemId: string) {
        return prisma.collection.findMany({
            where: { userId, items: { some: { watchlistItemId } } },
            select: { id: true },
        });
    }

    static async addItem(userId: string, collectionId: string, watchlistItemId: string) {
        return prisma.$transaction(async (tx) => {
            const [collection, item] = await Promise.all([
                tx.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true } }),
                tx.watchlistItem.findFirst({ where: { id: watchlistItemId, userId }, select: { id: true } }),
            ]);
            if (!collection || !item) return null;
            return tx.collectionItem.upsert({
                where: { collectionId_watchlistItemId: { collectionId, watchlistItemId } },
                create: { collectionId, watchlistItemId },
                update: {},
            });
        });
    }

    static async removeItem(userId: string, collectionId: string, watchlistItemId: string) {
        return prisma.$transaction(async (tx) => {
            const [collection, item] = await Promise.all([
                tx.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true } }),
                tx.watchlistItem.findFirst({ where: { id: watchlistItemId, userId }, select: { id: true } }),
            ]);
            if (!collection || !item) return null;
            await tx.collectionItem.deleteMany({ where: { collectionId, watchlistItemId } });
            return { collectionId, watchlistItemId };
        });
    }
}
