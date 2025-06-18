import 'reflect-metadata';
import 'jest';

global.console = {
  ...console,
};

const mockDateNow = jest.fn();
global.Date.now = mockDateNow;

beforeEach(() => {
  mockDateNow.mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
});

// Mock Math.random for consistent IDs
const mockMathRandom = jest.fn();
global.Math.random = mockMathRandom;

beforeEach(() => {
  mockMathRandom.mockReturnValue(0.123456789);
}); 