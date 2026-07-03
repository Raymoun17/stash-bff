import { PlaywrightProductFetcher } from "./fetchers/playwright.fetcher";
import { RemoteProductFetcher } from "./fetchers/remote-product.fetcher";
import { HmIntegration } from "./hm/hm.integration";
import { HmProductParser } from "./hm/hm.parser";
import { ProductIntegrationRegistry } from "./integration.registry";
import { ZaraIntegration } from "./zara/zara.integration";
import { ZaraProductParser } from "./zara/zara.parser";

const timeoutMs = Number(process.env.INTEGRATION_TIMEOUT_MS ?? 20_000);
const maxHtmlBytes = Number(
    process.env.INTEGRATION_MAX_HTML_BYTES ?? 10_000_000
);
const useRemoteScraper = process.env.SCRAPER_MODE === "remote";

const fetcher = useRemoteScraper
    ? new RemoteProductFetcher({
          endpoint:
              process.env.SCRAPER_WORKER_URL ?? "http://localhost:8000",
          token: process.env.SCRAPER_SERVICE_TOKEN ?? "",
          timeoutMs,
          maxHtmlBytes,
      })
    : new PlaywrightProductFetcher({
          timeoutMs,
          maxConcurrency: Number(
              process.env.INTEGRATION_MAX_CONCURRENCY ?? 2
          ),
          maxHtmlBytes,
      });

export const defaultProductIntegrationRegistry =
    new ProductIntegrationRegistry([
        new ZaraIntegration(fetcher, new ZaraProductParser()),
        new HmIntegration(fetcher, new HmProductParser()),
    ]);
