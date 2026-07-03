import type { ProductContentFetcher, ProductParser } from "../contracts";
import { RwcoProductExtractor } from "../extractors/deterministic/rwco.extractor";
import { ProfileProductIntegration } from "../profile-product.integration";
import { createRwcoProfile } from "../retailers/rwco.profile";

/** @deprecated Use createRwcoProfile with PreviewProductUseCase. */
export class RwcoIntegration extends ProfileProductIntegration {
    constructor(fetcher: ProductContentFetcher, parser: ProductParser) {
        super(createRwcoProfile(new RwcoProductExtractor(parser)), fetcher);
    }
}
