import defaultApp from "../../src/app";

type TestApp = {
    fetch(request: Request): Response | Promise<Response>;
};

export type ApiResponse = {
    status: number;
    json: any;
    headers: Headers;
};

export class ApiClient {
    private accessToken = "";
    private cookieHeader = "";

    constructor(private readonly app: TestApp = defaultApp) {}

    async request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
        const headers = new Headers(options.headers);

        if (this.accessToken) {
            headers.set("Authorization", `Bearer ${this.accessToken}`);
        }

        if (this.cookieHeader) {
            headers.set("Cookie", this.cookieHeader);
        }

        const response = await this.app.fetch(
            new Request(`http://localhost${path}`, {
                ...options,
                headers,
            })
        );
        const contentType = response.headers.get("content-type") ?? "";
        const json =
            response.status !== 204 && contentType.includes("application/json")
                ? await response.json()
                : null;

        this.updateCredentials(response.headers, json);

        return {
            status: response.status,
            json,
            headers: response.headers,
        };
    }

    private updateCredentials(headers: Headers, json: any) {
        const accessToken = json?.data?.accessToken;

        if (typeof accessToken === "string") {
            this.accessToken = accessToken;
        }

        const setCookie = headers.get("set-cookie");

        if (!setCookie) {
            return;
        }

        const cookiePair = setCookie.split(";", 1)[0];
        const [, value = ""] = cookiePair.split("=", 2);
        this.cookieHeader = value ? cookiePair : "";
    }
}

export function uniqueUsername(prefix = "test") {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    return `${prefix}_${suffix}`;
}

export async function createAuthenticatedClient(
    prefix = "test",
    app?: TestApp
) {
    const client = new ApiClient(app);
    const username = uniqueUsername(prefix);
    const password = "password123";
    const response = await client.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (response.status !== 201) {
        throw new Error(`Failed to create test user: HTTP ${response.status}`);
    }

    return { client, username, password };
}
