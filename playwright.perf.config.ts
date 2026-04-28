import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './tests/perf',
  timeout: 1_200_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'perf-results/playwright-report.json' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
    trace: 'on',
    video: 'off',
    screenshot: 'off',
  },
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3000',
        port: 3000,
        timeout: 600_000,
        reuseExistingServer: true,
      },
})
