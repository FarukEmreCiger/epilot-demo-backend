import {Guess} from "../models/guess.model";
import {User} from "../models/user.model";
import {DatabaseUpdatePayload} from "../types/api.types";

export interface IDatabaseService {
  getUser(userId: string): Promise<User | null>;

  getUserScore(userId: string): Promise<number>;

  getGuess(userId: string, guessId: string): Promise<Guess | null>;

  getBtcPrice(): Promise<number>;

  atomicUpdate(updates: DatabaseUpdatePayload): Promise<void>;

  transactionUpdate<T>(
    path: string,
    updateFunction: (current: T | null) => T | null
  ): Promise<{ committed: boolean; snapshot: T | null }>;

  getGuessHistory(
    userId: string,
    lastKey: string | null,
    pageSize: number
  ): Promise<Guess[]>;

  getLeaderboard(limit: number): Promise<User[]>;
}
