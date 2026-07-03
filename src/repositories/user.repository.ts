import { prisma } from "../db/prisma";

export class UserRepository {
    static findByUsername(username: string) {
        return prisma.user.findUnique({
            where: { username },
        });
    }

    static findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    static create(data: { username: string; passwordHash: string }) {
        return prisma.user.create({
            data,
        });
    }
}
