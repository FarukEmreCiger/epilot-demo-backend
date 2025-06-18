export interface ILockService {
  acquireLock(lockKey: string, ttl?: number): Promise<boolean>;
  releaseLock(lockKey: string): Promise<void>;
}