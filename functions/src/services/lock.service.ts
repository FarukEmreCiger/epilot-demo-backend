import {injectable, inject} from "inversify";
import {TYPES} from "../interfaces/types";
import {IDatabaseService} from "../interfaces/database.interface";
import { config } from "../config/environment";
import {ILockService} from "../interfaces/lock.interface";

@injectable()
export class LockService implements ILockService {
  constructor(
    @inject(TYPES.IDatabaseService) private readonly databaseService: IDatabaseService
  ) {}

  async acquireLock(lockKey: string): Promise<boolean> {
    const lockData = {
      timestamp: Date.now(),
    };

    const result = await this.databaseService.transactionUpdate<any>(
      `locks/${lockKey}`,
      (current) => {
        if (!current || Date.now() > current.timestamp + config.lockTTL) {
          return lockData;
        }
        return current;
      }
    );

    return result.committed && result.snapshot?.timestamp === lockData.timestamp;
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.databaseService.transactionUpdate<any>(
      `locks/${lockKey}`,
      () => null
    );
  }
} 