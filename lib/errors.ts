/**
 * Custom Error Classes
 * Provides typed errors that map to appropriate HTTP status codes
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string) {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string) {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}

export class RateLimitError extends AppError {
    constructor(message = "Too many requests") {
        super(message, 429);
    }
}

export class InternalServerError extends AppError {
    constructor(message = "Internal server error") {
        super(message, 500, false);
    }
}
