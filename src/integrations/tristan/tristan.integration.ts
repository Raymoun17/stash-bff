import type { ProductContentFetcher, ProductParser } from "../contracts";
import { TristanProductExtractor } from "../extractors/deterministic/tristan.extractor";
import { ProfileProductIntegration } from "../profile-product.integration";
import { createTristanProfile } from "../retailers/tristan.profile";

/** @deprecated Use createTristanProfile with PreviewProductUseCase. */
export class TristanIntegration extends ProfileProductIntegration {
    constructor(fetcher: ProductContentFetcher, parser: ProductParser) {
        super(
            createTristanProfile(new TristanProductExtractor(parser)),
            fetcher
        );
    }
}
