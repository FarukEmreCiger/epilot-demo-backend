
export class GameUtils {
  static determineGuessResult(
    prediction: "up" | "down",
    initialPrice: number,
    resolvedPrice: number
  ): { result: "correct" | "incorrect", scoreChange: number } {
    const correct = { result: "correct", scoreChange: 1 } as const;
    const incorrect = { result: "incorrect", scoreChange: -1 } as const;

    const priceWentUp = resolvedPrice > initialPrice;

    if (prediction === "up" && priceWentUp) {
      return correct;
    }

    if (prediction === "down" && !priceWentUp) {
      return correct;
    }

    return incorrect;
  }

  static generateGuessId(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `guess_${timestamp}_${randomPart}`;
  }
}
