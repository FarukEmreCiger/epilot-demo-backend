import { DatabaseService } from "./services/database.service";
import { GameService } from "./services/game.service";
import { TaskService } from "./services/task.service";
import { Container } from "inversify";
import { IDatabaseService } from "./interfaces/database.interface";
import { IGameService } from "./interfaces/game.interface";
import { ITaskService } from "./interfaces/task.interface";
import { TYPES } from "./interfaces/types";
import { getDatabase } from "firebase-admin/database";
import { config } from "./config/environment";
import "reflect-metadata";
import { LockService } from "./services/lock.service";
import { ILockService } from "./interfaces/lock.interface";

const DI_CONTAINER = new Container();

const database = getDatabase();
const taskService = new TaskService(
  config.projectId,
  config.location,
  config.queueName
);

DI_CONTAINER.bind("Database").toConstantValue(database);

DI_CONTAINER.bind<IDatabaseService>(TYPES.IDatabaseService).to(DatabaseService);
DI_CONTAINER.bind<ILockService>(TYPES.ILockService).to(LockService);
DI_CONTAINER.bind<ITaskService>(TYPES.ITaskService).toConstantValue(taskService);
DI_CONTAINER.bind<IGameService>(TYPES.IGameService).to(GameService);


export default DI_CONTAINER;
