import { UnauthenticatedError, ValidationError } from "../types/errors.types";
import { MakeGuessRequest, GetGuessHistoryRequest, Auth } from "../types/api.types";

export class Validator {
  static validateMakeGuessRequest(data: unknown):
    asserts data is MakeGuessRequest {
    if (!data || typeof data !== "object") {
      throw new ValidationError("Request data must be an object");
    }

    const request = data as Record<string, unknown>;

    if (!request.prediction) {
      throw new ValidationError("Prediction is required", "prediction");
    }

    if (request.prediction !== "up" && request.prediction !== "down") {
      throw new ValidationError(
        "Prediction must be either 'up' or 'down'",
        "prediction"
      );
    }
  }

  static validateGetGuessHistoryRequest(data: unknown):
    GetGuessHistoryRequest {
    if (!data || typeof data !== "object") {
      return { lastKey: null };
    }

    const request = data as Record<string, unknown>;
    return {
      lastKey: request.lastKey &&
        typeof request.lastKey === "string" ?
        request.lastKey :
        null,
    };
  }

  static validateUserId(userId: unknown): asserts userId is string {
    if (!userId || typeof userId !== "string") {
      throw new UnauthenticatedError("Valid userId is required");
    }
  }

  static validateAuth(auth: unknown): asserts auth is { uid: string } {
    if (!auth) {
      throw new UnauthenticatedError(
        "User must be authenticated to get guess history"
      );
    }
    const authData = auth as Auth;
    Validator.validateUserId(authData.uid);
  }
}
