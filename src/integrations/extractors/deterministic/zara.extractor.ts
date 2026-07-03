import type { ProductParser } from "../../../domain/product/product-preview";
import { ZaraProductParser } from "../../zara/zara.parser";
import type {
    ProductExtractionInput,
    ProductExtractor,
} from "../product-extractor";

export class ZaraProductExtractor implements ProductExtractor {
    constructor(
        private readonly parser: ProductParser = new ZaraProductParser()
    ) {}

    extract(input: ProductExtractionInput) {
        return this.parser.parse(input);
    }
}
