/* oxlint-disable no-await-in-loop -- Visibility transitions and keyboard traversal must run sequentially. */
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const browserErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
    const errors: string[] = []
    browserErrors.set(page, errors)
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (value: string) => {
                    document.documentElement.setAttribute(
                        'data-copied-text',
                        value,
                    )
                },
            },
        })
    })
    await page.route('**/native-focus-fixture', (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: `<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/src/focusScopeFixture.tsx"></script></body></html>`,
        }),
    )
    await page.goto('/native-focus-fixture')
    await expect(
        page.getByRole('button', { name: 'Add all stores' }),
    ).toBeVisible()
})
test.afterEach(({ page }) => {
    expect(browserErrors.get(page)).toEqual([])
})

async function expectOriginalContainers(page: Page) {
    await expect(page.locator('#inline-provider [role="status"]')).toHaveCount(
        1,
    )
    await expect(page.locator('#custom-container [role="status"]')).toHaveCount(
        1,
    )
    await expect(
        page.locator('body > [data-rentner-toast-region] [role="status"]'),
    ).toHaveCount(1)
    await expect(page.getByRole('status')).toHaveCount(3)
}

test('moves every store into a mounted native dialog and restores inline, body and explicit containers', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await expectOriginalContainers(page)
    await expect(page.locator('[data-rentner-toast-focus-scope]')).toHaveCount(
        3,
    )
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await expect(page.locator('#parent-dialog [role="status"]')).toHaveCount(3)
    const host = page.locator(
        '#parent-dialog > [data-rentner-toast-focus-scope]',
    )
    await expect
        .poll(() =>
            host.evaluate((element) => {
                const bounds = element.getBoundingClientRect()
                return bounds.width + bounds.height
            }),
        )
        .toBe(0)
    await expect(host).toHaveCSS('border-width', '0px')
    await page
        .getByRole('button', { name: 'Close parent', exact: true })
        .click()
    await expectOriginalContainers(page)
    await expect(page.locator('[data-rentner-toast-focus-scope]')).toHaveCount(
        3,
    )
})

test('uses the nested modal and falls back to its parent then original containers', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await page.getByRole('button', { name: 'Open child', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#child-dialog [role="status"]')).toHaveCount(3)
    await page.getByRole('button', { name: 'Close child', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(
        page.locator(
            '#parent-dialog > [data-rentner-toast-focus-scope] [role="status"]',
        ),
    ).toHaveCount(3)
    await expect(
        page.getByRole('button', { name: 'Open child', exact: true }),
    ).toBeFocused()
    await page
        .getByRole('button', { name: 'Close parent', exact: true })
        .click()
    await expectOriginalContainers(page)
})

test('ignores a force-mounted closed custom host and observes ancestor visibility plus active opt-out', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.getByRole('button', { name: 'Toggle custom active' }).click()
    await expectOriginalContainers(page)
    const custom = page.locator('#custom-scope')
    await custom.evaluate((element) =>
        element.setAttribute('data-state', 'open'),
    )
    await expect(custom.locator('[role="status"]')).toHaveCount(3)
    for (const [attribute, value] of [
        ['hidden', ''],
        ['inert', ''],
        ['aria-hidden', 'true'],
        ['style', 'display:none'],
    ]) {
        await custom.evaluate(
            (element, [name, content]) => element.setAttribute(name!, content!),
            [attribute, value],
        )
        await expectOriginalContainers(page)
        await custom.evaluate(
            (element, name) => element.removeAttribute(name!),
            attribute,
        )
        await expect(custom.locator('[role="status"]')).toHaveCount(3)
    }
    await page.getByRole('button', { name: 'Toggle custom active' }).click()
    await expectOriginalContainers(page)
})

test('tabs to copy and close actions within the native modal and restores focus after dismissal', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    const trigger = page.getByRole('button', { name: 'Add error', exact: true })
    await trigger.click()
    const toast = page.getByRole('alert')
    await expect(toast).toBeVisible()
    const copy = toast.getByRole('button', { name: 'Copy error message' })
    let reached = false
    for (let index = 0; index < 12; index++) {
        await page.keyboard.press('Tab')
        if (
            await copy.evaluate((element) => element === document.activeElement)
        ) {
            reached = true
            break
        }
    }
    expect(reached).toBe(true)
    await copy.click()
    await expect(
        toast.getByRole('button', { name: 'Error message copied' }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute(
        'data-copied-text',
        'Copy this error',
    )
    await expect(toast).toBeVisible()
    // Safari does not focus buttons on pointer clicks. Establish an explicit
    // entry target before checking dismissal's focus restoration contract.
    await trigger.focus()
    const close = toast.getByRole('button', { name: 'Close notification' })
    await close.focus()
    await page.keyboard.press('Enter')
    await expect(toast).toHaveCount(0)
    await expect(trigger).toBeFocused()
})

test('keeps toast corners in the viewport and actions clickable inside transformed clipped dialogs', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.locator('#parent-dialog').evaluate((element) => {
        Object.assign((element as HTMLElement).style, {
            transform: 'translate(100px, 80px)',
            overflow: 'hidden',
            width: '400px',
            height: '180px',
        })
    })
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    const viewport = page.viewportSize()!
    for (const [text, top, right] of [
        ['Inline notification', false, true],
        ['Body notification', true, false],
        ['Custom notification', true, true],
    ] as const) {
        const toast = page.getByRole('status').filter({ hasText: text })
        await expect
            .poll(async () => {
                const bounds = await toast.boundingBox()
                if (!bounds) return Infinity
                const horizontal = right
                    ? viewport.width - bounds.x - bounds.width
                    : bounds.x
                const vertical = top
                    ? bounds.y
                    : viewport.height - bounds.y - bounds.height
                return Math.abs(horizontal - 16) + Math.abs(vertical - 16)
            })
            .toBeLessThan(2)
        await toast.getByRole('button', { name: 'Close notification' }).click()
        await expect(toast).toHaveCount(0)
    }
})

test('chooses a newly opened sibling host and returns to the modal when it closes', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.getByRole('button', { name: 'Toggle custom active' }).click()
    await page
        .locator('#parent-dialog')
        .evaluate((element) => (element as HTMLDialogElement).show())
    const custom = page.locator('#custom-scope')
    await custom.evaluate((element) =>
        element.setAttribute('data-state', 'open'),
    )
    await expect(custom.locator('[role="status"]')).toHaveCount(3)
    await custom.evaluate((element) =>
        element.setAttribute('data-state', 'closed'),
    )
    await expect(page.locator('#parent-dialog [role="status"]')).toHaveCount(3)
    await page
        .getByRole('button', { name: 'Close parent', exact: true })
        .click()
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await expect(page.locator('#parent-dialog [role="status"]')).toHaveCount(3)
})

test('keeps the nested modal selected when the parent branch registers again', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await page.getByRole('button', { name: 'Open child', exact: true }).click()
    const toggle = page.locator('#toggle-parent')
    await toggle.evaluate((element) => (element as HTMLButtonElement).click())
    await expect(
        page.locator('#parent-dialog > [data-rentner-toast-focus-scope]'),
    ).toHaveCount(1)
    await toggle.evaluate((element) => (element as HTMLButtonElement).click())
    await expect(page.locator('#child-dialog [role="status"]')).toHaveCount(3)
})

test('keeps actions inside a native modal when a sibling custom scope becomes available', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Add all stores' }).click()
    await page.getByRole('button', { name: 'Toggle custom active' }).click()
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await page
        .locator('#custom-scope')
        .evaluate((element) => element.setAttribute('data-state', 'open'))
    await expect(page.locator('#parent-dialog [role="status"]')).toHaveCount(3)
    await expect(page.locator('#custom-scope [role="status"]')).toHaveCount(0)
})

test('resumes a focused timer when the mounted modal closes and moves its surface', async ({
    page,
}) => {
    const open = page.getByRole('button', { name: 'Open parent', exact: true })
    await open.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Add timed', exact: true }).click()
    const toast = page.getByRole('status')
    await toast.getByRole('button', { name: 'Close notification' }).focus()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(2300)
    await expect(toast).toBeVisible()
    await page
        .locator('#parent-dialog')
        .evaluate((element) => (element as HTMLDialogElement).close())
    await expect(page.locator('#inline-provider [role="status"]')).toHaveCount(
        1,
    )
    await expect(open).toBeFocused()
    await expect(toast).toHaveCount(0, { timeout: 4000 })
})

test('pauses a focused timed toast within the modal, then resumes after focus leaves', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    const trigger = page.getByRole('button', { name: 'Add timed', exact: true })
    await trigger.click()
    const toast = page.getByRole('status')
    await toast.getByRole('button', { name: 'Close notification' }).focus()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(2300)
    await expect(toast).toBeVisible()
    await trigger.focus()
    await expect(toast).toHaveCount(0, { timeout: 4000 })
    await expect(trigger).toBeFocused()
})
