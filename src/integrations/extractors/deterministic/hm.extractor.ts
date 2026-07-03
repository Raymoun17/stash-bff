import type { ProductParser } from "../../../domain/product/product-preview";
import { HmProductParser } from "../../hm/hm.parser";
import type {
    ProductExtractionInput,
    ProductExtractor,
} from "../product-extractor";

export class HmProductExtractor implements ProductExtractor {
    constructor(private readonly parser: ProductParser = new HmProductParser()) {}

    extract(input: ProductExtractionInput) {
        return this.parser.parse(input);
    }
}
