import "dotenv/config";
import { prisma } from "./db/prisma";
import { defaultPreviewProductUseCase } from "./integrations/default.registry";
import { PriceRefreshService } from "./services/price-refresh.service";

const intervalMs = positiveInt("PRICE_REFRESH_INTERVAL_MS", 86_400_000);
const batchSize = positiveInt("PRICE_REFRESH_BATCH_SIZE", 100);
const concurrency = positiveInt("PRICE_REFRESH_CONCURRENCY", 2);
const service = new PriceRefreshService(defaultPreviewProductUseCase);
let running = false;
let stopping = false;
let timer: NodeJS.Timeout | undefined;

async function runCycle() {
    if (running || stopping) return;
    running = true;
    const startedAt = Date.now();
    console.log("price refresh cycle started", { batchSize, concurrency });
    try {
        const summary = await service.refreshAll(batchSize, concurrency);
        console.log("price refresh cycle completed", { ...summary, durationMs: Date.now() - startedAt });
    } catch (error) {
        console.error("price refresh cycle failed", error);
    } finally {
        running = false;
    }
}

async function shutdown() {
    if (stopping) return;
    stopping = true;
    if (timer) clearInterval(timer);
    while (running) await new Promise((resolve) => setTimeout(resolve, 100));
    await Promise.allSettled([defaultPreviewProductUseCase.close(), prisma.$disconnect()]);
    process.exit(0);
}

function positiveInt(name: string, fallback: number) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
    return value;
}

console.log("price refresher started", { intervalMs, batchSize, concurrency });
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
await runCycle();
if (!stopping) timer = setInterval(() => void runCycle(), intervalMs);
