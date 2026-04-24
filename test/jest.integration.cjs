const common = require('./jest.common.cjs');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/integration/**/*.int.spec.ts'],
};
