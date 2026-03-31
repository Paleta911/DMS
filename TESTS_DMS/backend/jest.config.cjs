const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const backendNodeModules = path.join(projectRoot, 'backend', 'node_modules');

module.exports = {
  rootDir: projectRoot,
  testMatch: ['<rootDir>/TESTS_DMS/backend/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      require.resolve('ts-jest', { paths: [backendNodeModules] }),
      {
        tsconfig: '<rootDir>/backend/tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleDirectories: ['node_modules', backendNodeModules],
  testEnvironment: 'node',
  collectCoverageFrom: [
    '<rootDir>/backend/src/**/*.(t|j)s',
    '!<rootDir>/backend/src/**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/TESTS_DMS/backend',
  coveragePathIgnorePatterns: [
    '<rootDir>/backend/src/migrations/',
    '<rootDir>/backend/src/data-source.ts',
  ],
};
