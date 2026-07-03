import { describe, expect, test } from "vitest";
import type {
    ProductContentFetcher,
    ProductParser,
} from "../../src/integrations/contracts";
import { ProductIntegrationRegistry } from "../../src/integrations/integration.registry";
import { HmIntegration } from "../../src/integrations/hm/hm.integration";
import { RwcoIntegration } from "../../src/integrations/rwco/rwco.integration";
import { TristanIntegration } from "../../src/integrations/tristan/tristan.integration";
import { ZaraIntegration } from "../../src/integrations/zara/zara.integration";

const fetcher: ProductContentFetcher = {
    fetch: async () => {
        throw new Error("not used");
    },
};

const parser: ProductParser = {
    parse: () => {
        throw new Error("not used");
    },
};

describe("ProductIntegrationRegistry", () => {
    const zara = new ZaraIntegration(fetcher, parser);
    const hm = new HmIntegration(fetcher, parser);
    const tristan = new TristanIntegration(fetcher, parser);
    const rwco = new RwcoIntegration(fetcher, parser);
    const registry = new ProductIntegrationRegistry([zara, hm, tristan, rwco]);

    test("resolves valid Zara product URLs", () => {
        const result = registry.resolve(
            "https://www.zara.com/ca/en/linen-shirt-p01234567.html"
        );

        expect(result.integration.id).toBe("zara");
    });

    test("resolves Zara product selections on multi-item pages", () => {
        const result = registry.resolve(
            "https://www.zara.com/ca/en/home-kitchen-ice-cream-l18532.html?v1=2727525"
        );

        expect(result.integration.id).toBe("zara");
    });

    test("resolves valid H&M product URLs", () => {
        const result = registry.resolve(
            "https://www2.hm.com/en_ca/productpage.1283256008.html"
        );

        expect(result.integration.id).toBe("hm");
    });

    test("resolves valid Tristan product URLs", () => {
        const result = registry.resolve(
            "https://www.tristanstyle.com/products/open-back-maxi-dress?variant=47275822874786"
        );

        expect(result.integration.id).toBe("tristan");
    });

    test.each([
        "http://www.tristanstyle.com/products/open-back-maxi-dress",
        "https://www.tristanstyle.com.evil.example/products/open-back-maxi-dress",
        "https://www.tristanstyle.com/collections/dresses",
        "https://user:password@www.tristanstyle.com/products/open-back-maxi-dress",
    ])("rejects unsupported Tristan URL %s", (url) => {
        expect(() => registry.resolve(url)).toThrow();
    });

    test("resolves valid RW&CO. product URLs", () => {
        const result = registry.resolve(
            "https://www.rw-co.com/products/short-sleeve-knit-geo-print-shirt-494626?variant=62406934823283"
        );

        expect(result.integration.id).toBe("rwco");
    });

    test.each([
        "http://www.rw-co.com/products/short-sleeve-knit-geo-print-shirt-494626",
        "https://www.rw-co.com.evil.example/products/short-sleeve-knit-geo-print-shirt-494626",
        "https://www.rw-co.com/collections/men",
        "https://user:password@www.rw-co.com/products/short-sleeve-knit-geo-print-shirt-494626",
    ])("rejects unsupported RW&CO. URL %s", (url) => {
        expect(() => registry.resolve(url)).toThrow();
    });

    test.each([
        "http://www2.hm.com/en_ca/productpage.1283256008.html",
        "https://www2.hm.com.evil.example/en_ca/productpage.1283256008.html",
        "https://www2.hm.com/en_ca/women.html",
        "https://user:password@www2.hm.com/en_ca/productpage.1283256008.html",
    ])("rejects unsupported H&M URL %s", (url) => {
        expect(() => registry.resolve(url)).toThrow();
    });

    test.each([
        "http://www.zara.com/ca/en/linen-shirt-p01234567.html",
        "https://evilzara.com/ca/en/linen-shirt-p01234567.html",
        "https://zara.com.evil.example/ca/en/linen-shirt-p01234567.html",
        "https://user:password@www.zara.com/ca/en/linen-shirt-p01234567.html",
        "https://www.zara.com:8443/ca/en/linen-shirt-p01234567.html",
        "https://www.zara.com/ca/en/woman-new-in-l1180.html",
        "https://example.com/product/123",
    ])("rejects unsupported URL %s", (url) => {
        expect(() => registry.resolve(url)).toThrow();

        try {
            registry.resolve(url);
        } catch (error) {
            expect((error as { code: string }).code).toBe(
                "UNSUPPORTED_SOURCE"
            );
        }
    });

    test("rejects Zara pages without a product identifier", () => {
        expect(() =>
            registry.resolve(
                "https://www.zara.com/ca/en/home-kitchen-ice-cream-l18532.html"
            )
        ).toThrow(/does not contain a product identifier/i);
    });
});
