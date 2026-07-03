import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppHTTPException extends HTTPException {
    // Explicitly add statusCode as a public property so app.onError can read it safely
    public readonly statusCode: ContentfulStatusCode;

    constructor(
        status: ContentfulStatusCode,
        readonly code: string,
        message: string
    ) {
        super(status, { message });
        this.statusCode = status;
        this.name = "AppHTTPException";
    }
}

export class BadRequestError extends AppHTTPException {
    constructor(message = "Bad request") {
        super(400, "BAD_REQUEST", message);
    }
}

export class UnauthorizedError extends AppHTTPException {
    constructor(message = "Unauthorized") {
        super(401, "UNAUTHORIZED", message);
    }
}

export class ConflictError extends AppHTTPException {
    constructor(message = "Conflict") {
        super(409, "CONFLICT", message);
    }
}

export class NotFoundError extends AppHTTPException {
    constructor(message = "Not found") {
        super(404, "NOT_FOUND", message);
    }
}