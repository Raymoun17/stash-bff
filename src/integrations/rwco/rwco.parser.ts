import type { ProductParser, ProductPreview, ProductSource } from "../contracts";
import { ProductDataUnavailableError } from "../integration-error";

export class RwcoProductParser implements ProductParser {
    parse(source: ProductSource): ProductPreview {
        const canonicalUrl =
            this.findLink(source.html, "canonical") ?? source.finalUrl;
        const title =
            this.findProductTitle(source.html) ??
            this.findMeta(source.html, "property", "og:title");
        const imageUrl = this.findFirstSliderImage(source.html);
        const prices = this.findProductPrices(source.html);
        const hasSale =
            prices.original !== null &&
            prices.sale !== null &&
            prices.original > prices.sale;
        const currentPrice = hasSale
            ? prices.original
            : prices.regular ?? prices.sale;
        const salePrice = hasSale ? prices.sale : null;

        if (!title || currentPrice === null) {
            throw new ProductDataUnavailableError(
                "RW&CO. product title or price was not available"
            );
        }

        return {
            url: canonicalUrl,
            retailer: "rwco",
            title,
            imageUrl,
            currentPrice,
            salePrice,
            currency: "CAD",
            status: "active",
            metadata: {
                source: "rwco",
                productId:
                    this.readQueryParameter(source.finalUrl, "variant") ??
                    canonicalUrl.match(/-(\d+)\/?$/)?.[1] ??
                    null,
                originalPrice: hasSale ? prices.original : null,
                extractedAt: new Date().toISOString(),
            },
        };
    }

    private findProductTitle(html: string) {
        const titleStart = html.search(/class=["'][^"']*\bproduct__title\b/i);
        if (titleStart < 0) return undefined;

        const heading = html
            .slice(titleStart, titleStart + 3_000)
            .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
        return heading ? this.cleanText(heading) : undefined;
    }

    private findFirstSliderImage(html: string) {
        const slide = html.match(
            /<li\b(?=[^>]*class=["'][^"']*\bproduct__media-item\b)[^>]*>[\s\S]*?<\/li>/i
        )?.[0];
        const imageTag = slide?.match(/<img\b[^>]*>/i)?.[0];
        const src = imageTag ? this.readAttribute(imageTag, "src") : undefined;
        if (!src) return null;

        try {
            return new URL(src, "https://www.rw-co.com").href;
        } catch {
            return null;
        }
    }

    private findProductPrices(html: string) {
        const titleStart = html.search(/class=["'][^"']*\bproduct__title\b/i);
        const priceStart = html.indexOf(
            "price__container",
            titleStart >= 0 ? titleStart : 0
        );
        if (priceStart < 0) {
            return { regular: null, sale: null, original: null };
        }

        const priceMarkup = html.slice(priceStart, priceStart + 5_000);
        const regular = this.priceFromElement(
            priceMarkup,
            "span",
            "price-item--regular"
        );
        const sale = this.priceFromElement(
            priceMarkup,
            "span",
            "price-item--sale"
        );
        const original = this.priceFromElement(
            priceMarkup,
            "s",
            "price-item--regular"
        );

        return { regular, sale, original };
    }

    private priceFromElement(html: string, tagName: string, className: string) {
        const pattern = new RegExp(
            `<${tagName}\\b(?=[^>]*class=["'][^"']*\\b${className}\\b)[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
            "i"
        );
        const content = html.match(pattern)?.[1];
        return content ? this.asNumber(this.cleanText(content)) : null;
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
