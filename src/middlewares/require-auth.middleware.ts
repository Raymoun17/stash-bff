import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "../lib/http-error";
import { TokenService } from "../services/token.service";
import type { AppBindings } from "../types/hono";

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
    const authorization = c.req.header("Authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/);

    if (!match) {
        throw new UnauthorizedError("Missing access token");
    }

    const user = await TokenService.verifyAccessToken(match[1]);

    c.set("user", user);

    await next();
};
