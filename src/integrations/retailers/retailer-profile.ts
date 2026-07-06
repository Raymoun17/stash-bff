import type { ContentFetchOptions } from "../../domain/product/product-content";
import type { ProductPreview } from "../../domain/product/product-preview";
import type { ProductExtractor } from "../extractors/product-extractor";

export type RetailerProfile = {
    id: string;
    displayName: string;
    hosts: readonly string[];
    supportsUrl(url: URL): boolean;
    unsupportedReason?(url: URL): string | undefined;
    isValidFinalUrl(url: URL): boolean;
    defaultCurrency?: string;
    fetchOptions?: Omit<ContentFetchOptions, "allowedNavigationHosts">;
    extractor: ProductExtractor;
    normalizePreview?(preview: ProductPreview, finalUrl: URL): ProductPreview;
};

export function isSafeRetailerUrl(url: URL, hosts: readonly string[]) {
    return (
        url.protocol === "https:" &&
        hosts.includes(url.hostname.toLowerCase()) &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443")
    );
}
