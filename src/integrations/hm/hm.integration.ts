import type {
    ProductContentFetcher,
    ProductIntegration,
    ProductParser,
} from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

const HM_HOSTNAMES = new Set(["www2.hm.com"]);
const HM_PRODUCT_PATH = /^\/[a-z]{2}_[a-z]{2}\/productpage\.(\d+)\.html$/i;

function isSafeHmUrl(url: URL) {
    return (
        url.protocol === "https:" &&
        HM_HOSTNAMES.has(url.hostname.toLowerCase()) &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443")
    );
}

export class HmIntegration implements ProductIntegration {
    readonly id = "hm";

    constructor(
        private readonly fetcher: ProductContentFetcher,
        private readonly parser: ProductParser
    ) {}

    supports(url: URL) {
        return isSafeHmUrl(url) && HM_PRODUCT_PATH.test(url.pathname);
    }

    unsupportedReason(url: URL) {
        if (isSafeHmUrl(url) && !HM_PRODUCT_PATH.test(url.pathname)) {
            return "This H&M URL is not an individual product page.";
        }

        return undefined;
    }

    async preview(url: URL) {
        const source = await this.fetcher.fetch(url, {
            dismissConsent: true,
            allowedNavigationHosts: ["www2.hm.com"],
        });
        const finalUrl = new URL(source.finalUrl);

        if (!this.supports(finalUrl)) {
            throw new ProductDataUnavailableError(
                "H&M redirected to a non-product page"
            );
        }

        const preview = this.parser.parse(source);
        const canonicalUrl = new URL(preview.url, finalUrl);

        if (!this.supports(canonicalUrl)) {
            throw new ProductDataUnavailableError(
                "H&M returned an invalid canonical product URL"
            );
        }

        return {
            ...preview,
            url: canonicalUrl.href,
        };
    }

    async close() {
        await this.fetcher.close?.();
    }
}
