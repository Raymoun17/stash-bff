import type { ProductParser } from "../../../domain/product/product-preview";
import { RwcoProductParser } from "../../rwco/rwco.parser";
import type {
    ProductExtractionInput,
    ProductExtractor,
} from "../product-extractor";

export class RwcoProductExtractor implements ProductExtractor {
    constructor(
        private readonly parser: ProductParser = new RwcoProductParser()
    ) {}

    extract(input: ProductExtractionInput) {
        return this.parser.parse(input);
    }
}
