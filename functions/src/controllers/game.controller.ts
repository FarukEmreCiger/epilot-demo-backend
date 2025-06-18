import {CallableRequest} from "firebase-functions/v2/https";
import {Request, Response} from "express";
import {IGameService} from "../interfaces/game.interface";

import {
  MakeGuessRequest,
  ResolveGuessRequest,
  GetGuessHistoryRequest,
} from "../types/api.types";
import {config} from "../config/environment";
import {onCallWithErrorHandling, onRequestWithErrorHandling} from "../middleware/error-handler";
import { Validator } from "../utils/validator";

export class GameController {
  constructor(
    private readonly gameService: IGameService,
  ) {}

  makeGuess = onCallWithErrorHandling(async (request: CallableRequest<MakeGuessRequest>) => {
    const {data, auth} = request;

    Validator.validateAuth(auth);
    Validator.validateMakeGuessRequest(data);

    const delaySeconds = parseInt(config.guessResolutionDelaySeconds, 10);
    const result = await this.gameService.makeGuess(
      auth.uid,
      data.prediction,
      delaySeconds
    );

    return result;
  });

  resolveGuess = onRequestWithErrorHandling(async (request: Request, response: Response) => {
    const data = request.body.data as ResolveGuessRequest;

    const result = await this.gameService.resolveGuess(
      data.userId,
      data.guessId
    );
    
    response.json(result);
  });

  getLeaderboard = onCallWithErrorHandling(async (request: CallableRequest) => {
    const {auth} = request;

    Validator.validateAuth(auth);

    return await this.gameService.getLeaderboard();
  });

  getGuessHistory = onCallWithErrorHandling(async (request: CallableRequest<GetGuessHistoryRequest>) => {
    const {auth, data} = request;

    Validator.validateAuth(auth);

    const validatedData = Validator.validateGetGuessHistoryRequest(data);

    const result = await this.gameService.getGuessHistory(
      auth.uid,
      validatedData.lastKey ?? null,
      10
    );

    return result;
  });
}
