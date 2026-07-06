import type { ProductContentFetcher } from "../../domain/product/product-content";
import type { ProductPreview } from "../../domain/product/product-preview";
import {
    ProductDataUnavailableError,
    UnsupportedSourceError,
} from "../../integrations/integration-error";
import { aiProductExtractor } from "../../integrations/extractors/ai/ai-runtime";
import { AiProductIntegration, createAiProfile } from "../../integrations/extractors/ai/ai-product.integration";
import type { RetailerRegistry } from "../../integrations/retailers/retailer-registry";
import type { ExtractionMode } from "./extraction-mode";
import { validateProductPreview } from "./preview-product.validator";

export type PreviewProductInput = {
    url: string;
    extractionMode: ExtractionMode;
};

export interface PreviewProductExecutor {
    execute(input: PreviewProductInput): Promise<ProductPreview>;
}

export class PreviewProductUseCase implements PreviewProductExecutor {
    constructor(
        private readonly retailers: RetailerRegistry,
        private readonly fetcher: ProductContentFetcher,
        private readonly aiIntegration: Pick<AiProductIntegration, "preview"> = new AiProductIntegration(
            aiProductExtractor
        )
    ) {}

    async execute(input: PreviewProductInput): Promise<ProductPreview> {
        const mode = input.extractionMode;
        const requestedUrl = this.parseUrl(input.url);
        const profile = this.retailers.resolveKnown(requestedUrl);

        if (!profile) {
            if (mode === "ai_only" || mode === "ai_fallback") {
                const aiProfile = createAiProfile(requestedUrl);
                const source = await this.fetcher.fetch(requestedUrl, {
                    allowedNavigationHosts: aiProfile.hosts,
                    waitUntil: "commit",
                    renderDelayMs: 3_000,
                });
                return this.aiIntegration.preview(source, requestedUrl);
            }
            throw new UnsupportedSourceError(
                this.retailers.unsupportedReason(requestedUrl)
            );
        }

        const source = await this.fetcher.fetch(requestedUrl, {
            ...profile.fetchOptions,
            allowedNavigationHosts: profile.hosts,
        });

        let finalUrl: URL;
        try {
            finalUrl = new URL(source.finalUrl);
        } catch {
            throw new ProductDataUnavailableError(
                "The retailer returned an invalid final URL"
            );
        }

        if (!profile.isValidFinalUrl(finalUrl)) {
            throw new ProductDataUnavailableError(
                `${profile.displayName} redirected to a non-product page`
            );
        }

        let extracted: ProductPreview;
        try {
            extracted = mode === "ai_only"
                ? await this.aiIntegration.preview(source, requestedUrl)
                : await profile.extractor.extract({
                    retailerId: profile.id,
                    requestedUrl: source.requestedUrl,
                    finalUrl: source.finalUrl,
                    html: source.html,
                    bodyText: source.bodyText,
                    pageTitle: source.pageTitle,
                });
        } catch (error) {
            if (mode === "ai_fallback" && error instanceof ProductDataUnavailableError) {
                extracted = await this.aiIntegration.preview(source, requestedUrl);
            } else {
                throw error;
            }
        }
        const normalized =
            profile.normalizePreview?.(extracted, finalUrl) ?? extracted;

        return validateProductPreview(normalized, profile);
    }

    async close() {
        await this.fetcher.close?.();
    }

    private parseUrl(rawUrl: string) {
        try {
            return new URL(rawUrl);
        } catch {
            throw new UnsupportedSourceError("Product URL is invalid");
        }
    }
}
