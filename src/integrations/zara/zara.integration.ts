import type {
    ProductContentFetcher,
    ProductIntegration,
    ProductParser,
} from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

const ZARA_HOSTNAMES = new Set(["zara.com", "www.zara.com"]);
const ZARA_PRODUCT_PATH = /-p\d+\.html$/i;
const ZARA_HTML_PATH = /\.html$/i;

function isSafeZaraUrl(url: URL) {
    return (
        url.protocol === "https:" &&
        ZARA_HOSTNAMES.has(url.hostname.toLowerCase()) &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443")
    );
}

function hasZaraProductId(url: URL) {
    return /^\d+$/.test(url.searchParams.get("v1") ?? "");
}

export class ZaraIntegration implements ProductIntegration {
    readonly id = "zara";

    constructor(
        private readonly fetcher: ProductContentFetcher,
        private readonly parser: ProductParser
    ) {}

    supports(url: URL) {
        return (
            isSafeZaraUrl(url) &&
            (ZARA_PRODUCT_PATH.test(url.pathname) ||
                (ZARA_HTML_PATH.test(url.pathname) && hasZaraProductId(url)))
        );
    }

    unsupportedReason(url: URL) {
        if (
            isSafeZaraUrl(url) &&
            ZARA_HTML_PATH.test(url.pathname) &&
            !ZARA_PRODUCT_PATH.test(url.pathname) &&
            !hasZaraProductId(url)
        ) {
            return "This Zara URL does not contain a product identifier.";
        }

        return undefined;
    }

    async preview(url: URL) {
        const source = await this.fetcher.fetch(url, {
            dismissConsent: true,
            allowedNavigationHosts: ["zara.com", "www.zara.com"],
        });
        const finalUrl = new URL(source.finalUrl);

        if (!this.supports(finalUrl)) {
            throw new ProductDataUnavailableError(
                "Zara redirected to a non-product page"
            );
        }

        const preview = this.parser.parse(source);
        const canonicalUrl = new URL(preview.url, finalUrl);

        if (
            !isSafeZaraUrl(canonicalUrl) ||
            !ZARA_HTML_PATH.test(canonicalUrl.pathname)
        ) {
            throw new ProductDataUnavailableError(
                "Zara returned an invalid canonical product URL"
            );
        }

        const productUrl = this.supports(canonicalUrl)
            ? canonicalUrl
            : finalUrl;

        return {
            ...preview,
            url: productUrl.href,
        };
    }

    async close() {
        await this.fetcher.close?.();
    }
}
