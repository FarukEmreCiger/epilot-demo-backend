import {
  MakeGuessResponse,
  ResolveGuessResponse,
  GetLeaderboardResponse,
  GetGuessHistoryResponse,
} from "../types/api.types";

export interface IGameService {
  makeGuess(
    userId: string,
    prediction: "up" | "down",
    delaySeconds: number
  ): Promise<MakeGuessResponse>;

  resolveGuess(
    userId: string,
    guessId: string
  ): Promise<ResolveGuessResponse>;

  getLeaderboard(limit?: number): Promise<GetLeaderboardResponse>;

  getGuessHistory(
    userId: string,
    lastKey: string | null,
    pageSize?: number
  ): Promise<GetGuessHistoryResponse>;
}
