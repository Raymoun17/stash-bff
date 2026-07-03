import { describe, expect, test } from "vitest";
import { createDefaultRetailerRegistry } from "../../src/integrations/retailers/retailer-registry";

describe("RetailerRegistry", () => {
    const registry = createDefaultRetailerRegistry();

    test.each([
        [
            "zara",
            "https://www.zara.com/ca/en/linen-shirt-p01234567.html",
        ],
        ["hm", "https://www2.hm.com/en_ca/productpage.1283256008.html"],
        [
            "tristan",
            "https://www.tristanstyle.com/products/open-back-maxi-dress?variant=1",
        ],
        [
            "rwco",
            "https://www.rw-co.com/products/short-sleeve-knit-shirt-494626?variant=1",
        ],
    ])("resolves %s product URLs", (id, url) => {
        expect(registry.resolve(url).profile.id).toBe(id);
    });

    test.each([
        "not a URL",
        "http://www.zara.com/ca/en/linen-shirt-p01234567.html",
        "https://www.zara.com.evil.example/ca/en/linen-shirt-p01234567.html",
        "https://user:password@www2.hm.com/en_ca/productpage.1283256008.html",
        "https://www.rw-co.com/collections/men",
        "https://example.com/products/example",
    ])("rejects malformed, hostile, or unsupported URL %s", (url) => {
        expect(() => registry.resolve(url)).toThrow();
    });
});
