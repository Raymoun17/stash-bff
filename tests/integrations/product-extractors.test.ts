import { describe, expect, test, vi } from "vitest";
import type { ProductParser, ProductPreview } from "../../src/integrations/contracts";
import { HmProductExtractor } from "../../src/integrations/extractors/deterministic/hm.extractor";
import { RwcoProductExtractor } from "../../src/integrations/extractors/deterministic/rwco.extractor";
import { TristanProductExtractor } from "../../src/integrations/extractors/deterministic/tristan.extractor";
import { ZaraProductExtractor } from "../../src/integrations/extractors/deterministic/zara.extractor";

const expected: ProductPreview = {
    url: "https://example.com/product",
    retailer: "zara",
    title: "Fixture",
    imageUrl: null,
    currentPrice: 10,
    salePrice: null,
    currency: "CAD",
    status: "active",
    metadata: null,
};

describe("deterministic product extractors", () => {
    test.each([
        ZaraProductExtractor,
        HmProductExtractor,
        TristanProductExtractor,
        RwcoProductExtractor,
    ])("%s delegates unchanged content to its existing parser", (Extractor) => {
        const parser: ProductParser = { parse: vi.fn(() => expected) };
        const extractor = new Extractor(parser);
        const input = {
            retailerId: "zara" as const,
            requestedUrl: "https://example.com/requested",
            finalUrl: "https://example.com/final",
            html: "<html>fixture</html>",
            bodyText: "fixture",
            pageTitle: "Fixture",
        };

        expect(extractor.extract(input)).toBe(expected);
        expect(parser.parse).toHaveBeenCalledWith(input);
    });
});
