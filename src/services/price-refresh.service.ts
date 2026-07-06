import type { PreviewProductExecutor } from "../application/product-preview/preview-product.use-case";
import { WatchlistRepository } from "../repositories/watchlist.repository";
import { NotificationRuleRepository } from "../repositories/notification-rule.repository";
import { NotificationEvaluator } from "./notification-evaluator.service";

export type RefreshSummary = { processed: number; succeeded: number; failed: number };

export class PriceRefreshService {
    constructor(private readonly previewProduct: PreviewProductExecutor) { }

    async refreshAll(batchSize: number, concurrency: number): Promise<RefreshSummary> {
        const summary = { processed: 0, succeeded: 0, failed: 0 };
        let afterId: string | undefined;
        while (true) {
            const items = await WatchlistRepository.findRefreshBatch(afterId, batchSize);
            if (items.length === 0) break;
            for (let offset = 0; offset < items.length; offset += concurrency) {
                await Promise.all(items.slice(offset, offset + concurrency).map(async (item) => {
                    summary.processed++;
                    const attemptedAt = new Date();
                    try {
                        const preview = await this.previewProduct.execute({
                            url: item.url,
                            extractionMode: item.extractionMode,
                        });
                        const effectivePrice = preview.salePrice ?? preview.currentPrice;
                        const rules = await NotificationRuleRepository.findEnabledByWatchlistItemId(item.id);
                        const evaluations = NotificationEvaluator.evaluate(
                            rules,
                            {
                                effectivePrice: item.salePrice === null
                                    ? item.currentPrice === null ? null : Number(item.currentPrice)
                                    : Number(item.salePrice),
                                currency: item.currency,
                                status: item.status,
                            },
                            { effectivePrice, currency: preview.currency, status: preview.status }
                        );
                        await WatchlistRepository.recordRefreshSuccess(
                            item.id, preview, effectivePrice, attemptedAt, evaluations
                        );
                        summary.succeeded++;
                    } catch (cause) {
                        const error = sanitizeRefreshError(cause);
                        await WatchlistRepository.recordRefreshFailure(item.id, error, attemptedAt);
                        summary.failed++;
                        console.warn("price refresh item failed", { itemId: item.id, error });
                    }
                }));
            }
            afterId = items.at(-1)!.id;
            if (items.length < batchSize) break;
        }
        return summary;
    }
}

function sanitizeRefreshError(cause: unknown) {
    const candidate = cause as { code?: unknown; message?: unknown };
    const code = typeof candidate?.code === "string" ? candidate.code : "UNKNOWN_ERROR";
    const message = typeof candidate?.message === "string" ? candidate.message : "Price refresh failed";
    return `${code}: ${message}`.replace(/[\r\n\t]+/g, " ").slice(0, 500);
}
