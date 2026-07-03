# stash-bff

Node.js, Hono, and Prisma backend for Stash. Retailer pages are loaded by the
private Camoufox scraper worker; product parsing remains in this service.

## Development

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

The API listens on `http://localhost:3000` by default. Set `PORT` to override
the port.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

## Product preview architecture

`POST /watchlist/preview` supports public Zara, H&M, Tristan, and RW&CO.
product URLs.
The route delegates preview work to `PreviewProductUseCase`: it resolves a
`RetailerProfile`, fetches rendered HTML through `ProductContentFetcher`, calls
the profile's deterministic `ProductExtractor`, and validates the normalized
`ProductPreview`. Profiles own URL/final-URL rules, navigation hosts, fetch
settings, and extractor selection. Existing TypeScript parsers remain behind
the deterministic extractors.

`WatchlistService` is separate from this pipeline and only coordinates
persisted create/list/get/delete operations with `WatchlistRepository`.
`extractionMode` accepts `standard`, `ai_fallback`, and `ai_only` for future UI
support. AI extraction is not implemented; both AI modes currently use the
same deterministic pipeline as `standard`.

Rendered HTML always comes from the private FastAPI/Camoufox service in
`../scraper-worker`.
Start that service on port 8000, then configure:

```sh
SCRAPER_WORKER_URL=http://scraper-worker:8000
SCRAPER_SERVICE_TOKEN=dev-secret-change-me
INTEGRATION_TIMEOUT_MS=20000
INTEGRATION_MAX_HTML_BYTES=10000000
```

The service token must match the worker. Use a strong secret and a private
service network in production; do not expose the scraper worker publicly.

Run the opt-in live smoke check with a public Zara product URL:

```sh
npm run test:integration:zara -- "https://www.zara.com/...-p01234567.html"
```

Normal tests use fixtures or mocked HTTP and do not contact retailers or launch
Camoufox.

## Docker

For a complete deployment, use the infrastructure repository at
[c:\Dev\Projects\stash-infra](c:\Dev\Projects\stash-infra) (or the equivalent clone of that repo). It runs
PostgreSQL migrations automatically, configures remote scraper mode, and keeps
the BFF private behind the UI's `/api` proxy.

The Dockerfile exposes separate `migrate` and `runtime` targets. A standalone
runtime image can still be built with:

```sh
docker build --target runtime -t stash-bff .
docker run --init --ipc=host --env-file .env -p 3000:3000 stash-bff
```

For local app-only development, the BFF can also be started directly with:

```sh
npm install
npm run dev
```

When proxying the BFF under a URL prefix, set `REFRESH_COOKIE_PATH` to the
browser-visible auth path. `REFRESH_COOKIE_SECURE` overrides the production
default and should be `true` for HTTPS.
