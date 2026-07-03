import type { ProductParser, ProductPreview, ProductSource } from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

export class TristanProductParser implements ProductParser {
    parse(source: ProductSource): ProductPreview {
        const canonicalUrl =
            this.findLink(source.html, "canonical") ?? source.finalUrl;
        const title =
            this.findProductTitle(source.html) ??
            this.findMeta(source.html, "property", "og:title");
        const imageUrl = this.findFirstProductImage(source.html);
        const prices = this.findProductHeaderPrices(source.html);
        const regularPrice = prices.regular ?? prices.sale;
        const hasSale =
            prices.regular !== null &&
            prices.sale !== null &&
            prices.regular > prices.sale;
        const currentPrice = hasSale ? prices.regular : regularPrice;
        const salePrice = hasSale ? prices.sale : null;

        if (!title || currentPrice === null) {
            throw new ProductDataUnavailableError(
                "Tristan product title or price was not available"
            );
        }

        return {
            url: canonicalUrl,
            retailer: "tristan",
            title,
            imageUrl,
            currentPrice,
            salePrice,
            currency: "CAD",
            status: "active",
            metadata: {
                source: "tristan",
                productId:
                    this.readQueryParameter(source.finalUrl, "variant") ?? null,
                originalPrice: hasSale ? prices.regular : null,
                extractedAt: new Date().toISOString(),
            },
        };
    }

    private findProductTitle(html: string) {
        const headerStart = html.search(/data-component=["']productHeader["']/i);
        if (headerStart < 0) return undefined;

        const heading = html
            .slice(headerStart, headerStart + 5_000)
            .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
        return heading ? this.cleanText(heading) : undefined;
    }

    private findFirstProductImage(html: string) {
        const productStart = html.search(/data-product-main-wrapper(?:=["']["'])?/i);
        if (productStart < 0) return null;

        const tag = html.slice(productStart).match(/<img\b[^>]*>/i)?.[0];
        const src = tag ? this.readAttribute(tag, "src") : undefined;
        if (!src) return null;

        try {
            return new URL(src, "https://www.tristanstyle.com").href;
        } catch {
            return null;
        }
    }

    private findProductHeaderPrices(html: string) {
        const headerStart = html.search(/data-component=["']productHeader["']/i);
        if (headerStart < 0) return { regular: null, sale: null };

        const header = html.slice(headerStart, headerStart + 5_000);
        let regular: number | null = null;
        let sale: number | null = null;

        for (const match of header.matchAll(/<span\b[^>]*>[\s\S]*?<\/span>/gi)) {
            const tag = match[0].slice(0, match[0].indexOf(">") + 1);
            const className = this.readAttribute(tag, "class") ?? "";
            const price = this.asNumber(this.cleanText(match[0]));
            if (price === null) continue;

            if (className.split(/\s+/).includes("text-tristan-red")) {
                sale ??= price;
            } else if (className.split(/\s+/).includes("line-through")) {
                regular ??= price;
            }

            if (regular !== null && sale !== null) break;
        }

        return { regular, sale };
    }

    private findMeta(
        html: string,
        attribute: "name" | "property",
        expectedValue: string
    ) {
        for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
            if (
                this.readAttribute(match[0], attribute)?.toLowerCase() ===
                expectedValue.toLowerCase()
            ) {
                return this.readAttribute(match[0], "content");
            }
        }
        return undefined;
    }

    private findLink(html: string, expectedRel: string) {
        for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
            if (
                this.readAttribute(match[0], "rel")?.toLowerCase() ===
                expectedRel.toLowerCase()
            ) {
                return this.readAttribute(match[0], "href");
            }
        }
        return undefined;
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

    private cleanText(value: string) {
        return this.decodeHtml(value.replace(/<[^>]*>/g, " "))
            .replace(/\s+/g, " ")
            .trim();
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

    private asNumber(value: string): number | null {
        const compact = value.replace(/[^\d.,-]/g, "");
        if (!compact) return null;

        const normalized = compact.includes(",") && !compact.includes(".")
            ? compact.replace(",", ".")
            : compact.replaceAll(",", "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
}
