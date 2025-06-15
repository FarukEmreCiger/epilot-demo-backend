import {ValidationError} from "../types/errors.types";
import {MakeGuessRequest, GetGuessHistoryRequest} from "../types/api.types";
import {IValidationService} from "../interfaces/validation.interface";
import {injectable} from "inversify";

@injectable()
export class ValidationService implements IValidationService {
  validatePrediction(prediction: unknown):
        asserts prediction is "up" | "down" {
    if (prediction !== "up" && prediction !== "down") {
      throw new ValidationError(
        "Prediction must be either 'up' or 'down'",
        "prediction"
      );
    }
  }

  validateMakeGuessRequest(data: unknown):
        asserts data is MakeGuessRequest {
    if (!data || typeof data !== "object") {
      throw new ValidationError("Request data must be an object");
    }

    const request = data as Record<string, unknown>;

    if (!request.prediction) {
      throw new ValidationError("Prediction is required", "prediction");
    }

    this.validatePrediction(request.prediction);
  }

  validateGetGuessHistoryRequest(data: unknown):
        GetGuessHistoryRequest {
    if (!data || typeof data !== "object") {
      return {lastKey: null};
    }

    const request = data as Record<string, unknown>;
    return {
      lastKey: request.lastKey &&
                typeof request.lastKey === "string" ?
        request.lastKey :
        null,
    };
  }

  validateUserId(userId: unknown): asserts userId is string {
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("Valid userId is required", "userId");
    }
  }

  validatePrice(price: unknown): asserts price is number {
    if (typeof price !== "number" || price <= 0) {
      throw new ValidationError("Price must be a positive finite number", "price");
    }
  }
}
