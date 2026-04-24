const common = require('./jest.common.cjs');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.spec.ts'],
};
