import type { ProductPreview } from "../../domain/product/product-preview";
import { HmProductExtractor } from "../extractors/deterministic/hm.extractor";
import type { ProductExtractor } from "../extractors/product-extractor";
import { ProductDataUnavailableError } from "../integration-error";
import { isSafeRetailerUrl, type RetailerProfile } from "./retailer-profile";

export const HM_HOSTS = ["www2.hm.com"] as const;
const HM_PRODUCT_PATH = /^\/[a-z]{2}_[a-z]{2}\/productpage\.(\d+)\.html$/i;

export function isSupportedHmUrl(url: URL) {
    return (
        isSafeRetailerUrl(url, HM_HOSTS) && HM_PRODUCT_PATH.test(url.pathname)
    );
}

function normalizePreview(preview: ProductPreview, finalUrl: URL) {
    let canonicalUrl: URL;
    try {
        canonicalUrl = new URL(preview.url, finalUrl);
    } catch {
        throw new ProductDataUnavailableError(
            "H&M returned an invalid canonical product URL"
        );
    }
    if (!isSupportedHmUrl(canonicalUrl)) {
        throw new ProductDataUnavailableError(
            "H&M returned an invalid canonical product URL"
        );
    }
    return { ...preview, url: canonicalUrl.href };
}

export function createHmProfile(
    extractor: ProductExtractor = new HmProductExtractor()
): RetailerProfile {
    return {
        id: "hm",
        displayName: "H&M",
        hosts: HM_HOSTS,
        supportsUrl: isSupportedHmUrl,
        unsupportedReason(url) {
            return isSafeRetailerUrl(url, HM_HOSTS) &&
                !HM_PRODUCT_PATH.test(url.pathname)
                ? "This H&M URL is not an individual product page."
                : undefined;
        },
        isValidFinalUrl: isSupportedHmUrl,
        defaultCurrency: "CAD",
        fetchOptions: { dismissConsent: true },
        extractor,
        normalizePreview,
    };
}
