import 'reflect-metadata';
import { GameService } from '../../src/services/game.service';
import { IDatabaseService } from '../../src/interfaces/database.interface';
import { ITaskService } from '../../src/interfaces/task.interface';
import { ILockService } from '../../src/interfaces/lock.interface';
import { GameUtils } from '../../src/core/gameLogic';
import { ValidationError } from '../../src/types/errors.types';
import { User } from '../../src/models/user.model';
import { Guess } from '../../src/models/guess.model';


jest.mock('../../src/core/gameLogic');
const MockedGameLogic = GameUtils as jest.Mocked<typeof GameUtils>;


jest.mock('firebase-functions/v1', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GameService', () => {
  let gameService: GameService;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;
  let mockTaskService: jest.Mocked<ITaskService>;
  let mockLockService: jest.Mocked<ILockService>;

  
  const testUserId = 'test-user-123';
  const testGuessId = 'guess_1640995200000_abcdefghi';
  const testCurrentPrice = 50000;
  const testResolvedPrice = 52000;
  const testDelaySeconds = 300;

  const testUser: User = {
    uid: testUserId,
    score: 10,
    activeGuessId: null,
  };

  const testGuess: Guess = {
    id: testGuessId,
    userId: testUserId,
    prediction: 'up',
    initialPrice: testCurrentPrice,
    createdAt: 1640995200000,
    status: 'pending',
    resolvedPrice: null,
    resolvedAt: null,
    result: null,
    guessResolveDelay: testDelaySeconds,
  };

  beforeEach(() => {
    
    mockDatabaseService = {
      getUser: jest.fn(),
      getUserScore: jest.fn(),
      getGuess: jest.fn(),
      getBtcPrice: jest.fn(),
      atomicUpdate: jest.fn(),
      transactionUpdate: jest.fn(),
      getGuessHistory: jest.fn(),
      getLeaderboard: jest.fn(),
    };

    mockTaskService = {
      createResolveGuessTask: jest.fn(),
    };

    mockLockService = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockLockService.acquireLock.mockResolvedValue(true);
    mockLockService.releaseLock.mockResolvedValue();


    
    MockedGameLogic.generateGuessId.mockReturnValue(testGuessId);
    MockedGameLogic.determineGuessResult.mockReturnValue({result: "correct", scoreChange: 1});

    
    gameService = new GameService(mockDatabaseService, mockTaskService, mockLockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('makeGuess', () => {
    beforeEach(() => {
      mockDatabaseService.getBtcPrice.mockResolvedValue(testCurrentPrice);
      mockDatabaseService.atomicUpdate.mockResolvedValue();
      mockTaskService.createResolveGuessTask.mockResolvedValue();
      mockLockService.acquireLock.mockResolvedValue(true);
      mockLockService.releaseLock.mockResolvedValue();
    });

    it('should create successful guess for existing user', async () => {
      mockDatabaseService.getUser.mockResolvedValue(testUser);

      const result = await gameService.makeGuess(testUserId, 'up', testDelaySeconds);

      expect(result).toEqual({
        success: true,
        guessId: testGuessId,
        initialPrice: testCurrentPrice,
        message: 'Guess successfully created',
      });

      expect(mockDatabaseService.getUser).toHaveBeenCalledWith(testUserId);
      expect(mockDatabaseService.getBtcPrice).toHaveBeenCalled();
      expect(MockedGameLogic.generateGuessId).toHaveBeenCalled();
      expect(mockTaskService.createResolveGuessTask).toHaveBeenCalledWith(
        testUserId,
        testGuessId,
        testDelaySeconds
      );

      expect(mockDatabaseService.atomicUpdate).toHaveBeenCalledWith({
        [`guesses/${testUserId}/${testGuessId}`]: expect.objectContaining({
          id: testGuessId,
          userId: testUserId,
          prediction: 'up',
          initialPrice: testCurrentPrice,
        }),
        [`users/${testUserId}/activeGuessId`]: testGuessId,
      });
    });

    it('should create successful guess for new user', async () => {
      mockDatabaseService.getUser.mockResolvedValue(null);

      const result = await gameService.makeGuess(testUserId, 'down', testDelaySeconds);

      expect(result.success).toBe(true);
      expect(result.guessId).toBe(testGuessId);

      expect(mockDatabaseService.atomicUpdate).toHaveBeenCalledWith({
        [`guesses/${testUserId}/${testGuessId}`]: expect.objectContaining({
          prediction: 'down',
        }),
        [`users/${testUserId}`]: {
          uid: testUserId,
          score: 0,
          activeGuessId: testGuessId,
        },
      });
    });

    it('should throw error for user with active guess', async () => {
      const userWithActiveGuess: User = {
        ...testUser,
        activeGuessId: 'existing-guess-id',
      };
      mockDatabaseService.getUser.mockResolvedValue(userWithActiveGuess);

      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow(ValidationError);
      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow('User already has an active guess');
    });

    it('should throw error when lock acquisition fails', async () => {
      mockLockService.acquireLock.mockResolvedValue(false);

      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow(ValidationError);
      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow('Another guess operation is in progress');
    });

    it('should throw error on database error', async () => {
      mockDatabaseService.getUser.mockResolvedValue(testUser);
      mockDatabaseService.getBtcPrice.mockRejectedValue(new Error('Database error'));

      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow('Database error');
    });
  });

  describe('resolveGuess', () => {
    beforeEach(() => {
      mockDatabaseService.getGuess.mockResolvedValue(testGuess);
      mockDatabaseService.getUserScore.mockResolvedValue(10);
      mockDatabaseService.getBtcPrice.mockResolvedValue(testResolvedPrice);
      mockDatabaseService.atomicUpdate.mockResolvedValue();
      mockLockService.acquireLock.mockResolvedValue(true);
      mockLockService.releaseLock.mockResolvedValue();
    });

    it('should successfully resolve pending guess', async () => {
      const expiredGuess = {
        ...testGuess,
        createdAt: 1640995200000 - 400000,
      };
      mockDatabaseService.getGuess.mockResolvedValue(expiredGuess);

      const result = await gameService.resolveGuess(testUserId, testGuessId);

      expect(result).toEqual({
        success: true,
        message: 'Guess resolved successfully',
        result: 'correct',
        scoreChange: 1,
        resolvedPrice: testResolvedPrice,
      });

      expect(MockedGameLogic.determineGuessResult).toHaveBeenCalledWith(
        'up',
        testCurrentPrice,
        testResolvedPrice
      );
      expect(mockDatabaseService.atomicUpdate).toHaveBeenCalled();
    });

    it('should make 0 change if score would be negative', async () => {
      const expiredGuess = {
        ...testGuess,
        createdAt: 1640995200000 - 400000,
      };
      mockDatabaseService.getGuess.mockResolvedValue(expiredGuess);
      mockDatabaseService.getUserScore.mockResolvedValue(0);
      MockedGameLogic.determineGuessResult.mockReturnValue({result: "incorrect", scoreChange: -1});

      const result = await gameService.resolveGuess(testUserId, testGuessId);

      expect(result.scoreChange).toBe(0);
    });

    it('should return failed result if guess not found', async () => {
      mockDatabaseService.getGuess.mockResolvedValue(null);

      const result = await gameService.resolveGuess(testUserId, testGuessId);

      expect(result).toEqual({
        success: false,
        message: 'Guess not found',
      });
    });

    it('should return failed result for already resolved guess', async () => {
      const resolvedGuess = {
        ...testGuess,
        status: 'resolved' as const,
      };
      mockDatabaseService.getGuess.mockResolvedValue(resolvedGuess);

      const result = await gameService.resolveGuess(testUserId, testGuessId);

      expect(result).toEqual({
        success: false,
        message: 'Guess already resolved',
      });
    });

    it('should return failed result when lock acquisition fails', async () => {
      mockLockService.acquireLock.mockResolvedValue(false);

      const result = await gameService.resolveGuess(testUserId, testGuessId);

      expect(result).toEqual({
        success: false,
        message: 'Guess resolution already in progress',
      });
    });

    it('should throw error if resolution time has not passed', async () => {
      const recentGuess = {
        ...testGuess,
        createdAt: Date.now() - 100000,
      };
      mockDatabaseService.getGuess.mockResolvedValue(recentGuess);

      await expect(
        gameService.resolveGuess(testUserId, testGuessId)
      ).rejects.toThrow(ValidationError);
      await expect(
        gameService.resolveGuess(testUserId, testGuessId)
      ).rejects.toThrow("Guess resolution time hasn't passed yet");
    });
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard with default limit', async () => {
      const mockUsers: User[] = [
        { uid: 'user1', score: 100, activeGuessId: null },
        { uid: 'user2', score: 50, activeGuessId: null },
      ];
      mockDatabaseService.getLeaderboard.mockResolvedValue(mockUsers);

      const result = await gameService.getLeaderboard();

      expect(result).toEqual({
        success: true,
        leaderboard: [
          { uid: 'user1', score: 100 },
          { uid: 'user2', score: 50 },
        ],
      });
      expect(mockDatabaseService.getLeaderboard).toHaveBeenCalledWith(10);
    });

    it('should get leaderboard with custom limit', async () => {
      const mockUsers: User[] = [
        { uid: 'user1', score: 100, activeGuessId: null },
      ];
      mockDatabaseService.getLeaderboard.mockResolvedValue(mockUsers);

      const result = await gameService.getLeaderboard(5);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(1);
      expect(mockDatabaseService.getLeaderboard).toHaveBeenCalledWith(5);
    });
  });

  describe('getGuessHistory', () => {
    it('should get user guess history', async () => {
      const mockGuesses: Guess[] = [
        { ...testGuess, id: 'guess1' },
        { ...testGuess, id: 'guess2' },
      ];
      mockDatabaseService.getGuessHistory.mockResolvedValue(mockGuesses);

      const result = await gameService.getGuessHistory(testUserId, null);

      expect(result).toEqual({
        success: true,
        guesses: [
          {
            id: 'guess1',
            userId: testUserId,
            prediction: 'up',
            initialPrice: testCurrentPrice,
            createdAt: 1640995200000,
            status: 'pending',
            resolvedPrice: null,
            resolvedAt: null,
            result: null,
          },
          {
            id: 'guess2',
            userId: testUserId,
            prediction: 'up',
            initialPrice: testCurrentPrice,
            createdAt: 1640995200000,
            status: 'pending',
            resolvedPrice: null,
            resolvedAt: null,
            result: null,
          },
        ],
        hasNextPage: false,
        nextPageKey: null,
      });
      expect(mockDatabaseService.getGuessHistory).toHaveBeenCalledWith(
        testUserId,
        null,
        10
      );
    });

    it('should get guess history with pagination', async () => {
      const mockGuesses: Guess[] = Array.from({ length: 6 }, (_, i) => ({
        ...testGuess,
        id: `guess${i + 1}`,
      }));
      mockDatabaseService.getGuessHistory.mockResolvedValue(mockGuesses);

      const result = await gameService.getGuessHistory(testUserId, 'lastKey', 5);

      expect(result.success).toBe(true);
      expect(result.guesses).toHaveLength(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextPageKey).toBe('guess5');
      expect(mockDatabaseService.getGuessHistory).toHaveBeenCalledWith(
        testUserId,
        'lastKey',
        5
      );
    });

    it('should return correct result for empty history', async () => {
      mockDatabaseService.getGuessHistory.mockResolvedValue([]);

      const result = await gameService.getGuessHistory(testUserId, null);

      expect(result).toEqual({
        success: true,
        guesses: [],
        hasNextPage: false,
        nextPageKey: null,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database service errors correctly', async () => {
      const dbError = new Error('Database connection failed');
      mockDatabaseService.getUser.mockRejectedValue(dbError);

      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle task service errors correctly', async () => {
      mockDatabaseService.getUser.mockResolvedValue(testUser);
      mockDatabaseService.getBtcPrice.mockResolvedValue(testCurrentPrice);
      const taskError = new Error('Task creation failed');
      mockTaskService.createResolveGuessTask.mockRejectedValue(taskError);

      await expect(
        gameService.makeGuess(testUserId, 'up', testDelaySeconds)
      ).rejects.toThrow('Task creation failed');
    });
  });
}); 