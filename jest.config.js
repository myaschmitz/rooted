module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { isolatedModules: true }],
  },
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
  moduleNameMapper: {
    '^(\\.{1,2}/)+(services/)?CacheService$':
      '<rootDir>/services/CacheService.web.ts',
    '^(\\.{1,2}/)+(services/)?CachedPhotoService$':
      '<rootDir>/services/CachedPhotoService.web.ts',
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};