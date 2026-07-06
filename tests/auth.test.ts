import { describe, expect, test } from "vitest";
import {
    ApiClient,
    createAuthenticatedClient,
    uniqueUsername,
} from "./helpers/api-client";

describe("Auth API", () => {
    test("mobile credentials rotate, revoke, and authorize protected routes", async () => {
        const client = new ApiClient();
        const username = uniqueUsername("mobile");
        const registered = await client.request("/auth/mobile/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "password123" }) });
        expect(registered.status).toBe(201);
        expect(registered.json.data).toMatchObject({ user: { username } });
        expect(registered.json.data.accessToken).toBeDefined();
        expect(registered.json.data.refreshToken).toBeDefined();
        expect(registered.headers.get("set-cookie")).toBeNull();

        const loggedIn = await client.request("/auth/mobile/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "password123" }) });
        const oldToken = loggedIn.json.data.refreshToken;
        expect(loggedIn.status).toBe(200);
        const list = await client.request("/watchlist");
        expect(list.status).toBe(200);

        const rotated = await client.request("/auth/mobile/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: oldToken }) });
        expect(rotated.status).toBe(200);
        expect(rotated.json.data.refreshToken).not.toBe(oldToken);
        const reuse = await client.request("/auth/mobile/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: oldToken }) });
        expect(reuse.status).toBe(401);

        const currentToken = rotated.json.data.refreshToken;
        const logout = await client.request("/auth/mobile/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: currentToken }) });
        expect(logout.json.data.loggedOut).toBe(true);
        const afterLogout = await client.request("/auth/mobile/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: currentToken }) });
        expect(afterLogout.status).toBe(401);
    });
    test("POST /auth/register creates a user and credentials", async () => {
        const client = new ApiClient();
        const username = uniqueUsername("register");
        const { status, json, headers } = await client.request("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.toUpperCase(), password: "password123" }),
        });

        expect(status).toBe(201);
        expect(json.data.user.username).toBe(username);
        expect(json.data.accessToken).toBeDefined();
        expect(headers.get("set-cookie")).toContain("stash_refresh=");
        expect(json.data.refreshToken).toBeUndefined();
    });

    test("POST /auth/login authenticates an existing user", async () => {
        const { username, password } = await createAuthenticatedClient("login");
        const client = new ApiClient();
        const { status, json } = await client.request("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        expect(status).toBe(200);
        expect(json.data.user.username).toBe(username);
        expect(json.data.accessToken).toBeDefined();
    });

    test("GET /auth/me returns the authenticated user", async () => {
        const { client, username } = await createAuthenticatedClient("me");
        const { status, json } = await client.request("/auth/me");

        expect(status).toBe(200);
        expect(json.data.user.username).toBe(username);
    });

    test("POST /auth/refresh rotates authentication credentials", async () => {
        const { client, username } = await createAuthenticatedClient("refresh");
        const { status, json, headers } = await client.request("/auth/refresh", {
            method: "POST",
        });

        expect(status).toBe(200);
        expect(json.data.user.username).toBe(username);
        expect(json.data.accessToken).toBeDefined();
        expect(headers.get("set-cookie")).toContain("stash_refresh=");
    });

    test("POST /auth/logout revokes the refresh token", async () => {
        const { client } = await createAuthenticatedClient("logout");
        const logout = await client.request("/auth/logout", { method: "POST" });

        expect(logout.status).toBe(200);
        expect(logout.json.data.loggedOut).toBe(true);

        const refresh = await client.request("/auth/refresh", { method: "POST" });

        expect(refresh.status).toBe(401);
        expect(refresh.json.error.code).toBe("UNAUTHORIZED");
    });
});
