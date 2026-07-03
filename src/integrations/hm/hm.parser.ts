import type { ProductParser, ProductPreview, ProductSource } from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

type JsonRecord = Record<string, unknown>;

export class HmProductParser implements ProductParser {
    parse(source: ProductSource): ProductPreview {
        const product = this.findJsonLdProduct(source.html);
        const offer = this.selectOffer(product?.offers);
        const canonicalUrl =
            this.findLink(source.html, "canonical") ?? source.finalUrl;
        const title =
            this.asString(product?.name) ??
            this.findMeta(source.html, "property", "og:title") ??
            this.findMeta(source.html, "name", "twitter:title");
        const imageUrl =
            this.firstString(product?.image) ??
            this.findMeta(source.html, "property", "og:image") ??
            null;
        const renderedSalePrice = this.findTestPrice(source.html, "red-price");
        const regularPrice =
            this.findTestPrice(source.html, "white-price") ??
            this.findTestPrice(source.html, "price");
        const originalPrice = this.findTestPrice(
            source.html,
            "line-through-white-price"
        );
        const availability =
            this.asString(offer?.availability) ??
            this.findMeta(source.html, "property", "product:availability");
        const unavailable = /outofstock|out_of_stock|soldout|unavailable/i.test(
            availability ?? ""
        );
        const extractedPrice =
            renderedSalePrice ??
            regularPrice ??
            this.asNumber(offer?.price) ??
            this.asNumber(offer?.lowPrice) ??
            this.asNumber(
                this.findMeta(source.html, "property", "product:price:amount")
            ) ??
            null;
        const currency =
            this.asString(offer?.priceCurrency) ??
            this.findMeta(source.html, "property", "product:price:currency") ??
            this.currencyFromLocale(canonicalUrl);

        const structuredOriginalPrice = this.asNumber(offer?.highPrice);
        const originalPriceValue = originalPrice ?? structuredOriginalPrice;
        const hasSale =
            extractedPrice !== null &&
            originalPriceValue !== null &&
            originalPriceValue > extractedPrice;
        const currentPrice = hasSale ? originalPriceValue : extractedPrice;
        const salePrice = hasSale ? extractedPrice : null;

        if (!title || (!unavailable && (currentPrice === null || !currency))) {
            throw new ProductDataUnavailableError(
                "H&M product title, price, or currency was not available"
            );
        }

        return {
            url: canonicalUrl,
            retailer: "hm",
            title,
            imageUrl,
            currentPrice,
            salePrice,
            currency: currency?.toUpperCase() ?? null,
            status: unavailable ? "unavailable" : "active",
            metadata: {
                source: "hm",
                productId:
                    this.asString(product?.sku) ??
                    canonicalUrl.match(/productpage\.(\d+)\.html/i)?.[1] ??
                    null,
                availability: availability ?? null,
                originalPrice: originalPriceValue,
                extractedAt: new Date().toISOString(),
            },
        };
    }

    private findTestPrice(html: string, testId: string) {
        for (const match of html.matchAll(/<[^>]+data-testid=["'][^"']+["'][^>]*>[\s\S]*?<\/[^>]+>/gi)) {
            const element = match[0];

            if (this.readAttribute(element, "data-testid") === testId) {
                return this.asNumber(this.stripTags(element));
            }
        }

        return null;
    }

    private findJsonLdProduct(html: string): JsonRecord | undefined {
        for (const match of html.matchAll(
            /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        )) {
            try {
                const product = this.findProductNode(JSON.parse(match[1].trim()));

                if (product) {
                    return product;
                }
            } catch {
                // Try the next structured-data block.
            }
        }

        return undefined;
    }

    private findProductNode(value: unknown): JsonRecord | undefined {
        if (Array.isArray(value)) {
            for (const item of value) {
                const product = this.findProductNode(item);
                if (product) return product;
            }
            return undefined;
        }

        if (!this.isRecord(value)) return undefined;
        const type = value["@type"];

        if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
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

    private currencyFromLocale(url: string) {
        try {
            const locale = new URL(url).pathname.split("/")[1]?.toLowerCase();
            return locale === "en_ca" || locale === "fr_ca" ? "CAD" : undefined;
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

    private stripTags(value: string) {
        return this.decodeHtml(value.replace(/<[^>]*>/g, " "));
    }

    private decodeHtml(value: string) {
        return value
            .replaceAll("&amp;", "&")
            .replaceAll("&quot;", '"')
            .replaceAll("&#39;", "'")
            .replaceAll("&nbsp;", " ")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">");
    }

    private firstString(value: unknown): string | undefined {
        if (Array.isArray(value)) {
            return value.find((item): item is string => typeof item === "string");
        }
        if (this.isRecord(value)) return this.asString(value.url);
        return this.asString(value);
    }

    private asString(value: unknown) {
        return typeof value === "string" && value.trim()
            ? value.trim()
            : undefined;
    }

    private asNumber(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value !== "string") return null;

        const compact = value.replace(/[^\d.,-]/g, "");
        const lastComma = compact.lastIndexOf(",");
        const lastDot = compact.lastIndexOf(".");
        let normalized = compact;

        if (lastComma >= 0 && lastDot >= 0) {
            const decimalSeparator = lastComma > lastDot ? "," : ".";
            normalized = compact
                .replaceAll(decimalSeparator === "," ? "." : ",", "")
                .replace(decimalSeparator, ".");
        } else if (lastComma >= 0) {
            normalized =
                compact.length - lastComma - 1 === 2
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
