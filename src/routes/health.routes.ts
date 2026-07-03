import { Hono } from "hono";
import type { AppBindings } from "../types/hono";

const healthRoutes = new Hono<AppBindings>();

healthRoutes.get("/", (c) => {
    return c.json({
        data: {
            status: "ok",
        },
    });
});

export default healthRoutes;
