import type { ProductPreview } from "../../domain/product/product-preview";
import { RwcoProductExtractor } from "../extractors/deterministic/rwco.extractor";
import type { ProductExtractor } from "../extractors/product-extractor";
import { ProductDataUnavailableError } from "../integration-error";
import { isSafeRetailerUrl, type RetailerProfile } from "./retailer-profile";

export const RWCO_HOSTS = ["rw-co.com", "www.rw-co.com"] as const;
const RWCO_PRODUCT_PATH = /^\/products\/[a-z0-9][a-z0-9-]*\/?$/i;

export function isSupportedRwcoUrl(url: URL) {
    return (
        isSafeRetailerUrl(url, RWCO_HOSTS) &&
        RWCO_PRODUCT_PATH.test(url.pathname)
    );
}

function normalizePreview(preview: ProductPreview, finalUrl: URL) {
    let canonicalUrl: URL;
    try {
        canonicalUrl = new URL(preview.url, finalUrl);
    } catch {
        throw new ProductDataUnavailableError(
            "RW&CO. returned an invalid canonical product URL"
        );
    }
    if (!isSupportedRwcoUrl(canonicalUrl)) {
        throw new ProductDataUnavailableError(
            "RW&CO. returned an invalid canonical product URL"
        );
    }
    return { ...preview, url: canonicalUrl.href };
}

export function createRwcoProfile(
    extractor: ProductExtractor = new RwcoProductExtractor()
): RetailerProfile {
    return {
        id: "rwco",
        displayName: "RW&CO.",
        hosts: RWCO_HOSTS,
        supportsUrl: isSupportedRwcoUrl,
        unsupportedReason(url) {
            return isSafeRetailerUrl(url, RWCO_HOSTS) &&
                !RWCO_PRODUCT_PATH.test(url.pathname)
                ? "This RW&CO. URL is not an individual product page."
                : undefined;
        },
        isValidFinalUrl: isSupportedRwcoUrl,
        defaultCurrency: "CAD",
        fetchOptions: {
            waitUntil: "commit",
            renderDelayMs: 3_000,
        },
        extractor,
        normalizePreview,
    };
}
