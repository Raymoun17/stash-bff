export type ProductPreviewErrorCode =
    | "UNSUPPORTED_SOURCE"
    | "PRODUCT_DATA_UNAVAILABLE"
    | "SOURCE_BLOCKED"
    | "UPSTREAM_FAILURE"
    | "INTEGRATION_TIMEOUT";

export class ProductPreviewError extends Error {
    constructor(
        readonly code: ProductPreviewErrorCode,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "ProductPreviewError";
    }
}
