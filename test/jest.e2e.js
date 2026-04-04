const common = require('./jest.common');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.spec.ts'],
};
