import type { ProductContentSource } from "../../../domain/product/product-content";
import type { ProductPreview } from "../../../domain/product/product-preview";
import { validateProductPreview } from "../../../application/product-preview/preview-product.validator";
import type { ProductExtractor } from "../product-extractor";
import { isPrivateLookingHostname } from "./gemini-product.extractor";
import {
    ProductDataUnavailableError,
    UnsupportedSourceError,
} from "../../integration-error";
import type { RetailerProfile } from "../../retailers/retailer-profile";

export class AiProductIntegration {
    constructor(private readonly extractor: ProductExtractor) {}

    async preview(
        source: ProductContentSource,
        url: URL
    ): Promise<ProductPreview> {
        const profile = createAiProfile(url);
        const finalUrl = parseFinalUrl(source.finalUrl);
        if (!profile.isValidFinalUrl(finalUrl)) {
            throw new ProductDataUnavailableError(
                "The retailer redirected to a different host"
            );
        }
        const preview = await this.extractor.extract({
            retailerId: profile.id,
            requestedUrl: source.requestedUrl,
            finalUrl: source.finalUrl,
            html: source.html,
            bodyText: source.bodyText,
            pageTitle: source.pageTitle,
        });
        return validateProductPreview(preview, profile);
    }
}

export function createAiProfile(url: URL): RetailerProfile {
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        (url.port && url.port !== "443") ||
        isPrivateLookingHostname(hostname)
    ) {
        throw new UnsupportedSourceError(
            "AI extraction requires a public HTTPS retailer URL"
        );
    }
    return {
        id: hostname,
        displayName: hostname,
        hosts: [hostname],
        supportsUrl: (candidate) => isSameSafeHost(candidate, hostname),
        isValidFinalUrl: (candidate) => isSameSafeHost(candidate, hostname),
        extractor: {
            extract: () => {
                throw new Error("AI profile extraction is owned by AiProductIntegration");
            },
        },
    };
}

function isSameSafeHost(url: URL, hostname: string) {
    return (
        url.protocol === "https:" &&
        url.hostname.toLowerCase().replace(/\.$/, "") === hostname &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443")
    );
}

function parseFinalUrl(rawUrl: string) {
    try {
        return new URL(rawUrl);
    } catch {
        throw new ProductDataUnavailableError(
            "The retailer returned an invalid final URL"
        );
    }
}
