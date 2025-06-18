export interface Auth {
  uid: string;
}

export interface MakeGuessRequest {
  prediction: "up" | "down";
}

export interface MakeGuessResponse {
  success: boolean;
  guessId: string;
  initialPrice: number;
  message: string;
}

export interface ResolveGuessRequest {
  userId: string;
  guessId: string;
}

export interface ResolveGuessResponse {
  success: boolean;
  message: string;
  result?: "correct" | "incorrect";
  scoreChange?: number;
  resolvedPrice?: number;
}

export interface GetLeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  uid: string;
  score: number;
}

export interface GetGuessHistoryRequest {
  lastKey?: string | null;
}

export interface GetGuessHistoryResponse {
  success: boolean;
  guesses: GuessHistoryEntry[];
  hasNextPage: boolean;
  nextPageKey: string | null;
}

export interface GuessHistoryEntry {
  id: string;
  userId: string;
  prediction: "up" | "down";
  initialPrice: number;
  createdAt: number;
  status: "pending" | "resolved";
  resolvedPrice: number | null;
  resolvedAt: number | null;
  result: "correct" | "incorrect" | null;
}

export interface DatabaseUpdatePayload {
  [path: string]: unknown;
}

export interface TaskPayload {
  userId: string;
  guessId: string;
}
