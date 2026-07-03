import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import type { ProductSource } from "../../src/integrations/contracts";
import { ZaraProductParser } from "../../src/integrations/zara/zara.parser";

const parser = new ZaraProductParser();

async function fixture(name: string): Promise<ProductSource> {
    const html = await readFile(
        new URL(`../fixtures/zara/${name}`, import.meta.url),
        "utf8"
    );

    return {
        requestedUrl:
            "https://www.zara.com/ca/en/requested-product-p01234567.html",
        finalUrl:
            "https://www.zara.com/ca/en/requested-product-p01234567.html",
        html,
    };
}

describe("ZaraProductParser", () => {
    test("extracts a regular product from JSON-LD", async () => {
        const preview = parser.parse(await fixture("regular-product.html"));

        expect(preview.title).toBe("Linen Shirt");
        expect(preview.currentPrice).toBe(59.9);
        expect(preview.currency).toBe("CAD");
        expect(preview.status).toBe("active");
        expect(preview.metadata?.productId).toBe("01234567");
    });

    test("extracts current and original sale prices", async () => {
        const preview = parser.parse(await fixture("sale-product.html"));

        expect(preview.currentPrice).toBe(69.9);
        expect(preview.salePrice).toBe(39.99);
        expect(preview.metadata?.originalPrice).toBe(69.9);
    });

    test("prefers Zara's rendered sale price over the old price", async () => {
        const preview = parser.parse(
            await fixture("rendered-sale-product.html")
        );

        expect(preview.currentPrice).toBe(79.9);
        expect(preview.salePrice).toBe(49.9);
        expect(preview.currency).toBe("CAD");
        expect(preview.metadata?.originalPrice).toBe(79.9);
    });

    test("returns unavailable products without requiring a price", async () => {
        const preview = parser.parse(
            await fixture("unavailable-product.html")
        );

        expect(preview.status).toBe("unavailable");
        expect(preview.currentPrice).toBeNull();
        expect(preview.salePrice).toBeNull();
        expect(preview.currency).toBeNull();
    });

    test("falls back to rendered metadata when structured data changes", async () => {
        const preview = parser.parse(await fixture("metadata-product.html"));

        expect(preview.title).toBe("Metadata Dress");
        expect(preview.currentPrice).toBe(89.95);
        expect(preview.imageUrl).toContain("metadata-dress.jpg");
    });

    test("extracts Zara's rendered money amount", async () => {
        const preview = parser.parse(
            await fixture("rendered-price-product.html")
        );

        expect(preview.currentPrice).toBe(35.9);
        expect(preview.currency).toBe("CAD");
    });

    test("extracts product name and image from rendered grid markup", async () => {
        const preview = parser.parse(
            await fixture("rendered-grid-product.html")
        );

        expect(preview.title).toBe("BOROSILICATE GLASS ICE CREAM BOWL");
        expect(preview.imageUrl).toBe(
            "https://static.zara.net/assets/public/db26/1b2d/3d4246de964f/aaefca643554/48214211990-a2/48214211990-a2.jpg?ts=1781103294930&w=822"
        );
        expect(preview.currentPrice).toBe(25.9);
        expect(preview.currency).toBe("CAD");
    });

    test("fails explicitly when required product data is absent", async () => {
        const source = await fixture("missing-product.html");

        expect(() => parser.parse(source)).toThrow();

        try {
            parser.parse(source);
        } catch (error) {
            expect((error as { code: string }).code).toBe(
                "PRODUCT_DATA_UNAVAILABLE"
            );
        }
    });
});
