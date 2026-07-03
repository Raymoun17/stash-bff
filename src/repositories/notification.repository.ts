import { prisma } from "../db/prisma";

export class NotificationRepository {
    static list(userId: string) {
        return prisma.notification.findMany({
            where: { userId, dismissedAt: null },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
                watchlistItem: {
                    select: { title: true, imageUrl: true, retailer: true },
                },
            },
        });
    }

    static markRead(id: string, userId: string, at: Date) {
        return prisma.notification.updateMany({
            where: { id, userId, dismissedAt: null },
            data: { readAt: at },
        });
    }

    static dismiss(id: string, userId: string, at: Date) {
        return prisma.notification.updateMany({
            where: { id, userId, dismissedAt: null },
            data: { dismissedAt: at },
        });
    }

    static dismissAll(userId: string, at: Date) {
        return prisma.notification.updateMany({
            where: { userId, dismissedAt: null },
            data: { dismissedAt: at },
        });
    }
}
