import { defaultPreviewProductUseCase } from "../src/integrations/default.registry";

const url = process.argv[2] ?? process.env.ZARA_SMOKE_URL;

if (!url) {
    throw new Error(
        "Provide a Zara product URL as an argument or set ZARA_SMOKE_URL"
    );
}

try {
    const preview = await defaultPreviewProductUseCase.execute({ url });
    console.log(JSON.stringify(preview, null, 2));
} finally {
    await defaultPreviewProductUseCase.close();
}
