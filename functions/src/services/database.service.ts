import {Database} from "firebase-admin/database";
import {Guess} from "../models/guess.model";
import {User} from "../models/user.model";
import {DatabaseError} from "../types/errors.types";
import {DatabaseUpdatePayload} from "../types/api.types";
import {IDatabaseService} from "../interfaces/database.interface";
import {inject, injectable} from "inversify";

@injectable()
export class DatabaseService implements IDatabaseService {
  constructor(
    @inject("Database") private readonly db: Database
  ) {}

  async getUser(userId: string): Promise<User | null> {
    try {
      const userRef = this.db.ref(`users/${userId}`);
      const snapshot = await userRef.once("value");
      return snapshot.exists() ? snapshot.val() as User : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getUser"
      );
    }
  }

  async getUserScore(userId: string): Promise<number> {
    try {
      const userScoreRef = this.db.ref(`users/${userId}/score`);
      const snapshot = await userScoreRef.once("value");
      return snapshot.val() as number;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user score for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getUserScore"
      );
    }
  }

  async getGuess(userId: string, guessId: string): Promise<Guess | null> {
    try {
      const guessRef = this.db.ref(`guesses/${userId}/${guessId}`);
      const snapshot = await guessRef.once("value");
      return snapshot.exists() ? snapshot.val() as Guess : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get guess ${guessId} for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getGuess"
      );
    }
  }

  async getBtcPrice(): Promise<number> {
    try {
      const priceRef = this.db.ref("exchange/btcusdt/current/price");
      const snapshot = await priceRef.once("value");
      const price = snapshot.val();

      if (!price || typeof price !== "number" || price <= 0) {
        throw new DatabaseError("Invalid BTC price in database", "getBtcPrice");
      }

      return price;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get BTC price: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getBtcPrice"
      );
    }
  }

  async atomicUpdate(updates: DatabaseUpdatePayload): Promise<void> {
    try {
      await this.db.ref().update(updates);
    } catch (error) {
      throw new DatabaseError(
        `Failed to perform atomic update: ${error instanceof Error ? error.message : "Unknown error"}`,
        "atomicUpdate"
      );
    }
  }

  async transactionUpdate<T>(
    path: string,
    updateFunction: (current: T | null) => T | null
  ): Promise<{ committed: boolean; snapshot: T | null }> {
    try {
      const result = await this.db.ref(path).transaction(updateFunction);
      return {
        committed: result.committed,
        snapshot: result.snapshot?.val() as T | null,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to perform transaction on ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "transactionUpdate"
      );
    }
  }

  async getGuessHistory(
    userId: string,
    lastKey: string | null,
    pageSize: number
  ): Promise<Guess[]> {
    try {
      let query = this.db.ref(`guesses/${userId}`).orderByKey();

      if (lastKey) {
        query = query.endBefore(lastKey);
      }

      query = query.limitToLast(pageSize + 1);
      const snapshot = await query.once("value");
      const guesses: Guess[] = [];

      snapshot.forEach((childSnapshot) => {
        const guess = childSnapshot.val() as Guess;
        guess.id = childSnapshot.key!;
        guesses.push(guess);
      });

      return guesses.reverse();
    } catch (error) {
      throw new DatabaseError(
        `Failed to get guess history for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getGuessHistory"
      );
    }
  }

  async getLeaderboard(limit: number): Promise<User[]> {
    try {
      const usersRef = this.db.ref("users");
      const snapshot = await usersRef
        .orderByChild("score")
        .limitToLast(limit)
        .once("value");

      const users: User[] = [];
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val() as User;
        users.push(user);
      });

      return users.reverse();
    } catch (error) {
      throw new DatabaseError(
        `Failed to get leaderboard: ${error instanceof Error ? error.message : "Unknown error"}`,
        "getLeaderboard"
      );
    }
  }
}
