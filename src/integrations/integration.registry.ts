import type { ProductIntegration, ProductPreview } from "./contracts";
import { UnsupportedSourceError } from "./integration-error";

export class ProductIntegrationRegistry {
    constructor(private readonly integrations: readonly ProductIntegration[]) {}

    resolve(rawUrl: string) {
        let url: URL;

        try {
            url = new URL(rawUrl);
        } catch {
            throw new UnsupportedSourceError("Product URL is invalid");
        }

        const integration = this.integrations.find((candidate) =>
            candidate.supports(url)
        );

        if (!integration) {
            const reason = this.integrations
                .map((candidate) => candidate.unsupportedReason?.(url))
                .find((message): message is string => Boolean(message));

            if (reason) {
                throw new UnsupportedSourceError(reason);
            }

            throw new UnsupportedSourceError();
        }

        return { integration, url };
    }

    async preview(rawUrl: string): Promise<ProductPreview> {
        const { integration, url } = this.resolve(rawUrl);
        return integration.preview(url);
    }

    async close() {
        await Promise.all(
            this.integrations.map((integration) => integration.close?.())
        );
    }
}
