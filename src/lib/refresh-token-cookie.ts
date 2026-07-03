import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const REFRESH_COOKIE_NAME =
    process.env.REFRESH_COOKIE_NAME ?? "stash_refresh";
const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH ?? "/auth";

function isSecureCookie() {
    const configured = process.env.REFRESH_COOKIE_SECURE;

    if (configured === undefined) {
        return process.env.NODE_ENV === "production";
    }

    return ["1", "true", "yes", "on"].includes(configured.toLowerCase());
}

export function setRefreshTokenCookie(c: Context, refreshToken: string) {
    const expiresDays = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30);

    setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: isSecureCookie(),
        sameSite: "Lax",
        path: REFRESH_COOKIE_PATH,
        maxAge: 60 * 60 * 24 * expiresDays,
    });
}

export function getRefreshTokenCookie(c: Context) {
    return getCookie(c, REFRESH_COOKIE_NAME);
}

export function clearRefreshTokenCookie(c: Context) {
    deleteCookie(c, REFRESH_COOKIE_NAME, {
        path: REFRESH_COOKIE_PATH,
    });
}
