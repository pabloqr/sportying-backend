module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        sourceMaps: 'inline',
        module: {
          type: 'commonjs',
        },
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  setupFiles: ['<rootDir>/test/support/setup-env.js'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/test/support/mocks/uuid.ts',
  },
  testTimeout: 30000,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '\\.module\\.ts$',
    '\\.dto\\.ts$',
    '\\.enum\\.ts$',
    '\\.entity\\.ts$',
    '\\.schema\\.ts$',
    '\\.interface\\.ts$',
    '\\.type\\.ts$',
    '\\.config\\.ts$',
    'index\\.ts$',
    'main\\.ts$',
  ],
};
