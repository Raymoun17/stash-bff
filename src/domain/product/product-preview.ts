import type { ProductContentSource } from "./product-content";
import type { ProductStatus } from "./product-status";

export type ProductPreview = {
    url: string;
    retailer: string;
    title: string;
    imageUrl: string | null;
    currentPrice: number | null;
    salePrice: number | null;
    currency: string | null;
    status: ProductStatus;
    metadata: Record<string, unknown> | null;
};

/** Transitional parser contract retained while deterministic parsers migrate. */
export interface ProductParser {
    parse(source: ProductContentSource): ProductPreview;
}
