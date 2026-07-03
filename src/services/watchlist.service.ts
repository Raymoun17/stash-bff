import type { Prisma } from "@prisma/client";
import type { CreateWatchlistItemInput } from "../schemas/watchlist.schema";
import { NotFoundError } from "../lib/http-error";
import { WatchlistRepository } from "../repositories/watchlist.repository";
import type { ProductIntegrationRegistry } from "../integrations/integration.registry";

export class WatchlistService {
    static async preview(
        url: string,
        integrationRegistry: ProductIntegrationRegistry
    ) {
        return integrationRegistry.preview(url);
    }

    static async create(userId: string, input: CreateWatchlistItemInput) {
        return WatchlistRepository.create({
            userId,
            url: input.url,
            retailer: input.retailer,
            title: input.title ?? null,
            imageUrl: input.imageUrl ?? null,
            currentPrice: input.currentPrice ?? null,
            salePrice: input.salePrice ?? null,
            currency: input.currency ?? null,
            status: input.status ?? "active",
            metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
        });
    }

    static async list(userId: string) {
        return WatchlistRepository.findManyByUserId(userId);
    }

    static async getById(userId: string, watchlistItemId: string) {
        const item = await WatchlistRepository.findByIdForUser(
            watchlistItemId,
            userId
        );

        if (!item) {
            throw new NotFoundError("Watchlist item not found");
        }

        return item;
    }

    static async remove(userId: string, watchlistItemId: string) {
        const result = await WatchlistRepository.deleteByIdForUser(
            watchlistItemId,
            userId
        );

        if (result.count === 0) {
            throw new NotFoundError("Watchlist item not found");
        }

        return {
            deleted: true,
        };
    }
}
