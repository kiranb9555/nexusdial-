import { execSync } from 'child_process';

/**
 * Creates the test database (if needed) and applies migrations once before the
 * whole test run. Uses the dockerised Postgres from docker-compose.
 */
export default function globalSetup(): void {
  const dbUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://nexusdial:nexusdial@localhost:5432/nexusdial_test?schema=public';

  try {
    execSync(
      'docker exec nexusdial-postgres psql -U nexusdial -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = \'nexusdial_test\'" | grep -q 1 || docker exec nexusdial-postgres psql -U nexusdial -d postgres -c "CREATE DATABASE nexusdial_test"',
      { stdio: 'ignore', shell: '/bin/bash' },
    );
  } catch {
    // Best effort; migrate deploy will surface a clear error if the DB is missing.
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
}
