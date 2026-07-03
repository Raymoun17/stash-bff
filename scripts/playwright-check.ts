import { PlaywrightProductFetcher } from "../src/integrations/fetchers/playwright.fetcher";

const fetcher = new PlaywrightProductFetcher({ renderDelayMs: 0 });

try {
    const source = await fetcher.fetch(
        new URL(
            "data:text/html,<html><head><title>Runtime check</title></head><body>ok</body></html>"
        )
    );

    if (!source.html.includes("ok")) {
        throw new Error("Chromium returned unexpected content");
    }

    console.log("Playwright runtime is ready");
} finally {
    await fetcher.close();
}
