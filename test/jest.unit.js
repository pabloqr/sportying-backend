const common = require('./jest.common');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  collectCoverage: true,
};
