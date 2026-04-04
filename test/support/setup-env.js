const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env.test.local'),
  override: true,
  quiet: true,
});

process.env.NODE_ENV = 'test';
