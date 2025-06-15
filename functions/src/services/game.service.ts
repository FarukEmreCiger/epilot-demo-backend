import {Guess} from "../models/guess.model";
import {User} from "../models/user.model";
import {GameLogic} from "../core/gameLogic";
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

@injectable()
export class GameService implements IGameService {
  constructor(
    @inject(TYPES.IDatabaseService) private readonly databaseService: IDatabaseService,
    @inject(TYPES.ITaskService) private readonly taskService: ITaskService
  ) {}

  async makeGuess(
    userId: string,
    prediction: "up" | "down",
    delaySeconds: number
  ): Promise<MakeGuessResponse> {
    const user = await this.databaseService.getUser(userId);

    if (user?.activeGuessId) {
      throw new ValidationError("User already has an active guess");
    }

    const currentPrice = await this.databaseService.getBtcPrice();
    const guessId = GameLogic.generateGuessId();

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
  }

  /*
   This is an internal function that is
   called by the task service to resolve a guess.
   It is not exposed to the public.
  */
  async resolveGuess(userId: string, guessId: string): Promise<ResolveGuessResponse> {
    logger.info("resolveGuess", userId, guessId);
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

    const currentPrice = await this.databaseService.getBtcPrice();
    const result = GameLogic.determineGuessResult(
      guess.prediction,
      guess.initialPrice,
      currentPrice
    );

    let scoreChange = GameLogic.calculateScoreChange(result);
    if (userScore + scoreChange < 0) {
      scoreChange = 0;
    }

    interface TransactionData {
      guesses?: {
        [userId: string]: {
          [guessId: string]: Guess;
        };
      };
      users?: {
        [userId: string]: User;
      };
    }

    await this.databaseService.transactionUpdate<TransactionData>(
      "/",
      (current) => {
        if (!current) return current;

        if (current.guesses?.[userId]?.[guessId]) {
          const currentGuess = current.guesses[userId][guessId];
          currentGuess.status = "resolved";
          currentGuess.resolvedPrice = currentPrice;
          currentGuess.resolvedAt = Date.now();
          currentGuess.result = result;
        }

        if (current.users?.[userId]) {
          current.users[userId].score += scoreChange;
          current.users[userId].activeGuessId = null;
        }

        return current;
      }
    );

    return {
      success: true,
      message: "Guess resolved successfully",
      result,
      scoreChange,
      resolvedPrice: currentPrice,
    };
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
