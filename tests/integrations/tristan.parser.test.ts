import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import type { ProductSource } from "../../src/integrations/contracts";
import { TristanProductParser } from "../../src/integrations/tristan/tristan.parser";

const parser = new TristanProductParser();

async function fixture(name: string): Promise<ProductSource> {
    const html = await readFile(
        new URL(`../fixtures/tristan/${name}`, import.meta.url),
        "utf8"
    );
    const url =
        "https://www.tristanstyle.com/products/open-back-maxi-dress?variant=47275822874786";
    return { requestedUrl: url, finalUrl: url, html };
}

describe("TristanProductParser", () => {
    test("extracts the first image and sale pricing", async () => {
        const preview = parser.parse(await fixture("sale-product.html"));

        expect(preview.title).toBe("Open-back maxi dress");
        expect(preview.imageUrl).toBe(
            "https://www.tristanstyle.com/cdn/shop/files/FV090C2284Z_NO01_1.jpg?v=1779265923"
        );
        expect(preview.currentPrice).toBe(115);
        expect(preview.salePrice).toBe(92);
        expect(preview.currency).toBe("CAD");
        expect(preview.metadata?.productId).toBe("47275822874786");
    });

    test("treats a single displayed price as regular", async () => {
        const preview = parser.parse(await fixture("regular-product.html"));

        expect(preview.currentPrice).toBe(80);
        expect(preview.salePrice).toBeNull();
    });
});
