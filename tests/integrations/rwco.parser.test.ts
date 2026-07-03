import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import type { ProductSource } from "../../src/integrations/contracts";
import { RwcoProductParser } from "../../src/integrations/rwco/rwco.parser";

const parser = new RwcoProductParser();

async function fixture(name: string): Promise<ProductSource> {
    const html = await readFile(
        new URL(`../fixtures/rwco/${name}`, import.meta.url),
        "utf8"
    );
    const url =
        "https://www.rw-co.com/products/short-sleeve-knit-geo-print-shirt-494626?variant=62406934823283";
    return { requestedUrl: url, finalUrl: url, html };
}

describe("RwcoProductParser", () => {
    test("extracts the first slider image and sale pricing", async () => {
        const preview = parser.parse(await fixture("sale-product.html"));

        expect(preview.title).toBe("Slim-Fit Short-Sleeve Jersey Shirt");
        expect(preview.imageUrl).toBe(
            "https://www.rw-co.com/cdn/shop/files/first-shirt.jpg?format=webp&width=990"
        );
        expect(preview.currentPrice).toBe(79.9);
        expect(preview.salePrice).toBe(55.93);
        expect(preview.currency).toBe("CAD");
        expect(preview.metadata?.productId).toBe("62406934823283");
    });

    test("treats a single price as regular", async () => {
        const preview = parser.parse(await fixture("regular-product.html"));

        expect(preview.currentPrice).toBe(69.9);
        expect(preview.salePrice).toBeNull();
    });
});
