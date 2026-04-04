const common = require('./jest.common');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/test/integration/**/*.int.spec.ts'],
};
