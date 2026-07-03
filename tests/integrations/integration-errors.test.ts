import { describe, expect, test } from "vitest";
import { createApp } from "../../src/app";
import type { ProductIntegration } from "../../src/integrations/contracts";
import {
    IntegrationTimeoutError,
    ProductDataUnavailableError,
    SourceBlockedError,
    UpstreamFailureError,
} from "../../src/integrations/integration-error";
import { ProductIntegrationRegistry } from "../../src/integrations/integration.registry";
import { TokenService } from "../../src/services/token.service";

describe("Integration API errors", () => {
    test.each([
        [new ProductDataUnavailableError(), 422, "PRODUCT_DATA_UNAVAILABLE"],
        [new SourceBlockedError(), 502, "SOURCE_BLOCKED"],
        [new UpstreamFailureError(), 502, "UPSTREAM_FAILURE"],
        [new IntegrationTimeoutError(), 504, "INTEGRATION_TIMEOUT"],
    ] as const)("maps %s to HTTP %s", async (error, status, code) => {
        const integration: ProductIntegration = {
            id: "failing",
            supports: () => true,
            preview: async () => {
                throw error;
            },
        };
        const app = createApp({
            productIntegrationRegistry: new ProductIntegrationRegistry([
                integration,
            ]),
        });
        const accessToken = await TokenService.createAccessToken({
            sub: "integration-test-user",
            username: "integration_test",
        });
        const response = await app.request("/watchlist/preview", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: "https://www.zara.com/ca/en/product-p01234567.html",
            }),
        });
        const json = (await response.json()) as {
            error: { code: string };
        };

        expect(response.status).toBe(status);
        expect(json.error.code).toBe(code);
    });
});
