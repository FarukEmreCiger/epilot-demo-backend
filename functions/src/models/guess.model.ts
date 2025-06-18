export interface Guess {
  id: string;
  userId: string;
  prediction: "up" | "down";
  initialPrice: number;
  createdAt: number;
  status: "pending" | "resolved";
  resolvedPrice: number | null;
  resolvedAt: number | null;
  result: "correct" | "incorrect" | null;
  guessResolveDelay: number | null;
}
