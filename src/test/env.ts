// Runs before any module (incl. config/env) is imported in tests.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://nexusdial:nexusdial@localhost:5432/nexusdial_test?schema=public';
// Isolate test data in Redis DB index 1.
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.AI_PROVIDER = 'mock';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_0123456789abcd';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_0123456789abcd';
process.env.LOG_LEVEL = 'error';
