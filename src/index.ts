import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app";
import { prisma } from "./db/prisma";
import { defaultPreviewProductUseCase } from "./integrations/default.registry";

const port = Number(process.env.PORT ?? 3000);

const server = serve(
    {
        fetch: app.fetch,
        port,
    },
    (info) => {
        console.log(`stash-bff listening on http://localhost:${info.port}`);
    }
);

let shuttingDown = false;

function shutdown() {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    server.close((serverError) => {
        void Promise.allSettled([
            defaultPreviewProductUseCase.close(),
            prisma.$disconnect(),
        ]).then(() => {
            if (serverError) {
                console.error(serverError);
                process.exit(1);
            }

            process.exit(0);
        });
    });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
