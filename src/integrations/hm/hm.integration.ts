import type { ProductContentFetcher, ProductParser } from "../contracts";
import { HmProductExtractor } from "../extractors/deterministic/hm.extractor";
import { ProfileProductIntegration } from "../profile-product.integration";
import { createHmProfile } from "../retailers/hm.profile";

/** @deprecated Use createHmProfile with PreviewProductUseCase. */
export class HmIntegration extends ProfileProductIntegration {
    constructor(fetcher: ProductContentFetcher, parser: ProductParser) {
        super(createHmProfile(new HmProductExtractor(parser)), fetcher);
    }
}
