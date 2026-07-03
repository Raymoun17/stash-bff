import type {
    ContentFetchOptions,
    ProductContentFetcher,
    ProductSource,
} from "../contracts";
import {
    IntegrationTimeoutError,
    ProductDataUnavailableError,
    SourceBlockedError,
    UpstreamFailureError,
} from "../integration-error";

export type RemoteProductFetcherOptions = {
    endpoint: string;
    token: string;
    timeoutMs?: number;
    renderDelayMs?: number;
    maxHtmlBytes?: number;
    locale?: string;
    timezone?: string;
    requestTimeoutMs?: number;
    fetchImpl?: typeof fetch;
};

type WorkerErrorBody = {
    error?: {
        code?: unknown;
        message?: unknown;
    };
};

type WorkerSuccessBody = {
    requestedUrl?: unknown;
    finalUrl?: unknown;
    html?: unknown;
};

export class RemoteProductFetcher implements ProductContentFetcher {
    private readonly fetchUrl: string;
    private readonly token: string;
    private readonly timeoutMs: number;
    private readonly renderDelayMs: number;
    private readonly maxHtmlBytes: number;
    private readonly locale: string;
    private readonly timezone: string;
    private readonly requestTimeoutMs?: number;
    private readonly fetchImpl: typeof fetch;

    constructor(options: RemoteProductFetcherOptions) {
        this.fetchUrl = `${options.endpoint.replace(/\/+$/, "")}/fetch`;
        this.token = options.token;
        this.timeoutMs = options.timeoutMs ?? 20_000;
        this.renderDelayMs = options.renderDelayMs ?? 1_500;
        this.maxHtmlBytes = options.maxHtmlBytes ?? 10_000_000;
        this.locale = options.locale ?? "en-CA";
        this.timezone = options.timezone ?? "America/Toronto";
        this.requestTimeoutMs = options.requestTimeoutMs;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }

    async fetch(
        url: URL,
        options: ContentFetchOptions = {}
    ): Promise<ProductSource> {
        const timeoutMs = options.timeoutMs ?? this.timeoutMs;
        const waitAfterDomMs = options.renderDelayMs ?? this.renderDelayMs;
        const controller = new AbortController();
        const requestTimeoutMs =
            this.requestTimeoutMs ?? timeoutMs + waitAfterDomMs + 5_000;
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

        try {
            const response = await this.fetchImpl(this.fetchUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: url.href,
                    allowedHosts: options.allowedNavigationHosts ?? [],
                    timeoutMs,
                    waitAfterDomMs,
                    maxHtmlBytes: this.maxHtmlBytes,
                    locale: this.locale,
                    timezone: this.timezone,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const body = await readJson<WorkerErrorBody>(response);
                throw mapWorkerError(response.status, body);
            }

            const body = await readJson<WorkerSuccessBody>(response);

            if (
                typeof body?.requestedUrl !== "string" ||
                typeof body.finalUrl !== "string" ||
                typeof body.html !== "string"
            ) {
                throw new UpstreamFailureError(
                    "Scraper worker returned an invalid response"
                );
            }

            return {
                requestedUrl: body.requestedUrl,
                finalUrl: body.finalUrl,
                html: body.html,
            };
        } catch (error) {
            if (
                error instanceof IntegrationTimeoutError ||
                error instanceof ProductDataUnavailableError ||
                error instanceof SourceBlockedError ||
                error instanceof UpstreamFailureError
            ) {
                throw error;
            }

            if (
                controller.signal.aborted ||
                (error instanceof Error && error.name === "AbortError")
            ) {
                throw new IntegrationTimeoutError(
                    "Scraper worker request timed out"
                );
            }

            throw new UpstreamFailureError(
                "Failed to reach the scraper worker",
                error
            );
        } finally {
            clearTimeout(timeout);
        }
    }

    async close() {}
}

async function readJson<T>(response: Response): Promise<T | undefined> {
    try {
        return (await response.json()) as T;
    } catch {
        return undefined;
    }
}

function mapWorkerError(
    status: number,
    body: WorkerErrorBody | undefined
) {
    const code =
        typeof body?.error?.code === "string" ? body.error.code : undefined;
    const message =
        typeof body?.error?.message === "string"
            ? body.error.message
            : `Scraper worker returned HTTP ${status}`;

    switch (code) {
        case "SOURCE_BLOCKED":
            return new SourceBlockedError(message);
        case "INTEGRATION_TIMEOUT":
            return new IntegrationTimeoutError(message);
        case "HTML_TOO_LARGE":
        case "INVALID_FINAL_URL":
            return new ProductDataUnavailableError(message);
        case "UNAUTHORIZED":
            return new UpstreamFailureError(
                "Scraper worker rejected authentication"
            );
        case "UPSTREAM_FAILURE":
            return new UpstreamFailureError(message);
        default:
            return new UpstreamFailureError(message);
    }
}
