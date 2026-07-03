import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import type { ProductSource } from "../../src/integrations/contracts";
import { HmProductParser } from "../../src/integrations/hm/hm.parser";

const parser = new HmProductParser();

async function fixture(name: string): Promise<ProductSource> {
    const html = await readFile(
        new URL(`../fixtures/hm/${name}`, import.meta.url),
        "utf8"
    );
    return {
        requestedUrl: "https://www2.hm.com/en_ca/productpage.1283256008.html",
        finalUrl: "https://www2.hm.com/en_ca/productpage.1283256008.html",
        html,
    };
}

describe("HmProductParser", () => {
    test("extracts sale and original prices from stable test IDs", async () => {
        const preview = parser.parse(await fixture("sale-product.html"));

        expect(preview.title).toBe("Smocked Strappy Dress");
        expect(preview.currentPrice).toBe(29.99);
        expect(preview.salePrice).toBe(18.99);
        expect(preview.currency).toBe("CAD");
        expect(preview.metadata?.originalPrice).toBe(29.99);
        expect(preview.metadata?.productId).toBe("1283256008");
    });

    test("extracts a regular rendered price", async () => {
        const preview = parser.parse(await fixture("regular-product.html"));

        expect(preview.currentPrice).toBe(24.99);
        expect(preview.salePrice).toBeNull();
        expect(preview.currency).toBe("CAD");
    });
});
