module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/services/**/*.(test|spec).(js|ts)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/dist/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: [
    'services/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!services/SupabaseService.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};