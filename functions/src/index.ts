import {initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {logger} from "firebase-functions";
import {GameController} from "./controllers/game.controller";
import {config} from "./config/environment";
import {IGameService} from "./interfaces/game.interface";
import {TYPES} from "./interfaces/types";

setGlobalOptions({region: config.region});

initializeApp();

import DI_CONTAINER from "./di";


const gameController = new GameController(
  DI_CONTAINER.get<IGameService>(TYPES.IGameService),
);

export const makeGuess = gameController.makeGuess;
export const resolveGuess = gameController.resolveGuess;
export const getLeaderboard = gameController.getLeaderboard;
export const getGuessHistory = gameController.getGuessHistory;

logger.info("BitPredict - Firebase Functions have started");
