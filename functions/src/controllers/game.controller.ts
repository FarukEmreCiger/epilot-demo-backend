import {CallableRequest, onCall, HttpsError} from "firebase-functions/v2/https";
import {IGameService} from "../interfaces/game.interface";
import {IValidationService} from "../interfaces/validation.interface";
import {DatabaseError, ValidationError, TaskCreationError} from "../types/errors.types";
import {
  MakeGuessRequest,
  ResolveGuessRequest,
  GetGuessHistoryRequest,
} from "../types/api.types";
import {config} from "../config/environment";
import { logger } from "firebase-functions/v1";

export class GameController {
  constructor(
    private readonly gameService: IGameService,
    private readonly validationService: IValidationService
  ) {}

  makeGuess = onCall(async (request: CallableRequest<MakeGuessRequest>) => {
    const {data, auth} = request;

    if (!auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to make a guess"
      );
    }

    try {
      this.validationService.validateMakeGuessRequest(data);

      const delaySeconds = parseInt(config.guessResolutionDelaySeconds, 10);
      const result = await this.gameService.makeGuess(
        auth.uid,
        data.prediction,
        delaySeconds
      );

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  });

  resolveGuess = onCall(async (request: CallableRequest<ResolveGuessRequest>) => {
    const {data} = request;

    try {
      const result = await this.gameService.resolveGuess(
        data.userId,
        data.guessId
      );

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  });

  getLeaderboard = onCall(async () => {
    try {
      return await this.gameService.getLeaderboard();
    } catch (error) {
      return this.handleError(error);
    }
  });

  getGuessHistory = onCall(async (request: CallableRequest<GetGuessHistoryRequest>) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to get guess history"
      );
    }

    try {
      const validatedData = this.validationService.validateGetGuessHistoryRequest(data);

      const result = await this.gameService.getGuessHistory(
        auth.uid,
        validatedData.lastKey ?? null,
        10
      );

      return result;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpsError("internal", "Guess history fetch failed");
      }
      return this.handleError(error);
    }
  });

  private handleError(error: unknown): never {
    logger.error(error);
    if (error instanceof HttpsError) {
      throw error;
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
}
