import { beforeAll, describe, expect, test } from "vitest";
import { prisma } from "../src/db/prisma";
import { createApp } from "../src/app";
import { type ApiClient, createAuthenticatedClient } from "./helpers/api-client";

const app = createApp();

describe("Notifications API", () => {
    let client: ApiClient;
    let userId: string;
    let itemId: string;
    let ruleId: string;

    beforeAll(async () => {
        const authenticated = await createAuthenticatedClient("notifications", app);
        client = authenticated.client;
        const user = await prisma.user.findUniqueOrThrow({ where: { username: authenticated.username } });
        userId = user.id;
        const created = await client.request("/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/notification-test",
                retailer: "zara",
                title: "Notification Test Product",
                currentPrice: 80,
                currency: "CAD",
                extractionMode: "standard",
            }),
        });
        itemId = created.json.data.id;
    });

    test("creates and manages an owned notification rule", async () => {
        const created = await client.request(`/watchlist/${itemId}/notification-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "price_at_or_below", targetPrice: 50, currency: "cad" }),
        });
        expect(created.status).toBe(201);
        expect(created.json.data.configuration).toEqual({ targetPrice: 50, currency: "CAD" });
        ruleId = created.json.data.id;

        const listed = await client.request(`/watchlist/${itemId}/notification-rules`);
        expect(listed.json.data).toHaveLength(1);

        const disabled = await client.request(`/notification-rules/${ruleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: false }),
        });
        expect(disabled.json.data.enabled).toBe(false);
    });

    test("lists, reads, and softly dismisses notifications", async () => {
        const notification = await prisma.notification.create({
            data: {
                userId,
                watchlistItemId: itemId,
                ruleId,
                type: "price_at_or_below",
                payload: { version: 1, targetPrice: 50, currentPrice: 49, currency: "CAD" },
            },
        });
        const listed = await client.request("/notifications");
        expect(listed.json.data[0]).toMatchObject({
            id: notification.id,
            productId: itemId,
            productTitle: "Notification Test Product",
            read: false,
        });

        expect((await client.request(`/notifications/${notification.id}/read`, { method: "PATCH" })).status).toBe(200);
        expect((await client.request(`/notifications/${notification.id}`, { method: "DELETE" })).status).toBe(200);
        expect((await client.request("/notifications")).json.data).toHaveLength(0);
    });

    test("rejects invalid rule configuration", async () => {
        const response = await client.request(`/watchlist/${itemId}/notification-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "price_at_or_below", targetPrice: -1, currency: "CAD" }),
        });
        expect(response.status).toBe(400);
    });
});
