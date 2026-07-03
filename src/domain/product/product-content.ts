export type ProductContentSource = {
    requestedUrl: string;
    finalUrl: string;
    html: string;
    bodyText?: string;
    pageTitle?: string;
};

export type ContentFetchOptions = {
    timeoutMs?: number;
    renderDelayMs?: number;
    dismissConsent?: boolean;
    allowedNavigationHosts?: readonly string[];
    waitUntil?: "commit" | "domcontentloaded";
};

export interface ProductContentFetcher {
    fetch(
        url: URL,
        options?: ContentFetchOptions
    ): Promise<ProductContentSource>;
    close?(): Promise<void>;
}
