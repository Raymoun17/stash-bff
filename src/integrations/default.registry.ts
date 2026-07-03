import { PreviewProductUseCase } from "../application/product-preview/preview-product.use-case";
import { RemoteProductFetcher } from "./fetchers/remote-product.fetcher";
import { HmIntegration } from "./hm/hm.integration";
import { HmProductParser } from "./hm/hm.parser";
import { ProductIntegrationRegistry } from "./integration.registry";
import { RwcoIntegration } from "./rwco/rwco.integration";
import { RwcoProductParser } from "./rwco/rwco.parser";
import { TristanIntegration } from "./tristan/tristan.integration";
import { TristanProductParser } from "./tristan/tristan.parser";
import { ZaraIntegration } from "./zara/zara.integration";
import { ZaraProductParser } from "./zara/zara.parser";
import { createDefaultRetailerRegistry } from "./retailers/retailer-registry";

const timeoutMs = Number(process.env.INTEGRATION_TIMEOUT_MS ?? 20_000);
const maxHtmlBytes = Number(
    process.env.INTEGRATION_MAX_HTML_BYTES ?? 10_000_000
);
const fetcher = new RemoteProductFetcher({
    endpoint: process.env.SCRAPER_WORKER_URL ?? "http://stash-scraper-worker:8000",
    token: process.env.SCRAPER_SERVICE_TOKEN ?? "",
    timeoutMs,
    maxHtmlBytes,
});

export const defaultRetailerRegistry = createDefaultRetailerRegistry();
export const defaultPreviewProductUseCase = new PreviewProductUseCase(
    defaultRetailerRegistry,
    fetcher
);

/** @deprecated Compatibility registry for scripts and older injected callers. */
export const defaultProductIntegrationRegistry =
    new ProductIntegrationRegistry([
        new ZaraIntegration(fetcher, new ZaraProductParser()),
        new HmIntegration(fetcher, new HmProductParser()),
        new TristanIntegration(fetcher, new TristanProductParser()),
        new RwcoIntegration(fetcher, new RwcoProductParser()),
    ]);
