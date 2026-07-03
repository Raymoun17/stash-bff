import type { Browser } from "playwright";
import { describe, expect, test } from "vitest";
import { PlaywrightProductFetcher } from "../../src/integrations/fetchers/playwright.fetcher";

type FakeBrowserOptions = {
    gotoError?: Error;
    html?: string;
    visibleText?: string;
    delayMs?: number;
};

function createFakeBrowser(options: FakeBrowserOptions = {}) {
    let activeContexts = 0;
    let maximumActiveContexts = 0;
    let closedContexts = 0;
    let browserCloseCalls = 0;

    const browser = {
        isConnected: () => true,
        close: async () => {
            browserCloseCalls += 1;
        },
        newContext: async () => {
            activeContexts += 1;
            maximumActiveContexts = Math.max(
                maximumActiveContexts,
                activeContexts
            );

            return {
                setDefaultTimeout: () => undefined,
                setDefaultNavigationTimeout: () => undefined,
                route: async () => undefined,
                newPage: async () => ({
                    goto: async () => {
                        if (options.gotoError) {
                            throw options.gotoError;
                        }

                        return { status: () => 200 };
                    },
                    waitForTimeout: async () => {
                        if (options.delayMs) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, options.delayMs)
                            );
                        }
                    },
                    title: async () => "Product",
                    content: async () =>
                        options.html ?? "<html><body>Product</body></html>",
                    url: () =>
                        "https://www.zara.com/ca/en/product-p01234567.html",
                    locator: () => ({
                        innerText: async () =>
                            options.visibleText ?? "Product details",
                        first: () => ({
                            isVisible: async () => false,
                            click: async () => undefined,
                        }),
                    }),
                }),
                close: async () => {
                    activeContexts -= 1;
                    closedContexts += 1;
                },
            };
        },
    } as unknown as Browser;

    return {
        browser,
        stats: () => ({
            activeContexts,
            maximumActiveContexts,
            closedContexts,
            browserCloseCalls,
        }),
    };
}

describe("PlaywrightProductFetcher", () => {
    test("detects access challenges", () => {
        expect(
            PlaywrightProductFetcher.isBlockedContent(
                "Verify you are human",
                "<html></html>"
            )
        ).toBe(true);
    });

    test("maps timeouts and closes the browser context", async () => {
        const fake = createFakeBrowser({
            gotoError: new Error("Navigation timeout exceeded"),
        });
        const fetcher = new PlaywrightProductFetcher({
            browserFactory: async () => fake.browser,
            renderDelayMs: 0,
        });

        await expect(
            fetcher.fetch(
                new URL(
                    "https://www.zara.com/ca/en/product-p01234567.html"
                )
            )
        ).rejects.toMatchObject({ code: "INTEGRATION_TIMEOUT" });
        expect(fake.stats().closedContexts).toBe(1);
    });

    test("rejects access challenges and closes the browser context", async () => {
        const fake = createFakeBrowser({
            visibleText: "Request blocked: CAPTCHA",
        });
        const fetcher = new PlaywrightProductFetcher({
            browserFactory: async () => fake.browser,
            renderDelayMs: 0,
        });

        await expect(
            fetcher.fetch(
                new URL(
                    "https://www.zara.com/ca/en/product-p01234567.html"
                )
            )
        ).rejects.toMatchObject({ code: "SOURCE_BLOCKED" });
        expect(fake.stats().closedContexts).toBe(1);
    });

    test("ignores anti-bot terms contained only in page scripts", async () => {
        const fake = createFakeBrowser({
            html: "<html><script>const captchaProvider = true</script><body>Product details</body></html>",
            visibleText: "Product details",
        });
        const fetcher = new PlaywrightProductFetcher({
            browserFactory: async () => fake.browser,
            renderDelayMs: 0,
        });

        await expect(
            fetcher.fetch(
                new URL(
                    "https://www.zara.com/ca/en/product-p01234567.html"
                )
            )
        ).resolves.toMatchObject({
            finalUrl:
                "https://www.zara.com/ca/en/product-p01234567.html",
        });
    });

    test("limits concurrent browser contexts", async () => {
        const fake = createFakeBrowser({ delayMs: 20 });
        const fetcher = new PlaywrightProductFetcher({
            browserFactory: async () => fake.browser,
            maxConcurrency: 2,
            renderDelayMs: 20,
        });
        const url = new URL(
            "https://www.zara.com/ca/en/product-p01234567.html"
        );

        await Promise.all([
            fetcher.fetch(url),
            fetcher.fetch(url),
            fetcher.fetch(url),
        ]);

        expect(fake.stats().maximumActiveContexts).toBe(2);
        expect(fake.stats().activeContexts).toBe(0);
        expect(fake.stats().closedContexts).toBe(3);
    });

    test("closes the shared Chromium instance", async () => {
        const fake = createFakeBrowser();
        const fetcher = new PlaywrightProductFetcher({
            browserFactory: async () => fake.browser,
        });

        await fetcher.fetch(
            new URL("https://www.zara.com/ca/en/product-p01234567.html")
        );
        await fetcher.close();

        expect(fake.stats().browserCloseCalls).toBe(1);
    });
});
