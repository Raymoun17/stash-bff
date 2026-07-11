import { beforeAll, describe, expect, test } from "vitest";
import { type ApiClient, createAuthenticatedClient } from "./helpers/api-client";

const jsonHeaders = { "Content-Type": "application/json" };

describe("Collections API", () => {
    let client: ApiClient;
    let otherClient: ApiClient;
    let itemId: string;

    beforeAll(async () => {
        ({ client } = await createAuthenticatedClient("collections"));
        ({ client: otherClient } = await createAuthenticatedClient("collections_other"));
        const item = await client.request("/watchlist", {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/collection-test",
                retailer: "zara",
                title: "Collection test product",
                imageUrl: "https://example.com/product.jpg",
                currentPrice: 100,
                currency: "CAD",
                status: "active",
                extractionMode: "standard",
            }),
        });
        itemId = item.json.data.id;
    });

    test("requires authentication", async () => {
        const { ApiClient } = await import("./helpers/api-client");
        expect((await new ApiClient().request("/collections")).status).toBe(401);
    });

    test("validates names and enforces case-insensitive uniqueness", async () => {
        const invalid = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "   " }) });
        expect(invalid.status).toBe(400);

        const created = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "  Summer  " }) });
        expect(created.status).toBe(201);
        expect(created.json.data.name).toBe("Summer");

        const duplicate = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "summer" }) });
        expect(duplicate.status).toBe(409);
        expect(duplicate.json.error.code).toBe("CONFLICT");
    });

    test("lists summaries and supports idempotent membership", async () => {
        const created = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Desk" }) });
        const collectionId = created.json.data.id;

        for (let index = 0; index < 2; index++) {
            expect((await client.request(`/collections/${collectionId}/items/${itemId}`, { method: "PUT" })).status).toBe(200);
        }
        const listed = await client.request("/collections");
        const summary = listed.json.data.find((entry: { id: string }) => entry.id === collectionId);
        expect(summary.itemCount).toBe(1);
        expect(summary.itemPreviews[0].id).toBe(itemId);

        const detail = await client.request(`/collections/${collectionId}`);
        expect(detail.json.data.items.map((item: { id: string }) => item.id)).toContain(itemId);

        for (let index = 0; index < 2; index++) {
            expect((await client.request(`/collections/${collectionId}/items/${itemId}`, { method: "DELETE" })).status).toBe(200);
        }
        expect((await client.request(`/collections/${collectionId}`)).json.data.items).toHaveLength(0);
    });

    test("prevents cross-user collection and item access", async () => {
        const created = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Private" }) });
        const collectionId = created.json.data.id;
        expect((await otherClient.request(`/collections/${collectionId}`)).status).toBe(404);
        expect((await otherClient.request(`/collections/${collectionId}/items/${itemId}`, { method: "PUT" })).status).toBe(404);
    });

    test("deleting a watchlist item removes membership but preserves collection", async () => {
        const created = await client.request("/collections", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Persistent" }) });
        const collectionId = created.json.data.id;
        await client.request(`/collections/${collectionId}/items/${itemId}`, { method: "PUT" });
        await client.request(`/watchlist/${itemId}`, { method: "DELETE" });
        const detail = await client.request(`/collections/${collectionId}`);
        expect(detail.status).toBe(200);
        expect(detail.json.data.items).toHaveLength(0);
    });
});
