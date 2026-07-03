export type ProductPreview = {
    url: string;
    retailer: string;
    title: string;
    imageUrl: string | null;
    currentPrice: number | null;
    salePrice: number | null;
    currency: string | null;
    status: "active" | "unavailable";
    metadata: Record<string, unknown> | null;
};

export type ProductSource = {
    requestedUrl: string;
    finalUrl: string;
    html: string;
};

export type ContentFetchOptions = {
    timeoutMs?: number;
    renderDelayMs?: number;
    dismissConsent?: boolean;
    allowedNavigationHosts?: readonly string[];
};

export interface ProductContentFetcher {
    fetch(url: URL, options?: ContentFetchOptions): Promise<ProductSource>;
    close?(): Promise<void>;
}

export interface ProductParser {
    parse(source: ProductSource): ProductPreview;
}

export interface ProductIntegration {
    readonly id: string;
    supports(url: URL): boolean;
    unsupportedReason?(url: URL): string | undefined;
    preview(url: URL): Promise<ProductPreview>;
    close?(): Promise<void>;
}
