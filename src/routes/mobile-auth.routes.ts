import { Hono } from "hono";
import { loginSchema, mobileRefreshTokenSchema, registerSchema } from "../schemas/auth.schema";
import { AuthService } from "../services/auth.service";
import type { AppBindings } from "../types/hono";

const routes = new Hono<AppBindings>();

function invalid(c: any, issues: unknown) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body", issues } }, 400);
}

routes.post("/register", async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return invalid(c, parsed.error.flatten());
    const result = await AuthService.register(parsed.data);
    return c.json({ data: result }, 201);
});

routes.post("/login", async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return invalid(c, parsed.error.flatten());
    const result = await AuthService.login(parsed.data);
    return c.json({ data: result });
});

routes.post("/refresh", async (c) => {
    const parsed = mobileRefreshTokenSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return invalid(c, parsed.error.flatten());
    const result = await AuthService.refresh(parsed.data.refreshToken);
    return c.json({ data: { accessToken: result.accessToken, refreshToken: result.refreshToken } });
});

routes.post("/logout", async (c) => {
    const parsed = mobileRefreshTokenSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return invalid(c, parsed.error.flatten());
    await AuthService.logout(parsed.data.refreshToken);
    return c.json({ data: { loggedOut: true } });
});

export default routes;
