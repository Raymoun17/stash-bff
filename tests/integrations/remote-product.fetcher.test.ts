import { describe, expect, test, vi } from "vitest";
import { RemoteProductFetcher } from "../../src/integrations/fetchers/remote-product.fetcher";

const productUrl = new URL(
    "https://www2.hm.com/en_ca/productpage.1234567890.html"
);

function createFetcher(fetchImpl: typeof fetch, requestTimeoutMs = 100) {
    return new RemoteProductFetcher({
        endpoint: "http://scraper-worker:8000/",
        token: "test-token",
        timeoutMs: 20_000,
        maxHtmlBytes: 10_000_000,
        requestTimeoutMs,
        fetchImpl,
    });
}

describe("RemoteProductFetcher", () => {
    test("maps a successful worker response to ProductSource", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            Response.json({
                requestedUrl: productUrl.href,
                finalUrl: productUrl.href,
                title: "Product",
                html: "<html><body>Product</body></html>",
                bodyText: "Product",
            })
        );
        const fetcher = createFetcher(fetchMock);

        await expect(
            fetcher.fetch(productUrl, {
                allowedNavigationHosts: ["www2.hm.com"],
            })
        ).resolves.toEqual({
            requestedUrl: productUrl.href,
            finalUrl: productUrl.href,
            html: "<html><body>Product</body></html>",
        });

        expect(fetchMock).toHaveBeenCalledWith(
            "http://scraper-worker:8000/fetch",
            expect.objectContaining({
                method: "POST",
                headers: {
                    Authorization: "Bearer test-token",
                    "Content-Type": "application/json",
                },
            })
        );
        const request = fetchMock.mock.calls[0]?.[1];
        expect(JSON.parse(String(request?.body))).toEqual({
            url: productUrl.href,
            allowedHosts: ["www2.hm.com"],
            timeoutMs: 20_000,
            waitAfterDomMs: 1_500,
            maxHtmlBytes: 10_000_000,
            locale: "en-CA",
            timezone: "America/Toronto",
        });
    });

    test("maps SOURCE_BLOCKED from the worker", async () => {
        const fetcher = createFetcher(
            vi.fn<typeof fetch>().mockResolvedValue(
                Response.json(
                    {
                        error: {
                            code: "SOURCE_BLOCKED",
                            message: "Retailer returned HTTP 403",
                        },
                    },
                    { status: 502 }
                )
            )
        );

        await expect(fetcher.fetch(productUrl)).rejects.toMatchObject({
            code: "SOURCE_BLOCKED",
            message: "Retailer returned HTTP 403",
        });
    });

    test("maps an aborted worker request to INTEGRATION_TIMEOUT", async () => {
        const hangingFetch = vi.fn<typeof fetch>((_input, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });
        });
        const fetcher = createFetcher(hangingFetch, 5);

        await expect(fetcher.fetch(productUrl)).rejects.toMatchObject({
            code: "INTEGRATION_TIMEOUT",
        });
    });

    test("maps unknown non-OK responses to UPSTREAM_FAILURE", async () => {
        const fetcher = createFetcher(
            vi.fn<typeof fetch>().mockResolvedValue(
                Response.json(
                    {
                        error: {
                            code: "UNEXPECTED_WORKER_ERROR",
                            message: "Worker failed",
                        },
                    },
                    { status: 500 }
                )
            )
        );

        await expect(fetcher.fetch(productUrl)).rejects.toMatchObject({
            code: "UPSTREAM_FAILURE",
            message: "Worker failed",
        });
    });
});
