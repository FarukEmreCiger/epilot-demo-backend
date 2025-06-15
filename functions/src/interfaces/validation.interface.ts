import {MakeGuessRequest, GetGuessHistoryRequest} from "../types/api.types";

export interface IValidationService {
  validatePrediction(prediction: unknown): asserts prediction is "up" | "down";

  validateMakeGuessRequest(data: unknown): asserts data is MakeGuessRequest;

  validateGetGuessHistoryRequest(data: unknown): GetGuessHistoryRequest;

  validateUserId(userId: unknown): asserts userId is string;

  validatePrice(price: unknown): asserts price is number;
}
