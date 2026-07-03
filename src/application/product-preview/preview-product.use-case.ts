import type { ProductContentFetcher } from "../../domain/product/product-content";
import type { ProductPreview } from "../../domain/product/product-preview";
import {
    ProductDataUnavailableError,
    UnsupportedSourceError,
} from "../../integrations/integration-error";
import type { RetailerRegistry } from "../../integrations/retailers/retailer-registry";
import type { ExtractionMode } from "./extraction-mode";
import { validateProductPreview } from "./preview-product.validator";

export type PreviewProductInput = {
    url: string;
    extractionMode?: ExtractionMode;
};

export interface PreviewProductExecutor {
    execute(input: PreviewProductInput): Promise<ProductPreview>;
}

export class PreviewProductUseCase implements PreviewProductExecutor {
    constructor(
        private readonly retailers: RetailerRegistry,
        private readonly fetcher: ProductContentFetcher
    ) {}

    async execute(input: PreviewProductInput): Promise<ProductPreview> {
        const mode = input.extractionMode ?? "standard";
        const requestedUrl = this.parseUrl(input.url);
        const profile = this.retailers.resolveKnown(requestedUrl);

        if (!profile) {
            throw new UnsupportedSourceError(
                this.retailers.unsupportedReason(requestedUrl)
            );
        }

        // AI extraction is preparatory only. Until an AI extractor exists, both
        // AI modes intentionally use the deterministic standard pipeline.
        void mode;

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

        const extracted = await profile.extractor.extract({
            retailerId: profile.id,
            requestedUrl: source.requestedUrl,
            finalUrl: source.finalUrl,
            html: source.html,
            bodyText: source.bodyText,
            pageTitle: source.pageTitle,
        });
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
