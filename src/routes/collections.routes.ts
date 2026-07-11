import { Hono } from "hono";
import { requireAuth } from "../middlewares/require-auth.middleware";
import { createCollectionSchema } from "../schemas/collection.schema";
import { CollectionService } from "../services/collection.service";
import type { AppBindings } from "../types/hono";

const routes = new Hono<AppBindings>();
routes.use("*", requireAuth);

routes.get("/", async (c) => {
    const data = await CollectionService.list(c.get("user").id);
    return c.json({ data, meta: { count: data.length } });
});

routes.post("/", async (c) => {
    const parsed = createCollectionSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Collection name must be between 1 and 60 characters", issues: parsed.error.flatten() } }, 400);
    return c.json({ data: await CollectionService.create(c.get("user").id, parsed.data) }, 201);
});

routes.get("/:id", async (c) => c.json({ data: await CollectionService.get(c.get("user").id, c.req.param("id")) }));
routes.put("/:id/items/:itemId", async (c) => c.json({ data: await CollectionService.addItem(c.get("user").id, c.req.param("id"), c.req.param("itemId")) }));
routes.delete("/:id/items/:itemId", async (c) => c.json({ data: await CollectionService.removeItem(c.get("user").id, c.req.param("id"), c.req.param("itemId")) }));

export default routes;
