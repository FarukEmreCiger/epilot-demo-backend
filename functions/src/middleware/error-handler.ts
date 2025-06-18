import { CallableRequest, onCall, HttpsError, onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import { DatabaseError, ValidationError, TaskCreationError, UnauthenticatedError } from "../types/errors.types";
import { logger } from "firebase-functions/v1";

export const onCallWithErrorHandling = <T = any, R = any>(
    handler: (request: CallableRequest<T>) => Promise<R>
) => {
    return onCall(async (request: CallableRequest<T>) => {
        try {
            return await handler(request);
        } catch (error) {
            handleError(error);
        }
    });
};

export const onRequestWithErrorHandling = (
    handler: (request: Request, response: Response) => Promise<void>
) => {
    return onRequest(async (request: Request, response: Response) => {
        try {
            await handler(request, response);
        } catch (error) {
            handleError(error);
        }
    });
};

function handleError(error: unknown): never {
    logger.error(error);

    if (error instanceof HttpsError) {
        throw error;
    }

    if (error instanceof UnauthenticatedError) {
        throw new HttpsError("unauthenticated", error.message);
    }

    if (error instanceof ValidationError) {
        throw new HttpsError("invalid-argument", error.message);
    }

    if (error instanceof DatabaseError) {
        throw new HttpsError("internal", "Database operation failed");
    }

    if (error instanceof TaskCreationError) {
        throw new HttpsError("internal", "Failed to schedule task");
    }

    throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Unknown error occurred"
    );
}
