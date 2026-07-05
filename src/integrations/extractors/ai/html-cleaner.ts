import * as cheerio from "cheerio";

export type CleanedProductDocument = {
    html: string;
    jsonLd: string[];
};

const ALLOWED_ATTRIBUTES = new Set([
    "alt",
    "aria-label",
    "class",
    "content",
    "data-original",
    "data-src",
    "data-testid",
    "href",
    "id",
    "itemid",
    "itemprop",
    "itemscope",
    "itemtype",
    "name",
    "property",
    "rel",
    "role",
    "src",
    "srcset",
    "type",
]);

export function cleanProductHtml(rawHtml: string): CleanedProductDocument {
    const $ = cheerio.load(rawHtml);
    const jsonLd = $("script[type=\"application/ld+json\"]")
        .map((_index, element) => $(element).text().trim())
        .get()
        .filter(Boolean);

    $("script, style, noscript, template, svg").remove();
    $("*").contents().filter((_index, node) => node.type === "comment").remove();
    $("*").each((_index, element) => {
        for (const attribute of Object.keys($(element).attr() ?? {})) {
            if (
                attribute.toLowerCase().startsWith("on") ||
                !ALLOWED_ATTRIBUTES.has(attribute.toLowerCase())
            ) {
                $(element).removeAttr(attribute);
            }
        }
    });

    const html = $.html()
        .replace(/>\s+</g, "><")
        .replace(/[ \t\r\n]+/g, " ")
        .trim();
    return { html, jsonLd };
}
