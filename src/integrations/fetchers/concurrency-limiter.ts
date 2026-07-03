export class ConcurrencyLimiter {
    private activeCount = 0;
    private readonly queue: Array<() => void> = [];

    constructor(private readonly concurrency: number) {
        if (!Number.isInteger(concurrency) || concurrency < 1) {
            throw new Error("Concurrency must be a positive integer");
        }
    }

    async run<T>(operation: () => Promise<T>): Promise<T> {
        await this.acquire();

        try {
            return await operation();
        } finally {
            this.release();
        }
    }

    private acquire() {
        if (this.activeCount < this.concurrency) {
            this.activeCount += 1;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
        });
    }

    private release() {
        const next = this.queue.shift();

        if (next) {
            next();
            return;
        }

        this.activeCount -= 1;
    }
}
