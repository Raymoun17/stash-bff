import type { ProductPreview } from "../../domain/product/product-preview";
import type { RetailerId } from "../../domain/product/retailer-id";

export type ProductExtractionInput = {
    retailerId: RetailerId;
    requestedUrl: string;
    finalUrl: string;
    html: string;
    bodyText?: string;
    pageTitle?: string;
};

export interface ProductExtractor {
    extract(
        input: ProductExtractionInput
    ): Promise<ProductPreview> | ProductPreview;
}
