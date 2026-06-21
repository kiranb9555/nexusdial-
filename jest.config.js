/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/test/env.ts'],
  globalSetup: '<rootDir>/src/test/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  clearMocks: true,
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/test/**'],
};
