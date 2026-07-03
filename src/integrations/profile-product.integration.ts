import { PreviewProductUseCase } from "../application/product-preview/preview-product.use-case";
import type { ProductContentFetcher } from "../domain/product/product-content";
import type { ProductIntegration } from "./contracts";
import { RetailerRegistry } from "./retailers/retailer-registry";
import type { RetailerProfile } from "./retailers/retailer-profile";

/**
 * Transitional adapter for callers still depending on ProductIntegration.
 * New preview code resolves profiles directly through PreviewProductUseCase.
 */
export class ProfileProductIntegration implements ProductIntegration {
    readonly id: string;
    private readonly previewProduct: PreviewProductUseCase;

    constructor(
        private readonly profile: RetailerProfile,
        private readonly fetcher: ProductContentFetcher
    ) {
        this.id = profile.id;
        this.previewProduct = new PreviewProductUseCase(
            new RetailerRegistry([profile]),
            fetcher
        );
    }

    supports(url: URL) {
        return this.profile.supportsUrl(url);
    }

    unsupportedReason(url: URL) {
        return this.profile.unsupportedReason?.(url);
    }

    preview(url: URL) {
        return this.previewProduct.execute({ url: url.href });
    }

    async close() {
        await this.fetcher.close?.();
    }
}
