import { UnsupportedSourceError } from "../integration-error";
import { createHmProfile } from "./hm.profile";
import type { RetailerProfile } from "./retailer-profile";
import { createRwcoProfile } from "./rwco.profile";
import { createTristanProfile } from "./tristan.profile";
import { createZaraProfile } from "./zara.profile";

export class RetailerRegistry {
    constructor(private readonly profiles: readonly RetailerProfile[]) {}

    resolveKnown(url: URL) {
        return this.profiles.find((profile) => profile.supportsUrl(url));
    }

    resolve(rawUrl: string | URL) {
        let url: URL;
        try {
            url = typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl;
        } catch {
            throw new UnsupportedSourceError("Product URL is invalid");
        }

        const profile = this.resolveKnown(url);
        if (profile) return { profile, url };

        const reason = this.unsupportedReason(url);
        throw new UnsupportedSourceError(reason);
    }

    unsupportedReason(url: URL) {
        return (
            this.profiles
                .map((profile) => profile.unsupportedReason?.(url))
                .find((message): message is string => Boolean(message)) ??
            "This retailer is not supported yet."
        );
    }
}

export function createDefaultRetailerRegistry() {
    return new RetailerRegistry([
        createZaraProfile(),
        createHmProfile(),
        createTristanProfile(),
        createRwcoProfile(),
    ]);
}
