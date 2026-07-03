import { Hono } from "hono";
import { requireAuth } from "../middlewares/require-auth.middleware";
import { updateNotificationRuleSchema } from "../schemas/notification-rule.schema";
import { NotificationRuleService } from "../services/notification-rule.service";
import type { AppBindings } from "../types/hono";

const notificationRuleRoutes = new Hono<AppBindings>();
notificationRuleRoutes.use("*", requireAuth);

notificationRuleRoutes.patch("/:id", async (c) => {
    const parsed = updateNotificationRuleSchema.safeParse(await c.req.json());
    if (!parsed.success) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body", issues: parsed.error.flatten() } }, 400);
    }
    const rule = await NotificationRuleService.setEnabled(c.get("user").id, c.req.param("id"), parsed.data.enabled);
    return c.json({ data: rule });
});

notificationRuleRoutes.delete("/:id", async (c) => {
    const result = await NotificationRuleService.remove(c.get("user").id, c.req.param("id"));
    return c.json({ data: result });
});

export default notificationRuleRoutes;
