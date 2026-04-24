const common = require('./jest.common.cjs');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  collectCoverage: true,
};
