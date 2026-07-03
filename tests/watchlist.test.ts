import { beforeAll, describe, expect, test, vi } from "vitest";
import {
    type ApiClient,
    createAuthenticatedClient,
} from "./helpers/api-client";
import { createApp } from "../src/app";
import { UnsupportedSourceError } from "../src/integrations/integration-error";

const executePreview = vi.fn(async ({ url }: { url: string }) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "www.zara.com") {
        throw new UnsupportedSourceError();
    }

    return {
        url: parsedUrl.href,
        retailer: "zara",
        title: "Example Zara Product",
        imageUrl: "https://static.zara.net/example.jpg",
        currentPrice: 129.99,
        salePrice: null,
        currency: "CAD",
        status: "active",
        metadata: { productId: "12345678", source: "fixture" },
    } as const;
});

const app = createApp({
    previewProductUseCase: { execute: executePreview },
});

describe("Watchlist API", () => {
    let client: ApiClient;

    beforeAll(async () => {
        ({ client } = await createAuthenticatedClient("watchlist", app));
    });

    test("POST /watchlist/preview returns normalized product data", async () => {
        const { status, json } = await client.request("/watchlist/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/example-product-p01234567.html",
            }),
        });

        expect(status).toBe(200);
        expect(json.data.url).toContain("zara.com");
        expect(json.data.retailer).toBe("zara");
        expect(json.data.currentPrice).toBe(129.99);
        expect(executePreview).toHaveBeenCalledWith({
            url: "https://www.zara.com/ca/en/example-product-p01234567.html",
            extractionMode: "standard",
        });
    });

    test("POST /watchlist/preview accepts explicit standard extraction", async () => {
        const { status, json } = await client.request("/watchlist/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/example-product-p01234567.html",
                extractionMode: "standard",
            }),
        });

        expect(status).toBe(200);
        expect(json.data.retailer).toBe("zara");
    });

    test("POST /watchlist/preview rejects unsupported sources", async () => {
        const { status, json } = await client.request("/watchlist/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://example.com/product/123",
            }),
        });

        expect(status).toBe(422);
        expect(json.error.code).toBe("UNSUPPORTED_SOURCE");
    });

    test("supports the watchlist CRUD lifecycle", async () => {
        const created = await client.request("/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/example-product",
                retailer: "zara",
                title: "Example Zara Product",
                imageUrl: null,
                currentPrice: 129.99,
                salePrice: 99.99,
                currency: "CAD",
                metadata: { source: "bun-test" },
            }),
        });

        expect(created.status).toBe(201);
        expect(created.json.data.id).toBeDefined();
        expect(Number(created.json.data.salePrice)).toBeCloseTo(99.99);

        const itemId = created.json.data.id;
        const listed = await client.request("/watchlist");

        expect(listed.status).toBe(200);
        expect(Array.isArray(listed.json.data)).toBe(true);
        expect(listed.json.data.some((item: { id: string }) => item.id === itemId)).toBe(true);

        const fetched = await client.request(`/watchlist/${itemId}`);

        expect(fetched.status).toBe(200);
        expect(fetched.json.data.id).toBe(itemId);

        const deleted = await client.request(`/watchlist/${itemId}`, {
            method: "DELETE",
        });

        expect(deleted.status).toBe(200);
        expect(deleted.json.data.deleted).toBe(true);
    });
});
