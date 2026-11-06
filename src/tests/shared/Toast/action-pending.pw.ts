import { expect, test } from '@playwright/test'

test('shares pending state across surfaces and a remounted card without duplicate callbacks', async ({
    page,
}) => {
    await page.route('**/action-pending-fixture', (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/src/actionPendingFixture.tsx"></script></body></html>`,
        }),
    )
    await page.goto('/action-pending-fixture')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Show shared action' }).click()
    const first = page
        .locator('.first-surface')
        .getByRole('button', { name: 'Run shared action' })
    const second = page
        .locator('.second-surface')
        .getByRole('button', { name: 'Run shared action' })
    await first.click()
    await expect(first).toHaveAttribute('aria-busy', 'true')
    await expect(second).toHaveAttribute('aria-busy', 'true')
    await expect(second).toBeDisabled()
    await second.evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.getByTestId('action-calls')).toHaveText('1')
    await page.getByRole('button', { name: 'Toggle first surface' }).click()
    await expect(first).toHaveCount(0)
    await page.getByRole('button', { name: 'Toggle first surface' }).click()
    await expect(first).toHaveAttribute('aria-busy', 'true')
    await expect(first).toBeDisabled()
    await first.evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.getByTestId('action-calls')).toHaveText('1')
    await page.getByRole('button', { name: 'Finish action' }).click()
    await expect(first).not.toHaveAttribute('aria-busy', 'true')
    await expect(second).not.toHaveAttribute('aria-busy', 'true')
    await expect(first).toBeEnabled()
    await expect(second).toBeEnabled()
    await second.click()
    await expect(page.getByTestId('action-calls')).toHaveText('2')
    await expect(first).toHaveAttribute('aria-busy', 'true')
    await page.getByRole('button', { name: 'Finish action' }).click()
})
