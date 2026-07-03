import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { errors, type Browser, type BrowserContext, type Page } from "playwright";
import type {
    ContentFetchOptions,
    ProductContentFetcher,
    ProductSource,
} from "../contracts";
import {
    IntegrationTimeoutError,
    ProductIntegrationError,
    SourceBlockedError,
    UpstreamFailureError,
} from "../integration-error";
import { ConcurrencyLimiter } from "./concurrency-limiter";

stealthChromium.use(StealthPlugin());

type BrowserFactory = () => Promise<Browser>;

export type PlaywrightFetcherOptions = {
    timeoutMs?: number;
    renderDelayMs?: number;
    maxConcurrency?: number;
    maxHtmlBytes?: number;
    browserFactory?: BrowserFactory;
};

const BLOCKED_CONTENT_PATTERNS = [
    /access denied/i,
    /verify (?:that )?you are human/i,
    /unusual traffic/i,
    /captcha/i,
    /request blocked/i,
];

export class PlaywrightProductFetcher implements ProductContentFetcher {
    private readonly timeoutMs: number;
    private readonly renderDelayMs: number;
    private readonly maxHtmlBytes: number;
    private readonly limiter: ConcurrencyLimiter;
    private readonly browserFactory: BrowserFactory;
    private browserPromise?: Promise<Browser>;

    constructor(options: PlaywrightFetcherOptions = {}) {
        this.timeoutMs =
            options.timeoutMs ??
            Number(process.env.INTEGRATION_TIMEOUT_MS ?? 20_000);
        this.renderDelayMs = options.renderDelayMs ?? 1_500;
        this.maxHtmlBytes =
            options.maxHtmlBytes ??
            Number(process.env.INTEGRATION_MAX_HTML_BYTES ?? 10_000_000);
        this.limiter = new ConcurrencyLimiter(
            options.maxConcurrency ??
                Number(process.env.INTEGRATION_MAX_CONCURRENCY ?? 2)
        );
        this.browserFactory =
            options.browserFactory ??
            (() =>
                stealthChromium.launch({ headless: true }) as Promise<Browser>);
    }

    fetch(url: URL, options: ContentFetchOptions = {}) {
        return this.limiter.run(() => this.fetchWithBrowser(url, options));
    }

    async close() {
        const browserPromise = this.browserPromise;
        this.browserPromise = undefined;

        if (!browserPromise) {
            return;
        }

        const browser = await browserPromise.catch(() => undefined);
        await browser?.close();
    }

    static isBlockedContent(title: string, visibleText: string) {
        const sample = `${title}\n${visibleText.slice(0, 50_000)}`;
        return BLOCKED_CONTENT_PATTERNS.some((pattern) => pattern.test(sample));
    }

    private async fetchWithBrowser(
        url: URL,
        options: ContentFetchOptions
    ): Promise<ProductSource> {
        const timeoutMs = options.timeoutMs ?? this.timeoutMs;
        let context: BrowserContext | undefined;

        try {
            const browser = await this.getBrowser();
            context = await browser.newContext({
                locale: "en-CA",
                timezoneId: "America/Toronto",
                viewport: {
                    width: 1365,
                    height: 900,
                },
                extraHTTPHeaders: {
                    "Accept-Language":
                        "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7",
                },
            });
            context.setDefaultTimeout(timeoutMs);
            context.setDefaultNavigationTimeout(timeoutMs);
            await this.installRequestPolicy(
                context,
                options.allowedNavigationHosts ?? []
            );

            const page = await context.newPage();
            const response = await page.goto(url.href, {
                waitUntil: "domcontentloaded",
                timeout: timeoutMs,
            });

            if (response?.status() === 403 || response?.status() === 429) {
                throw new SourceBlockedError(
                    `Product source returned HTTP ${response.status()}`
                );
            }

            if (response && response.status() >= 400) {
                throw new UpstreamFailureError(
                    `Product source returned HTTP ${response.status()}`
                );
            }

            if (options.dismissConsent) {
                await this.dismissConsent(page);
            }

            await page.waitForTimeout(
                options.renderDelayMs ?? this.renderDelayMs
            );

            const [title, html, visibleText] = await Promise.all([
                page.title(),
                page.content(),
                page.locator("body").innerText().catch(() => ""),
            ]);

            if (Buffer.byteLength(html, "utf8") > this.maxHtmlBytes) {
                throw new ProductIntegrationError(
                    "PRODUCT_DATA_UNAVAILABLE",
                    "Rendered product page exceeded the content size limit"
                );
            }

            if (PlaywrightProductFetcher.isBlockedContent(title, visibleText)) {
                throw new SourceBlockedError(
                    "The product source displayed an access challenge"
                );
            }

            return {
                requestedUrl: url.href,
                finalUrl: page.url(),
                html,
            };
        } catch (error) {
            if (error instanceof ProductIntegrationError) {
                throw error;
            }

            if (
                error instanceof errors.TimeoutError ||
                (error instanceof Error && /timeout/i.test(error.message))
            ) {
                throw new IntegrationTimeoutError();
            }

            throw new UpstreamFailureError(
                "Failed to load the product source",
                error
            );
        } finally {
            await context?.close().catch(() => undefined);
        }
    }

    private async getBrowser() {
        const existing = await this.browserPromise?.catch(() => undefined);

        if (existing?.isConnected()) {
            return existing;
        }

        this.browserPromise = this.browserFactory();

        try {
            return await this.browserPromise;
        } catch (error) {
            this.browserPromise = undefined;
            throw error;
        }
    }

    private installRequestPolicy(
        context: BrowserContext,
        allowedNavigationHosts: readonly string[]
    ) {
        return context.route("**/*", async (route) => {
            const request = route.request();
            const requestUrl = request.url();
            const isDisallowedNavigation =
                request.resourceType() === "document" &&
                allowedNavigationHosts.length > 0 &&
                !allowedNavigationHosts.includes(
                    new URL(requestUrl).hostname.toLowerCase()
                );

            if (isDisallowedNavigation || isPrivateNetworkUrl(requestUrl)) {
                await route.abort("blockedbyclient");
                return;
            }

            await route.continue();
        });
    }

    private async dismissConsent(page: Page) {
        const selectors = [
            "#onetrust-accept-btn-handler",
            "button[id*='accept']",
            "button:has-text('Accept all')",
            "button:has-text('Accept All')",
        ];

        for (const selector of selectors) {
            const button = page.locator(selector).first();

            if (await button.isVisible().catch(() => false)) {
                await button.click({ timeout: 1_000 }).catch(() => undefined);
                return;
            }
        }
    }
}

function isPrivateNetworkUrl(rawUrl: string) {
    let url: URL;

    try {
        url = new URL(rawUrl);
    } catch {
        return true;
    }

    if (["data:", "blob:"].includes(url.protocol)) {
        return false;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        return true;
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        !hostname.includes(".") ||
        hostname === "::1" ||
        hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        hostname.startsWith("fe80:")
    ) {
        return true;
    }

    const octets = hostname.split(".").map(Number);

    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
        return false;
    }

    return (
        octets[0] === 10 ||
        octets[0] === 127 ||
        (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        octets[0] === 0
    );
}
