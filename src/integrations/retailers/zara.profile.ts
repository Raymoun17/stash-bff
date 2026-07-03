import type { ProductPreview } from "../../domain/product/product-preview";
import { ProductDataUnavailableError } from "../integration-error";
import { ZaraProductExtractor } from "../extractors/deterministic/zara.extractor";
import type { ProductExtractor } from "../extractors/product-extractor";
import { isSafeRetailerUrl, type RetailerProfile } from "./retailer-profile";

export const ZARA_HOSTS = ["zara.com", "www.zara.com"] as const;
const ZARA_PRODUCT_PATH = /-p\d+\.html$/i;
const ZARA_HTML_PATH = /\.html$/i;

function hasProductId(url: URL) {
    return /^\d+$/.test(url.searchParams.get("v1") ?? "");
}

export function isSupportedZaraUrl(url: URL) {
    return (
        isSafeRetailerUrl(url, ZARA_HOSTS) &&
        (ZARA_PRODUCT_PATH.test(url.pathname) ||
            (ZARA_HTML_PATH.test(url.pathname) && hasProductId(url)))
    );
}

function normalizePreview(preview: ProductPreview, finalUrl: URL) {
    let canonicalUrl: URL;

    try {
        canonicalUrl = new URL(preview.url, finalUrl);
    } catch {
        throw new ProductDataUnavailableError(
            "Zara returned an invalid canonical product URL"
        );
    }

    if (
        !isSafeRetailerUrl(canonicalUrl, ZARA_HOSTS) ||
        !ZARA_HTML_PATH.test(canonicalUrl.pathname)
    ) {
        throw new ProductDataUnavailableError(
            "Zara returned an invalid canonical product URL"
        );
    }

    return {
        ...preview,
        // Multi-item pages may publish a collection canonical URL without v1.
        url: (isSupportedZaraUrl(canonicalUrl) ? canonicalUrl : finalUrl).href,
    };
}

export function createZaraProfile(
    extractor: ProductExtractor = new ZaraProductExtractor()
): RetailerProfile {
    return {
        id: "zara",
        displayName: "Zara",
        hosts: ZARA_HOSTS,
        supportsUrl: isSupportedZaraUrl,
        unsupportedReason(url) {
            if (
                isSafeRetailerUrl(url, ZARA_HOSTS) &&
                ZARA_HTML_PATH.test(url.pathname) &&
                !ZARA_PRODUCT_PATH.test(url.pathname) &&
                !hasProductId(url)
            ) {
                return "This Zara URL does not contain a product identifier.";
            }
            return undefined;
        },
        isValidFinalUrl: isSupportedZaraUrl,
        fetchOptions: { dismissConsent: true },
        extractor,
        normalizePreview,
    };
}
