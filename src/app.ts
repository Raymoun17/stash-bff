import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { defaultProductIntegrationRegistry } from "./integrations/default.registry";
import {
    ProductIntegrationError,
    type ProductIntegrationErrorCode,
} from "./integrations/integration-error";
import type { ProductIntegrationRegistry } from "./integrations/integration.registry";
import { AppHTTPException } from "./lib/http-error";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import { createWatchlistRoutes } from "./routes/watchlist.routes";
import type { AppBindings } from "./types/hono";

export type AppDependencies = {
    productIntegrationRegistry?: ProductIntegrationRegistry;
};

const INTEGRATION_ERROR_STATUS: Record<
    ProductIntegrationErrorCode,
    422 | 502 | 504
> = {
    UNSUPPORTED_SOURCE: 422,
    PRODUCT_DATA_UNAVAILABLE: 422,
    SOURCE_BLOCKED: 502,
    UPSTREAM_FAILURE: 502,
    INTEGRATION_TIMEOUT: 504,
};

export function createApp(dependencies: AppDependencies = {}) {
    const app = new Hono<AppBindings>();
    const productIntegrationRegistry =
        dependencies.productIntegrationRegistry ??
        defaultProductIntegrationRegistry;

    app.use(
        "*",
        cors({
            origin: [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
                "http://127.0.0.1:3001", 
            ],
            credentials: true,
        })
    );

    app.route("/health", healthRoutes);
    app.route("/auth", authRoutes);
    app.route(
        "/watchlist",
        createWatchlistRoutes(productIntegrationRegistry)
    );

    app.notFound((c) => {
        return c.json(
            {
                error: {
                    code: "NOT_FOUND",
                    message: "Route not found",
                },
            },
            404
        );
    });

    app.onError((error, c) => {
        if (error instanceof ProductIntegrationError) {
            return c.json(
                {
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                },
                INTEGRATION_ERROR_STATUS[error.code]
            );
        }

        if (error instanceof HTTPException) {
            const status =
                error instanceof AppHTTPException
                    ? error.statusCode
                    : error.status;
            const code =
                error instanceof AppHTTPException
                    ? error.code
                    : "HTTP_ERROR";

            return c.json(
                {
                    error: {
                        code,
                        message: error.message,
                    },
                },
                status
            );
        }

        console.error(error);

        return c.json(
            {
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Something went wrong",
                },
            },
            500
        );
    });

    return app;
}

const app = createApp();

export default app;
