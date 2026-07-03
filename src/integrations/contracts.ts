import type { ProductPreview } from "../domain/product/product-preview";

export type {
    ContentFetchOptions,
    ProductContentFetcher,
    ProductContentSource,
    ProductContentSource as ProductSource,
} from "../domain/product/product-content";
export type {
    ProductParser,
    ProductPreview,
} from "../domain/product/product-preview";
export type { ProductStatus } from "../domain/product/product-status";
export type { RetailerId } from "../domain/product/retailer-id";

export interface ProductIntegration {
    readonly id: string;
    supports(url: URL): boolean;
    unsupportedReason?(url: URL): string | undefined;
    preview(url: URL): Promise<ProductPreview>;
    close?(): Promise<void>;
}
