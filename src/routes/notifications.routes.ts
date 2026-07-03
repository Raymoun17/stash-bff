import { Hono } from "hono";
import { toNotificationDto } from "../lib/notification-dto";
import { requireAuth } from "../middlewares/require-auth.middleware";
import { NotificationService } from "../services/notification.service";
import type { AppBindings } from "../types/hono";

const notificationRoutes = new Hono<AppBindings>();
notificationRoutes.use("*", requireAuth);

notificationRoutes.get("/", async (c) => {
    const notifications = await NotificationService.list(c.get("user").id);
    return c.json({ data: notifications.map(toNotificationDto), meta: { count: notifications.length } });
});

notificationRoutes.patch("/:id/read", async (c) => {
    const result = await NotificationService.markRead(c.get("user").id, c.req.param("id"));
    return c.json({ data: result });
});

notificationRoutes.delete("/", async (c) => {
    const result = await NotificationService.dismissAll(c.get("user").id);
    return c.json({ data: result });
});

notificationRoutes.delete("/:id", async (c) => {
    const result = await NotificationService.dismiss(c.get("user").id, c.req.param("id"));
    return c.json({ data: result });
});

export default notificationRoutes;
