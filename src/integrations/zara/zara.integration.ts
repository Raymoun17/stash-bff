import type { ProductContentFetcher, ProductParser } from "../contracts";
import { ZaraProductExtractor } from "../extractors/deterministic/zara.extractor";
import { ProfileProductIntegration } from "../profile-product.integration";
import { createZaraProfile } from "../retailers/zara.profile";

/** @deprecated Use createZaraProfile with PreviewProductUseCase. */
export class ZaraIntegration extends ProfileProductIntegration {
    constructor(fetcher: ProductContentFetcher, parser: ProductParser) {
        super(createZaraProfile(new ZaraProductExtractor(parser)), fetcher);
    }
}
