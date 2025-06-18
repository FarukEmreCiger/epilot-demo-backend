import 'reflect-metadata';
import { LockService } from '../../src/services/lock.service';
import { IDatabaseService } from '../../src/interfaces/database.interface';
import { config } from '../../src/config/environment';

describe('LockService', () => {
    let lockService: LockService;
    let mockDatabaseService: jest.Mocked<IDatabaseService>;

    beforeEach(() => {
        mockDatabaseService = {
            transactionUpdate: jest.fn()
        } as any;

        lockService = new LockService(mockDatabaseService);
    });

    describe('acquireLock', () => {
        it('should acquire lock when no existing lock', async () => {
            const lockKey = 'test-lock';
            const expectedLockData = { timestamp: 1640995200000 };

            mockDatabaseService.transactionUpdate.mockResolvedValue({
                committed: true,
                snapshot: expectedLockData
            });

            const result = await lockService.acquireLock(lockKey);

            expect(result).toBe(true);
            expect(mockDatabaseService.transactionUpdate).toHaveBeenCalledWith(
                `locks/${lockKey}`,
                expect.any(Function)
            );
        });

        it('should acquire lock when existing lock is expired', async () => {
            const lockKey = 'test-lock';
            const currentTime = 1640995200000;
            const expiredTimestamp = currentTime - config.lockTTL - 1;
            const currentLock = { timestamp: expiredTimestamp };

            jest.spyOn(Date, 'now').mockReturnValue(currentTime);

            mockDatabaseService.transactionUpdate.mockImplementation(async (path, updateFn) => {
                const result = updateFn(currentLock);
                return {
                    committed: true,
                    snapshot: result
                };
            });

            const result = await lockService.acquireLock(lockKey);

            expect(result).toBe(true);
        });

        it('should fail to acquire lock when valid lock exists', async () => {
            const lockKey = 'test-lock';
            const validTimestamp = 1640995200000 - 1000;
            const currentLock = { timestamp: validTimestamp };

            mockDatabaseService.transactionUpdate.mockImplementation(async (path, updateFn) => {
                const result = updateFn(currentLock);
                return {
                    committed: true,
                    snapshot: result
                };
            });

            const result = await lockService.acquireLock(lockKey);

            expect(result).toBe(false);
        });

        it('should handle null snapshot', async () => {
            const lockKey = 'test-lock';

            mockDatabaseService.transactionUpdate.mockResolvedValue({
                committed: true,
                snapshot: null
            });

            const result = await lockService.acquireLock(lockKey);

            expect(result).toBe(false);
        });
    });

    describe('releaseLock', () => {
        it('should release lock successfully', async () => {
            const lockKey = 'test-lock';

            mockDatabaseService.transactionUpdate.mockResolvedValue({
                committed: true,
                snapshot: null
            });

            await lockService.releaseLock(lockKey);

            expect(mockDatabaseService.transactionUpdate).toHaveBeenCalledWith(
                `locks/${lockKey}`,
                expect.any(Function)
            );
        });
    });
});
