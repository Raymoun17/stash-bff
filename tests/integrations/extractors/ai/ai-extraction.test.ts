import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanProductHtml } from "../../../../src/integrations/extractors/ai/html-cleaner";
import { loadProductExtractionPrompt } from "../../../../src/integrations/extractors/ai/prompt-loader";

const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe("AI extraction helpers", () => {
    it("removes unsafe markup while preserving semantic and testing attributes", () => {
        const rawHtml = `
            <div onclick="alert('x')" data-testid="product-card" class="card" id="main" itemprop="name" role="button">
                <script type="application/ld+json">{"name":"Widget"}</script>
                <style>.hidden{display:none}</style>
                <span aria-label="Product name">Widget</span>
                <img src="/img.png" alt="Widget" data-src="https://cdn.test/img.png" />
            </div>
        `;

        const { html, jsonLd } = cleanProductHtml(rawHtml);

        expect(jsonLd).toEqual(["{"name":"Widget"}"]);
        expect(html).toContain("data-testid=\"product-card\"");
        expect(html).toContain("itemprop=\"name\"");
        expect(html).toContain("aria-label=\"Product name\"");
        expect(html).not.toContain("onclick");
        expect(html).not.toContain("<script");
        expect(html).not.toContain("<style");
    });

    it("loads a prompt from disk and rejects empty files", () => {
        const tempDir = mkdtempSync(join(tmpdir(), "prompt-loader-"));
        tempDirs.push(tempDir);
        const promptPath = join(tempDir, "product-extraction.md");
        writeFileSync(promptPath, "# product extraction\nReturn JSON only.");

        const cwd = process.cwd();
        process.chdir(tempDir);
        try {
            expect(loadProductExtractionPrompt("./product-extraction.md")).toContain("Return JSON only.");
        } finally {
            process.chdir(cwd);
        }

        writeFileSync(promptPath, "   \n\t");
        process.chdir(tempDir);
        try {
            expect(() => loadProductExtractionPrompt("./product-extraction.md")).toThrow(/empty/i);
        } finally {
            process.chdir(cwd);
        }
    });
});
