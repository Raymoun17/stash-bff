import { describe, expect, test, vi } from "vitest";
import { PreviewProductUseCase } from "../../src/application/product-preview/preview-product.use-case";
import type { ProductContentFetcher, ProductContentSource } from "../../src/domain/product/product-content";
import type { ProductPreview } from "../../src/domain/product/product-preview";
import type { ProductExtractor } from "../../src/integrations/extractors/product-extractor";
import { RetailerRegistry } from "../../src/integrations/retailers/retailer-registry";
import type { RetailerProfile } from "../../src/integrations/retailers/retailer-profile";
import { ProductDataUnavailableError } from "../../src/integrations/integration-error";

const requestedUrl = new URL("https://shop.example/products/example");
const preview: ProductPreview = {
    url: requestedUrl.href,
    retailer: "zara",
    title: "Example product",
    imageUrl: null,
    currentPrice: 25,
    salePrice: null,
    currency: "CAD",
    status: "active",
    metadata: null,
};

function createSubject(overrides: {
    finalUrl?: string;
    extracted?: ProductPreview;
    extractorError?: Error;
    // Strictly matching the functional signature
    aiIntegration?: { preview: (source: ProductContentSource, url: URL) => Promise<ProductPreview> };
} = {}) {
    const extractor: ProductExtractor = {
        extract: vi.fn(() => {
            if (overrides.extractorError) throw overrides.extractorError;
            return overrides.extracted ?? preview;
        }),
    };
    const profile: RetailerProfile = {
        id: "zara",
        displayName: "Example",
        hosts: ["shop.example"],
        supportsUrl: (url) =>
            url.protocol === "https:" &&
            url.hostname === "shop.example" &&
            url.pathname.startsWith("/products/"),
        isValidFinalUrl: (url) =>
            url.protocol === "https:" && url.hostname === "shop.example",
        fetchOptions: { renderDelayMs: 321 },
        extractor,
        normalizePreview: (value) => value,
    };
    const fetcher: ProductContentFetcher = {
        fetch: vi.fn(async (url) => ({
            requestedUrl: url.href,
            finalUrl: overrides.finalUrl ?? url.href,
            html: "<html>fixture</html>",
        })),
    };
    const subject = new PreviewProductUseCase(
        new RetailerRegistry([profile]),
        fetcher,
        overrides.aiIntegration as any
    );

    return { subject, fetcher, extractor };
}

describe("PreviewProductUseCase", () => {
    test("resolves a known retailer and orchestrates fetch, extract, and validation", async () => {
        const { subject, fetcher, extractor } = createSubject();

        await expect(subject.execute({ url: requestedUrl.href, extractionMode: "standard" })).resolves.toEqual(
            preview
        );
        expect(fetcher.fetch).toHaveBeenCalledWith(requestedUrl, {
            renderDelayMs: 321,
            allowedNavigationHosts: ["shop.example"],
        });
        expect(extractor.extract).toHaveBeenCalledWith({
            retailerId: "zara",
            requestedUrl: requestedUrl.href,
            finalUrl: requestedUrl.href,
            html: "<html>fixture</html>",
            bodyText: undefined,
            pageTitle: undefined,
        });
    });

    test("rejects unsupported URLs without fetching content when using standard mode", async () => {
        const { subject, fetcher } = createSubject();

        await expect(
            subject.execute({ url: "https://unsupported.example/product/1", extractionMode: "standard" })
        ).rejects.toMatchObject({ code: "UNSUPPORTED_SOURCE" });
        expect(fetcher.fetch).not.toHaveBeenCalled();
    });

    // OPTIMIZATION: Verify both AI modes trigger the fetch and pass context for unknown domains
    test.each(["ai_only", "ai_fallback"] as const)(
        "routes an unknown public retailer through generic AI extraction for mode %s",
        async (extractionMode) => {
            const { fetcher } = createSubject();
            const aiPreview = { ...preview, retailer: "colori.ca" };
            const aiIntegration = { preview: vi.fn(async () => aiPreview) };
            const subject = new PreviewProductUseCase(
                new RetailerRegistry([]), // Empty registry forces unknown domain logic
                fetcher,
                aiIntegration
            );
            const url = new URL(
                "https://colori.ca/en/collections/robes-et-combinaisons-jumpsuits-dresses"
            );

            await expect(
                subject.execute({ url: url.href, extractionMode })
            ).resolves.toEqual(aiPreview);

            // Assertion: Proves exactly 1 fetch occurs under PreviewProductUseCase control
            expect(fetcher.fetch).toHaveBeenCalledOnce();
            expect(fetcher.fetch).toHaveBeenCalledWith(url, {
                allowedNavigationHosts: ["colori.ca"],
                waitUntil: "commit",
                renderDelayMs: 3_000,
            });
            // Assertion: Proves pre-fetched data object is safely forwarded without double-fetching
            expect(aiIntegration.preview).toHaveBeenCalledWith(
                {
                    requestedUrl: url.href,
                    finalUrl: url.href,
                    html: "<html>fixture</html>",
                },
                url
            );
        }
    );

    test("rejects a final URL outside the retailer profile", async () => {
        const { subject, extractor } = createSubject({
            finalUrl: "https://evil.example/products/example",
        });

        await expect(subject.execute({ url: requestedUrl.href, extractionMode: "standard" })).rejects.toMatchObject(
            { code: "PRODUCT_DATA_UNAVAILABLE" }
        );
        expect(extractor.extract).not.toHaveBeenCalled();
    });

    test("rejects invalid normalized extractor output", async () => {
        const { subject } = createSubject({
            extracted: { ...preview, currentPrice: -1 },
        });

        await expect(subject.execute({ url: requestedUrl.href, extractionMode: "standard" })).rejects.toMatchObject(
            { code: "PRODUCT_DATA_UNAVAILABLE" }
        );
    });

    test.each(["standard", "ai_fallback"] as const)(
        "uses deterministic extraction for mode %s",
        async (extractionMode) => {
            const { subject, extractor } = createSubject();

            await subject.execute({
                url: requestedUrl.href,
                extractionMode,
            });

            expect(extractor.extract).toHaveBeenCalledOnce();
        }
    );

    test("reuses the native fetch when AI fallback extraction is required", async () => {
        const aiPreview = { ...preview, title: "AI product" };
        const aiIntegration = { preview: vi.fn(async () => aiPreview) };
        const { subject, fetcher } = createSubject({
            extractorError: new ProductDataUnavailableError("Native parse failed"),
            aiIntegration,
        });

        await expect(subject.execute({
            url: requestedUrl.href,
            extractionMode: "ai_fallback",
        })).resolves.toEqual(aiPreview);

        // Explicit Assertion: Only 1 total fetch executed across the entire fallback tree
        expect(fetcher.fetch).toHaveBeenCalledOnce();
        expect(aiIntegration.preview).toHaveBeenCalledWith(
            {
                requestedUrl: requestedUrl.href,
                finalUrl: requestedUrl.href,
                html: "<html>fixture</html>",
            },
            requestedUrl
        );
    });
});