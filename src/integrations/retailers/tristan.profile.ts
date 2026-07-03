import type { ProductPreview } from "../../domain/product/product-preview";
import { TristanProductExtractor } from "../extractors/deterministic/tristan.extractor";
import type { ProductExtractor } from "../extractors/product-extractor";
import { ProductDataUnavailableError } from "../integration-error";
import { isSafeRetailerUrl, type RetailerProfile } from "./retailer-profile";

export const TRISTAN_HOSTS = [
    "tristanstyle.com",
    "www.tristanstyle.com",
] as const;
const TRISTAN_PRODUCT_PATH = /^\/products\/[a-z0-9][a-z0-9-]*\/?$/i;

export function isSupportedTristanUrl(url: URL) {
    return (
        isSafeRetailerUrl(url, TRISTAN_HOSTS) &&
        TRISTAN_PRODUCT_PATH.test(url.pathname)
    );
}

function normalizePreview(preview: ProductPreview, finalUrl: URL) {
    let canonicalUrl: URL;
    try {
        canonicalUrl = new URL(preview.url, finalUrl);
    } catch {
        throw new ProductDataUnavailableError(
            "Tristan returned an invalid canonical product URL"
        );
    }
    if (!isSupportedTristanUrl(canonicalUrl)) {
        throw new ProductDataUnavailableError(
            "Tristan returned an invalid canonical product URL"
        );
    }
    return { ...preview, url: canonicalUrl.href };
}

export function createTristanProfile(
    extractor: ProductExtractor = new TristanProductExtractor()
): RetailerProfile {
    return {
        id: "tristan",
        displayName: "Tristan",
        hosts: TRISTAN_HOSTS,
        supportsUrl: isSupportedTristanUrl,
        unsupportedReason(url) {
            return isSafeRetailerUrl(url, TRISTAN_HOSTS) &&
                !TRISTAN_PRODUCT_PATH.test(url.pathname)
                ? "This Tristan URL is not an individual product page."
                : undefined;
        },
        isValidFinalUrl: isSupportedTristanUrl,
        defaultCurrency: "CAD",
        fetchOptions: {
            waitUntil: "commit",
            renderDelayMs: 3_000,
        },
        extractor,
        normalizePreview,
    };
}
