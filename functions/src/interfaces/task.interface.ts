export interface ITaskService {
  createResolveGuessTask(
    userId: string,
    guessId: string,
    delaySeconds?: number
  ): Promise<void>;
}
