import type { ProductPreview } from "../../domain/product/product-preview";
import { ProductDataUnavailableError } from "../../integrations/integration-error";
import type { RetailerProfile } from "../../integrations/retailers/retailer-profile";

export function validateProductPreview(
    preview: ProductPreview,
    profile: RetailerProfile
): ProductPreview {
    try {
        new URL(preview.url);
    } catch {
        invalid("Product canonical URL is invalid");
    }

    if (preview.retailer !== profile.id) {
        invalid("Extracted retailer does not match the resolved retailer");
    }

    if (preview.status !== "active" && preview.status !== "unavailable") {
        invalid("Product status is invalid");
    }

    validatePrice(preview.currentPrice, "currentPrice");
    validatePrice(preview.salePrice, "salePrice");

    if (preview.status === "active") {
        if (!preview.title?.trim()) {
            invalid("Active products must include a title");
        }
        if (preview.currentPrice === null && preview.salePrice === null) {
            invalid("Active products must include a price");
        }
    }

    if (
        (preview.currentPrice !== null || preview.salePrice !== null) &&
        !preview.currency?.trim()
    ) {
        invalid("Products with a price must include a currency");
    }

    return preview;
}

function validatePrice(value: number | null, field: string) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
        invalid(`${field} must be a non-negative number`);
    }
}

function invalid(message: string): never {
    throw new ProductDataUnavailableError(message);
}
