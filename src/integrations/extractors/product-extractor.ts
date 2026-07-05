import type { ProductPreview } from "../../domain/product/product-preview";
export type ProductExtractionInput = {
    retailerId: string;
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
