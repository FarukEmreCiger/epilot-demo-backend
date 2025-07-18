import {TaskCreationError} from "../types/errors.types";
import {TaskPayload} from "../types/api.types";
import {ITaskService} from "../interfaces/task.interface";
import {injectable} from "inversify";
import { config } from "../config/environment";

@injectable()
export class TaskService implements ITaskService {
  private tasksClient: any;
  private queuePath: string;

  private readonly resolveGuessUrl = `https://${this.location}-${this.projectId}.cloudfunctions.net/resolveGuess`;
  
  constructor(
    private readonly projectId: string,
    private readonly location: string,
    private readonly queueName: string
  ) {
    this.queuePath = "";
  }

  private async initializeClient(): Promise<void> {
    if (!this.tasksClient) {
      const {CloudTasksClient} = await import("@google-cloud/tasks");
      this.tasksClient = new CloudTasksClient();
      this.queuePath = this.tasksClient.queuePath(
        this.projectId,
        this.location,
        this.queueName
      );
    }
  }

  async createResolveGuessTask(
    userId: string,
    guessId: string,
    delaySeconds = 15
  ): Promise<void> {
    await this.initializeClient();

    const payload: TaskPayload = {userId, guessId};

    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        oidcToken: {
          serviceAccountEmail: config.serviceAccountEmailForCloudTasks,
        },
        url: this.resolveGuessUrl,
        body: Buffer.from(JSON.stringify({data: payload})).toString("base64"),
        headers: {
          "Content-Type": "application/json" as const,
        },
      },
      scheduleTime: {
        seconds: Math.ceil(Date.now() / 1000) + delaySeconds,
      },
    };

    try {
      await this.tasksClient.createTask({
        parent: this.queuePath,
        task,
      });
    } catch (error) {
      throw new TaskCreationError(
        `Failed to create resolve guess task for user ${userId}, guess ${guessId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        {userId, guessId, delaySeconds}
      );
    }
  }
}
