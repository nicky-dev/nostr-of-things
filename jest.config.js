module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],
  },
  // Standard Jest behavior: do not transform node_modules
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@not/core$': '<rootDir>/src/core',
    '^@not/core/(.*)$': '<rootDir>/src/core/$1',
    '^@not/clients$': '<rootDir>/src/clients',
    '^@not/clients/(.*)$': '<rootDir>/src/clients/$1',
    '^@not/protocols$': '<rootDir>/src/protocols',
    '^@not/protocols/(.*)$': '<rootDir>/src/protocols/$1',
    '^@not/utils$': '<rootDir>/src/utils',
    '^@not/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
};
