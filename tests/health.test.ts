import { describe, expect, test } from "vitest";
import { ApiClient } from "./helpers/api-client";

describe("Health API", () => {
    test("GET /health returns service health", async () => {
        const { status, json } = await new ApiClient().request("/health");

        expect(status).toBe(200);
        expect(json.data.status).toBe("ok");
    });
});
