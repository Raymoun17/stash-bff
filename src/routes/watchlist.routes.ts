import { Hono } from "hono";
import { requireAuth } from "../middlewares/require-auth.middleware";
import {
    createWatchlistItemSchema,
    previewWatchlistItemSchema,
} from "../schemas/watchlist.schema";
import { WatchlistService } from "../services/watchlist.service";
import type { AppBindings } from "../types/hono";
import type { ProductIntegrationRegistry } from "../integrations/integration.registry";
import { defaultProductIntegrationRegistry } from "../integrations/default.registry";

export function createWatchlistRoutes(
    integrationRegistry: ProductIntegrationRegistry
) {
    const watchlistRoutes = new Hono<AppBindings>();

    watchlistRoutes.use("*", requireAuth);

    watchlistRoutes.post("/preview", async (c) => {
        const body = await c.req.json();
        const parsed = previewWatchlistItemSchema.safeParse(body);

        if (!parsed.success) {
            return c.json(
                {
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request body",
                        issues: parsed.error.flatten(),
                    },
                },
                400
            );
        }

        const preview = await WatchlistService.preview(
            parsed.data.url,
            integrationRegistry
        );

        return c.json({
            data: preview,
        });
    });

    watchlistRoutes.post("/", async (c) => {
        const user = c.get("user");
        const body = await c.req.json();
        const parsed = createWatchlistItemSchema.safeParse(body);

        if (!parsed.success) {
            return c.json(
                {
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request body",
                        issues: parsed.error.flatten(),
                    },
                },
                400
            );
        }

        const item = await WatchlistService.create(user.id, parsed.data);

        return c.json(
            {
                data: item,
            },
            201
        );
    });

    watchlistRoutes.get("/", async (c) => {
        const user = c.get("user");

        const items = await WatchlistService.list(user.id);

        return c.json({
            data: items,
            meta: {
                count: items.length,
            },
        });
    });

    watchlistRoutes.get("/:id", async (c) => {
        const user = c.get("user");
        const id = c.req.param("id");

        const item = await WatchlistService.getById(user.id, id);

        return c.json({
            data: item,
        });
    });

    watchlistRoutes.delete("/:id", async (c) => {
        const user = c.get("user");
        const id = c.req.param("id");

        const result = await WatchlistService.remove(user.id, id);

        return c.json({
            data: result,
        });
    });

    return watchlistRoutes;
}

const watchlistRoutes = createWatchlistRoutes(
    defaultProductIntegrationRegistry
);

export default watchlistRoutes;
