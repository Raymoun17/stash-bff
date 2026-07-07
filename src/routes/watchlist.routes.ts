import { Hono } from "hono";
import { requireAuth } from "../middlewares/require-auth.middleware";
import {
    createWatchlistItemSchema,
    previewWatchlistItemSchema,
    updateWatchlistExtractionModeSchema,
} from "../schemas/watchlist.schema";
import { WatchlistService } from "../services/watchlist.service";
import type { AppBindings } from "../types/hono";
import type { PreviewProductExecutor } from "../application/product-preview/preview-product.use-case";
import { defaultPreviewProductUseCase } from "../integrations/default.registry";
import { createNotificationRuleSchema } from "../schemas/notification-rule.schema";
import { NotificationRuleService } from "../services/notification-rule.service";
import { PriceRefreshService } from "../services/price-refresh.service";

export function createWatchlistRoutes(previewProduct: PreviewProductExecutor) {
    const watchlistRoutes = new Hono<AppBindings>();
    const priceRefreshService = new PriceRefreshService(previewProduct);

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

        const preview = await previewProduct.execute(parsed.data);

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

    watchlistRoutes.get("/:id/price-history", async (c) => {
        const user = c.get("user");
        const history = await WatchlistService.getPriceHistory(user.id, c.req.param("id"));
        return c.json({ data: history, meta: { count: history.length } });
    });

    watchlistRoutes.post("/:id/refresh", async (c) => {
        const item = await priceRefreshService.refreshOne(
            c.get("user").id,
            c.req.param("id")
        );
        return c.json({ data: item });
    });

    watchlistRoutes.get("/:id/notification-rules", async (c) => {
        const rules = await NotificationRuleService.list(c.get("user").id, c.req.param("id"));
        return c.json({ data: rules, meta: { count: rules.length } });
    });

    watchlistRoutes.post("/:id/notification-rules", async (c) => {
        const parsed = createNotificationRuleSchema.safeParse(await c.req.json());
        if (!parsed.success) {
            return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body", issues: parsed.error.flatten() } }, 400);
        }
        const rule = await NotificationRuleService.create(c.get("user").id, c.req.param("id"), parsed.data);
        return c.json({ data: rule }, 201);
    });

    watchlistRoutes.get("/:id", async (c) => {
        const user = c.get("user");
        const id = c.req.param("id");

        const item = await WatchlistService.getById(user.id, id);

        return c.json({
            data: item,
        });
    });

    watchlistRoutes.patch("/:id/extraction-mode", async (c) => {
        const parsed = updateWatchlistExtractionModeSchema.safeParse(
            await c.req.json()
        );
        if (!parsed.success) {
            return c.json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid request body",
                    issues: parsed.error.flatten(),
                },
            }, 400);
        }
        const item = await WatchlistService.updateExtractionMode(
            c.get("user").id,
            c.req.param("id"),
            parsed.data
        );
        return c.json({ data: item });
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

const watchlistRoutes = createWatchlistRoutes(defaultPreviewProductUseCase);

export default watchlistRoutes;
