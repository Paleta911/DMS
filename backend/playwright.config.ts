import { defineConfig } from '@playwright/test';

function toWebServerEnv(env: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

const backendEnv = {
  ...toWebServerEnv(process.env),
  NODE_ENV: 'development',
  PORT: process.env.PORT ?? '3000',
  EMAIL_MODE: 'console',
  BOOTSTRAP_TOKEN: process.env.BOOTSTRAP_TOKEN ?? 'e2e-bootstrap-token',
  JWT_SECRET: process.env.JWT_SECRET ?? 'e2e_jwt_secret_2026_local_only',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? 'e2e_refresh_secret_2026_local_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '60s',
  JWT_ACCESS_EXPIRES_IN_SEC: process.env.JWT_ACCESS_EXPIRES_IN_SEC ?? '60',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '1d',
};

export default defineConfig({
  testDir: './e2e-browser',
  testMatch: '*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 240000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run e2e:serve:backend',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
      env: backendEnv,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120000,
    },
    {
      command: 'npm run e2e:serve:frontend',
      url: 'http://127.0.0.1:4173/login',
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
      env: toWebServerEnv(process.env),
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120000,
    },
  ],
});
