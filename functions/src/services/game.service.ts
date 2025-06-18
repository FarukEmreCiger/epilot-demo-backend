import {Guess} from "../models/guess.model";
import {User} from "../models/user.model";
import {GameUtils} from "../core/gameLogic";
import {ValidationError} from "../types/errors.types";
import {
  MakeGuessResponse,
  ResolveGuessResponse,
  GetLeaderboardResponse,
  GetGuessHistoryResponse,
  DatabaseUpdatePayload,
} from "../types/api.types";
import {IGameService} from "../interfaces/game.interface";
import {injectable, inject} from "inversify";
import {TYPES} from "../interfaces/types";
import {IDatabaseService} from "../interfaces/database.interface";
import {ITaskService} from "../interfaces/task.interface";
import { logger } from "firebase-functions/v1";
import {ILockService} from "../interfaces/lock.interface";

@injectable()
export class GameService implements IGameService {
  constructor(
    @inject(TYPES.IDatabaseService) private readonly databaseService: IDatabaseService,
    @inject(TYPES.ITaskService) private readonly taskService: ITaskService,
    @inject(TYPES.ILockService) private readonly lockService: ILockService
  ) {}

  async makeGuess(
    userId: string,
    prediction: "up" | "down",
    delaySeconds: number
  ): Promise<MakeGuessResponse> {
    const lockKey = `user_guess_${userId}`;
    
    if (!(await this.lockService.acquireLock(lockKey))) {
      throw new ValidationError("Another guess operation is in progress");
    }

    try {
      const user = await this.databaseService.getUser(userId);

      if (user?.activeGuessId) {
        throw new ValidationError("User already has an active guess");
      }

      const currentPrice = await this.databaseService.getBtcPrice();
      const guessId = GameUtils.generateGuessId();

      const newGuess: Guess = {
        id: guessId,
        userId,
        prediction,
        initialPrice: currentPrice,
        createdAt: Date.now(),
        status: "pending",
        resolvedPrice: null,
        resolvedAt: null,
        result: null,
        guessResolveDelay: delaySeconds,
      };

      const updates: DatabaseUpdatePayload = {
        [`guesses/${userId}/${guessId}`]: newGuess,
      };

      if (!user) {
        const newUser: User = {
          uid: userId,
          score: 0,
          activeGuessId: guessId,
        };
        updates[`users/${userId}`] = newUser;
      } else {
        updates[`users/${userId}/activeGuessId`] = guessId;
      }

      await this.taskService.createResolveGuessTask(userId, guessId, delaySeconds);
      await this.databaseService.atomicUpdate(updates);

      return {
        success: true,
        guessId,
        initialPrice: currentPrice,
        message: "Guess successfully created",
      };
    } finally {
      await this.lockService.releaseLock(lockKey);
    }
  }

  /*
   This is an internal function that is
   called by the task service to resolve a guess.
   It is not exposed to the public.
  */
  async resolveGuess(userId: string, guessId: string): Promise<ResolveGuessResponse> {
    logger.info("resolveGuess", userId, guessId);
    
    const lockKey = `resolve_guess_${userId}_${guessId}`;
    
    if (!(await this.lockService.acquireLock(lockKey))) {
      return {
        success: false,
        message: "Guess resolution already in progress",
      };
    }

    try {
      const guess = await this.databaseService.getGuess(userId, guessId);
      const userScore = await this.databaseService.getUserScore(userId);

      if (!guess) {
        return {
          success: false,
          message: "Guess not found",
        };
      }

      if (guess.status !== "pending") {
        return {
          success: false,
          message: "Guess already resolved",
        };
      }

      if (guess.createdAt + (guess.guessResolveDelay ?? 0) * 1000 >= Date.now()) {
        throw new ValidationError("Guess resolution time hasn't passed yet");
      }

      const currentPrice = await this.databaseService.getBtcPrice();
      let {result, scoreChange} = GameUtils.determineGuessResult(
        guess.prediction,
        guess.initialPrice,
        currentPrice
      );

      if (userScore + scoreChange < 0) {
        scoreChange = 0;
      }

      const updates: DatabaseUpdatePayload = {
        [`guesses/${userId}/${guessId}/status`]: "resolved",
        [`guesses/${userId}/${guessId}/resolvedPrice`]: currentPrice,
        [`guesses/${userId}/${guessId}/resolvedAt`]: Date.now(),
        [`guesses/${userId}/${guessId}/result`]: result,
        [`users/${userId}/score`]: userScore + scoreChange,
        [`users/${userId}/activeGuessId`]: null,
      };

      await this.databaseService.atomicUpdate(updates);

      return {
        success: true,
        message: "Guess resolved successfully",
        result,
        scoreChange,
        resolvedPrice: currentPrice,
      };
    } finally {
      await this.lockService. releaseLock(lockKey);
    }
  }

  async getLeaderboard(limit = 10): Promise<GetLeaderboardResponse> {
    const users = await this.databaseService.getLeaderboard(limit);

    return {
      success: true,
      leaderboard: users.map((user) => ({
        uid: user.uid,
        score: user.score,
      })),
    };
  }

  async getGuessHistory(
    userId: string,
    lastKey: string | null,
    pageSize = 10
  ): Promise<GetGuessHistoryResponse> {
    const guesses = await this.databaseService.getGuessHistory(userId, lastKey, pageSize);

    const hasNextPage = guesses.length > pageSize;
    if (hasNextPage) {
      guesses.pop();
    }

    return {
      success: true,
      guesses: guesses.map((guess) => ({
        id: guess.id,
        userId: guess.userId,
        prediction: guess.prediction,
        initialPrice: guess.initialPrice,
        createdAt: guess.createdAt,
        status: guess.status,
        resolvedPrice: guess.resolvedPrice,
        resolvedAt: guess.resolvedAt,
        result: guess.result,
      })),
      hasNextPage,
      nextPageKey: hasNextPage ? guesses[guesses.length - 1].id : null,
    };
  }
}
