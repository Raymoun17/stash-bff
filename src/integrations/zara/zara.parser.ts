import type { ProductParser, ProductPreview, ProductSource } from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

type JsonRecord = Record<string, unknown>;

export class ZaraProductParser implements ProductParser {
    parse(source: ProductSource): ProductPreview {
        const product = this.findJsonLdProduct(source.html);
        const canonicalUrl =
            this.findLink(source.html, "canonical") ?? source.finalUrl;
        const title =
            this.asString(product?.name) ??
            this.findRenderedProductTitle(source.html) ??
            this.findMeta(source.html, "property", "og:title") ??
            this.findMeta(source.html, "name", "twitter:title");
        const imageUrl =
            this.firstString(product?.image) ??
            this.findRenderedProductImage(source.html) ??
            this.findMeta(source.html, "property", "og:image") ??
            null;
        const offer = this.selectOffer(product?.offers);
        const renderedPrice = this.findRenderedCurrentPrice(source.html);
        const renderedOriginalPrice = this.findRenderedPriceByQualifier(
            source.html,
            "price-amount-old"
        );
        const availability =
            this.asString(offer?.availability) ??
            this.findMeta(source.html, "property", "product:availability");
        const unavailable = /outofstock|out_of_stock|soldout|unavailable/i.test(
            availability ?? ""
        );
        const extractedPrice =
            renderedPrice?.price ??
            this.asNumber(offer?.price) ??
            this.asNumber(offer?.lowPrice) ??
            this.asNumber(
                this.findMeta(source.html, "property", "product:price:amount")
            ) ??
            null;
        const currency =
            renderedPrice?.currency ??
            this.asString(offer?.priceCurrency) ??
            this.findMeta(source.html, "property", "product:price:currency") ??
            undefined;

        const originalPrice =
            renderedOriginalPrice?.price ??
            this.asNumber(offer?.highPrice) ??
            this.asNumber(
                this.findMeta(
                    source.html,
                    "property",
                    "product:original_price:amount"
                )
            );
        const hasSale =
            extractedPrice !== null &&
            originalPrice !== null &&
            originalPrice > extractedPrice;
        const currentPrice = hasSale ? originalPrice : extractedPrice;
        const salePrice = hasSale ? extractedPrice : null;

        if (!title || (!unavailable && (currentPrice === null || !currency))) {
            throw new ProductDataUnavailableError(
                "Zara product title, price, or currency was not available"
            );
        }

        const productId =
            this.asString(product?.sku) ??
            this.asString(product?.productID) ??
            canonicalUrl.match(/-p(\d+)\.html/i)?.[1] ??
            this.readQueryParameter(canonicalUrl, "v1") ??
            this.readQueryParameter(source.finalUrl, "v1") ??
            null;

        return {
            url: canonicalUrl,
            retailer: "zara",
            title,
            imageUrl,
            currentPrice,
            salePrice,
            currency: currency?.toUpperCase() ?? null,
            status: unavailable ? "unavailable" : "active",
            metadata: {
                source: "zara",
                productId,
                availability: availability ?? null,
                originalPrice,
                extractedAt: new Date().toISOString(),
            },
        };
    }

    private findJsonLdProduct(html: string): JsonRecord | undefined {
        const scripts = html.matchAll(
            /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        );

        for (const match of scripts) {
            try {
                const value: unknown = JSON.parse(match[1].trim());
                const product = this.findProductNode(value);

                if (product) {
                    return product;
                }
            } catch {
                // Ignore malformed structured data and try metadata fallbacks.
            }
        }

        return undefined;
    }

    private findProductNode(value: unknown): JsonRecord | undefined {
        if (Array.isArray(value)) {
            for (const item of value) {
                const product = this.findProductNode(item);

                if (product) {
                    return product;
                }
            }

            return undefined;
        }

        if (!this.isRecord(value)) {
            return undefined;
        }

        const type = value["@type"];

        if (
            type === "Product" ||
            (Array.isArray(type) && type.includes("Product"))
        ) {
            return value;
        }

        return this.findProductNode(value["@graph"]);
    }

    private selectOffer(value: unknown): JsonRecord | undefined {
        if (Array.isArray(value)) {
            return value.find((item) => this.isRecord(item)) as
                | JsonRecord
                | undefined;
        }

        return this.isRecord(value) ? value : undefined;
    }

    private findMeta(
        html: string,
        attribute: "name" | "property",
        expectedValue: string
    ) {
        for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
            const tag = match[0];

            if (
                this.readAttribute(tag, attribute)?.toLowerCase() ===
                expectedValue.toLowerCase()
            ) {
                return this.readAttribute(tag, "content");
            }
        }

        return undefined;
    }

    private findLink(html: string, expectedRel: string) {
        for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
            const tag = match[0];

            if (
                this.readAttribute(tag, "rel")?.toLowerCase() ===
                expectedRel.toLowerCase()
            ) {
                return this.readAttribute(tag, "href");
            }
        }

        return undefined;
    }

    private findRenderedCurrentPrice(html: string) {
        const qualifiedCurrentPrice = this.findRenderedPriceByQualifier(
            html,
            "price-amount-current"
        );

        if (qualifiedCurrentPrice) {
            return qualifiedCurrentPrice;
        }

        const htmlWithoutOldPrices = html.replace(
            /<del\b[^>]*>[\s\S]*?<\/del>/gi,
            ""
        );
        const firstMoneyAmount = htmlWithoutOldPrices.match(
            /<data\b([^>]*)>(?:(?!<\/data>)[\s\S])*?class=["'][^"']*\bmoney-amount__main\b[^"']*["']/i
        );

        if (!firstMoneyAmount) {
            return undefined;
        }

        const dataTag = `<data ${firstMoneyAmount[1]}>`;
        const price = this.asNumber(this.readAttribute(dataTag, "value"));
        const currency = this.readAttribute(dataTag, "data-currency");

        if (price === null || !currency) {
            return undefined;
        }

        return { price, currency };
    }

    private findRenderedPriceByQualifier(html: string, qualifier: string) {
        for (const match of html.matchAll(/<[^>]+\bdata-qa-qualifier\s*=\s*["'][^"']+["'][^>]*>/gi)) {
            if (this.readAttribute(match[0], "data-qa-qualifier") !== qualifier) {
                continue;
            }

            const elementStart = match.index;
            const nearbyMarkup = html.slice(elementStart, elementStart + 2_000);
            const dataTag = nearbyMarkup.match(/<data\b[^>]*>/i)?.[0];

            if (!dataTag) {
                continue;
            }

            const price = this.asNumber(this.readAttribute(dataTag, "value"));
            const currency = this.readAttribute(dataTag, "data-currency");

            if (price !== null && currency) {
                return { price, currency };
            }
        }

        return undefined;
    }

    private findRenderedProductTitle(html: string) {
        for (const match of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
            const tag = match[0].slice(0, match[0].indexOf(">") + 1);

            if (!this.hasClass(tag, "product-grid-product-info__name")) {
                continue;
            }

            const heading = match[1].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
            const title = heading
                ? this.decodeHtml(heading[1].replace(/<[^>]*>/g, " "))
                      .replace(/\s+/g, " ")
                      .trim()
                : "";

            if (title) {
                return title;
            }
        }

        return undefined;
    }

    private findRenderedProductImage(html: string) {
        for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
            const tag = match[0];
            const isProductImage =
                this.readAttribute(tag, "data-qa-qualifier") ===
                    "media-image" ||
                this.hasClass(tag, "media-image__image");

            if (isProductImage) {
                const src = this.readAttribute(tag, "src");

                if (src) {
                    return src;
                }
            }
        }

        return undefined;
    }

    private hasClass(tag: string, expectedClass: string) {
        return (
            this.readAttribute(tag, "class")
                ?.split(/\s+/)
                .includes(expectedClass) ?? false
        );
    }

    private readQueryParameter(url: string, name: string) {
        try {
            return new URL(url).searchParams.get(name) ?? undefined;
        } catch {
            return undefined;
        }
    }

    private readAttribute(tag: string, name: string) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const match = tag.match(
            new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, "i")
        );

        return match ? this.decodeHtml(match[2].trim()) : undefined;
    }

    private decodeHtml(value: string) {
        return value
            .replaceAll("&amp;", "&")
            .replaceAll("&quot;", '"')
            .replaceAll("&#39;", "'")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">");
    }

    private firstString(value: unknown): string | undefined {
        if (Array.isArray(value)) {
            return value.find((item): item is string => typeof item === "string");
        }

        if (this.isRecord(value)) {
            return this.asString(value.url);
        }

        return this.asString(value);
    }

    private asString(value: unknown) {
        return typeof value === "string" && value.trim()
            ? value.trim()
            : undefined;
    }

    private asNumber(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value !== "string") {
            return null;
        }

        const compact = value.replace(/[^\d.,-]/g, "");
        const lastComma = compact.lastIndexOf(",");
        const lastDot = compact.lastIndexOf(".");
        let normalized = compact;

        if (lastComma >= 0 && lastDot >= 0) {
            const decimalSeparator = lastComma > lastDot ? "," : ".";
            const thousandsSeparator = decimalSeparator === "," ? "." : ",";
            normalized = compact
                .replaceAll(thousandsSeparator, "")
                .replace(decimalSeparator, ".");
        } else if (lastComma >= 0) {
            const fractionLength = compact.length - lastComma - 1;
            normalized =
                fractionLength === 2
                    ? compact.replace(",", ".")
                    : compact.replaceAll(",", "");
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private isRecord(value: unknown): value is JsonRecord {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }
}
