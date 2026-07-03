import { prisma } from "../db/prisma";

export class RefreshTokenRepository {
    static create(data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }) {
        return prisma.refreshToken.create({
            data,
        });
    }

    static findValidByHash(tokenHash: string) {
        return prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                user: true,
            },
        });
    }

    static revokeByHash(tokenHash: string) {
        return prisma.refreshToken.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    static revokeAllForUser(userId: string) {
        return prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }
}
