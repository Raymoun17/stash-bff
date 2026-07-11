import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "../lib/http-error";
import { CollectionRepository } from "../repositories/collection.repository";
import type { CreateCollectionInput } from "../schemas/collection.schema";

export class CollectionService {
    static async create(userId: string, input: CreateCollectionInput) {
        const name = input.name.trim();
        try {
            const collection = await CollectionRepository.create(userId, name, name.toLowerCase());
            return { ...collection, itemCount: 0, itemPreviews: [] };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictError("A collection with this name already exists");
            }
            throw error;
        }
    }

    static async list(userId: string) {
        const collections = await CollectionRepository.findManyByUser(userId);
        return collections.map(({ _count, items, ...collection }) => ({
            ...collection,
            itemCount: _count.items,
            itemPreviews: items.map(({ watchlistItem }) => watchlistItem),
        }));
    }

    static async get(userId: string, id: string) {
        const collection = await CollectionRepository.findByIdForUser(id, userId);
        if (!collection) throw new NotFoundError("Collection not found");
        return { ...collection, items: collection.items.map(({ watchlistItem }) => watchlistItem) };
    }

    static async memberships(userId: string, watchlistItemId: string) {
        return (await CollectionRepository.findMembershipsForItem(userId, watchlistItemId)).map(({ id }) => id);
    }

    static async addItem(userId: string, collectionId: string, watchlistItemId: string) {
        const result = await CollectionRepository.addItem(userId, collectionId, watchlistItemId);
        if (!result) throw new NotFoundError("Collection or watchlist item not found");
        return { collectionId, watchlistItemId, added: true };
    }

    static async removeItem(userId: string, collectionId: string, watchlistItemId: string) {
        const result = await CollectionRepository.removeItem(userId, collectionId, watchlistItemId);
        if (!result) throw new NotFoundError("Collection or watchlist item not found");
        return { collectionId, watchlistItemId, removed: true };
    }
}
