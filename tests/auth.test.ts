import { describe, expect, test } from "vitest";
import {
    ApiClient,
    createAuthenticatedClient,
    uniqueUsername,
} from "./helpers/api-client";

describe("Auth API", () => {
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
