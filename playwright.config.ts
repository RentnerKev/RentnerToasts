import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4177'

export default defineConfig({
    testDir: './browser-tests',
    testMatch: '**/*.pw.ts',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
        ...devices['Desktop Chrome'],
    },
    webServer: {
        command: 'bun --cwd playground dev -- --host 127.0.0.1 --port 4177',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})
