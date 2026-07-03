import type { ProductParser } from "../../../domain/product/product-preview";
import { TristanProductParser } from "../../tristan/tristan.parser";
import type {
    ProductExtractionInput,
    ProductExtractor,
} from "../product-extractor";

export class TristanProductExtractor implements ProductExtractor {
    constructor(
        private readonly parser: ProductParser = new TristanProductParser()
    ) {}

    extract(input: ProductExtractionInput) {
        return this.parser.parse(input);
    }
}
