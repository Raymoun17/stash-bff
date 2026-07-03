import { Hono } from "hono";
import { UnauthorizedError } from "../lib/http-error";
import {
    clearRefreshTokenCookie,
    getRefreshTokenCookie,
    setRefreshTokenCookie,
} from "../lib/refresh-token-cookie";
import { requireAuth } from "../middlewares/require-auth.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { AuthService } from "../services/auth.service";
import type { AppBindings } from "../types/hono";

const authRoutes = new Hono<AppBindings>();

authRoutes.post("/register", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = registerSchema.safeParse(body);

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

    const result = await AuthService.register(parsed.data);
    setRefreshTokenCookie(c, result.refreshToken);

    return c.json(
        {
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        },
        201
    );
});

authRoutes.post("/login", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = loginSchema.safeParse(body);

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

    const result = await AuthService.login(parsed.data);
    setRefreshTokenCookie(c, result.refreshToken);

    return c.json({
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

authRoutes.post("/refresh", async (c) => {
    const refreshToken = getRefreshTokenCookie(c);

    if (!refreshToken) {
        throw new UnauthorizedError("Missing refresh token");
    }

    const result = await AuthService.refresh(refreshToken);
    setRefreshTokenCookie(c, result.refreshToken);

    return c.json({
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

authRoutes.post("/logout", async (c) => {
    const refreshToken = getRefreshTokenCookie(c);

    await AuthService.logout(refreshToken);
    clearRefreshTokenCookie(c);

    return c.json({
        data: {
            loggedOut: true,
        },
    });
});

authRoutes.get("/me", requireAuth, (c) => {
    return c.json({
        data: {
            user: c.get("user"),
        },
    });
});

export default authRoutes;
