export type ProductIntegrationErrorCode =
    | "UNSUPPORTED_SOURCE"
    | "PRODUCT_DATA_UNAVAILABLE"
    | "SOURCE_BLOCKED"
    | "UPSTREAM_FAILURE"
    | "INTEGRATION_TIMEOUT";

export class ProductIntegrationError extends Error {
    constructor(
        readonly code: ProductIntegrationErrorCode,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "ProductIntegrationError";
    }
}

export class UnsupportedSourceError extends ProductIntegrationError {
    constructor(message = "No product integration supports this URL") {
        super("UNSUPPORTED_SOURCE", message);
    }
}

export class ProductDataUnavailableError extends ProductIntegrationError {
    constructor(message = "Product data could not be extracted") {
        super("PRODUCT_DATA_UNAVAILABLE", message);
    }
}

export class SourceBlockedError extends ProductIntegrationError {
    constructor(message = "The product source blocked automated access") {
        super("SOURCE_BLOCKED", message);
    }
}

export class UpstreamFailureError extends ProductIntegrationError {
    constructor(message = "The product source could not be reached", cause?: unknown) {
        super("UPSTREAM_FAILURE", message, { cause });
    }
}

export class IntegrationTimeoutError extends ProductIntegrationError {
    constructor(message = "The product source timed out") {
        super("INTEGRATION_TIMEOUT", message);
    }
}
