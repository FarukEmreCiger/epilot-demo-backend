
export class GameLogic {
  static determineGuessResult(
    prediction: "up" | "down",
    initialPrice: number,
    resolvedPrice: number
  ): "correct" | "incorrect" {
    const priceWentUp = resolvedPrice > initialPrice;

    if (prediction === "up" && priceWentUp) {
      return "correct";
    }

    if (prediction === "down" && !priceWentUp) {
      return "correct";
    }

    return "incorrect";
  }

  static calculateScoreChange(result: "correct" | "incorrect"): number {
    return result === "correct" ? 1 : -1;
  }

  static isValidPrediction(prediction: unknown): prediction is "up" | "down" {
    return prediction === "up" || prediction === "down";
  }

  static generateGuessId(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `guess_${timestamp}_${randomPart}`;
  }
}
