# stash-bff

Node.js, Hono, and Prisma backend for Stash. Retailer pages can be loaded by
the in-process Playwright fetcher or a private Camoufox scraper worker; product
parsing remains in this service.

## Development

Install dependencies and Chromium:

```sh
npm install
npm run playwright:install
npm run playwright:check
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

## Product integrations

`POST /watchlist/preview` supports public Zara and H&M product URLs. Retailer
integrations and TypeScript parsers remain in the BFF. Set `SCRAPER_MODE` to
choose how rendered HTML is fetched.

Local mode is the default and retains the existing lazily launched Chromium
browser with an isolated context per request:

```sh
SCRAPER_MODE=local
INTEGRATION_TIMEOUT_MS=20000
INTEGRATION_MAX_CONCURRENCY=2
INTEGRATION_MAX_HTML_BYTES=10000000
```

Remote mode calls the private FastAPI/Camoufox service in
`../scraper-worker`. Start that service on port 8000, then configure:

```sh
SCRAPER_MODE=remote
SCRAPER_WORKER_URL=http://localhost:8000
SCRAPER_SERVICE_TOKEN=dev-secret-change-me
INTEGRATION_TIMEOUT_MS=20000
INTEGRATION_MAX_HTML_BYTES=10000000
```

The service token must match the worker. Use a strong secret and a private
service network in production; do not expose the scraper worker publicly. If
remote mode is unavailable, switching `SCRAPER_MODE` back to `local` restores
the in-process Playwright path. There is no automatic per-request fallback,
which avoids silently doubling retailer traffic after worker failures.

Run the opt-in live smoke check with a public Zara product URL:

```sh
npm run test:integration:zara -- "https://www.zara.com/...-p01234567.html"
```

Normal tests use fixtures or mocked HTTP and do not contact retailers or launch
Chromium/Camoufox.

## Docker

For a complete deployment, use the repository-level `compose.yaml`. It runs
PostgreSQL migrations automatically, configures remote scraper mode, and keeps
the BFF private behind the UI's `/api` proxy.

The Dockerfile exposes separate `migrate` and `runtime` targets. A standalone
runtime image can still be built with:

```sh
docker build --target runtime -t stash-bff .
docker run --init --ipc=host --env-file .env -p 3000:3000 stash-bff
```

When proxying the BFF under a URL prefix, set `REFRESH_COOKIE_PATH` to the
browser-visible auth path. `REFRESH_COOKIE_SECURE` overrides the production
default and should be `true` for HTTPS.
