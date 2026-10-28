import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const browserErrors = new WeakMap<Page, string[]>()

test.beforeEach(({ page }) => {
    const errors: string[] = []
    browserErrors.set(page, errors)
    page.on('pageerror', (error) => errors.push(error.message))
})

test.afterEach(({ page }) => {
    expect(browserErrors.get(page)).toEqual([])
})

async function openFixture(page: Page, position = 'bottom-right') {
    await page.route('**/native-animation-fixture?*', (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/src/animationFixture.tsx"></script></body></html>`,
        }),
    )
    await page.goto(`/native-animation-fixture?position=${position}`)
    await expect(
        page.getByRole('button', { name: 'First', exact: true }),
    ).toBeVisible()
}

async function settled(toast: Locator) {
    await expect(toast).toHaveCSS('opacity', '1')
    await expect
        .poll(() =>
            toast.evaluate((element) => {
                const matrix = new DOMMatrix(
                    getComputedStyle(element).transform,
                )
                return (
                    Math.abs(matrix.m41) +
                    Math.abs(matrix.m42) +
                    Math.abs(matrix.a - 1)
                )
            }),
        )
        .toBeLessThan(0.5)
}

async function drag(page: Page, toast: Locator, distance: number) {
    const bounds = await toast.boundingBox()
    expect(bounds).not.toBeNull()
    const x = bounds!.x + bounds!.width / 2
    const y = bounds!.y + bounds!.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + distance, y, { steps: 12 })
    await page.waitForTimeout(150)
    await page.mouse.up()
    await page.mouse.move(0, 0)
}

async function timedSwipe(
    page: Page,
    toast: Locator,
    movementMs: number,
    releaseMs = movementMs,
) {
    const bounds = (await toast.boundingBox())!
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await toast.evaluate((element) => {
        element.addEventListener(
            'pointerdown',
            (event) => {
                // Keep a real active pointer for setPointerCapture, while the gesture
                // clock stays independent of browser/CI scheduling delays.
                Object.defineProperty(event, 'timeStamp', { value: 1000 })
                element.setAttribute(
                    'data-test-pointer-id',
                    String(event.pointerId),
                )
            },
            { once: true, capture: true },
        )
    })
    await page.mouse.move(x, y)
    await page.mouse.down()
    await toast.evaluate(
        (element, timing) => {
            const recordedPointerId = element.getAttribute(
                'data-test-pointer-id',
            )
            element.removeAttribute('data-test-pointer-id')
            const pointerId = Number(recordedPointerId)
            if (recordedPointerId === null || !Number.isFinite(pointerId))
                throw new Error('Real pointerdown was not captured')
            function dispatch(type: string, clientX: number, time: number) {
                const event = new PointerEvent(type, {
                    pointerId,
                    pointerType: 'mouse',
                    isPrimary: true,
                    button: 0,
                    buttons: type === 'pointerup' ? 0 : 1,
                    clientX,
                    clientY: timing.y,
                    bubbles: true,
                })
                Object.defineProperty(event, 'timeStamp', {
                    value: 1000 + time,
                })
                element.dispatchEvent(event)
            }
            dispatch('pointermove', timing.x - 5, 10)
            dispatch('pointermove', timing.x - 65, timing.movementMs)
            dispatch('pointerup', timing.x - 65, timing.releaseMs)
        },
        { x, y, movementMs, releaseMs },
    )
    await page.mouse.up()
    await page.mouse.move(0, 0)
}

test('enters from the selected corner and reaches its resting position', async ({
    page,
}) => {
    await openFixture(page)
    const frames = await page.evaluate(async () => {
        const samples: {
            opacity: number
            x: number
            y: number
            scale: number
        }[] = []
        const button = [...document.querySelectorAll('button')].find(
            (element) => element.textContent === 'First',
        )!
        button.click()
        await new Promise<void>((resolve) => {
            const start = performance.now()
            function sample() {
                const element = document.querySelector('[role="status"]')
                if (element) {
                    const style = getComputedStyle(element)
                    const matrix = new DOMMatrix(style.transform)
                    samples.push({
                        opacity: Number(style.opacity),
                        x: matrix.m41,
                        y: matrix.m42,
                        scale: matrix.a,
                    })
                }
                if (performance.now() - start < 650)
                    requestAnimationFrame(sample)
                else resolve()
            }
            requestAnimationFrame(sample)
        })
        return samples
    })
    expect(
        frames.some(
            (frame) =>
                frame.opacity < 0.9 &&
                frame.x > 10 &&
                frame.y > 10 &&
                frame.scale < 0.99,
        ),
    ).toBe(true)
    await settled(page.getByRole('status'))
})

test('keeps the final dismissed toast mounted through its fade-out', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    const node = await toast.elementHandle()
    await toast
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .click()
    expect(await node!.evaluate((element) => element.isConnected)).toBe(true)
    await expect
        .poll(() =>
            node!.evaluate(
                (element) =>
                    !element.isConnected ||
                    Number(getComputedStyle(element).opacity) < 0.9,
            ),
        )
        .toBe(true)
    await expect(toast).toHaveCount(0)
})

for (const position of [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
]) {
    test(`preserves stack alignment and closes the gap at ${position}`, async ({
        page,
    }) => {
        await openFixture(page, position)
        await page.getByRole('button', { name: 'First', exact: true }).click()
        await page.getByRole('button', { name: 'Second', exact: true }).click()
        const first = page
            .getByRole('status')
            .filter({ hasText: 'First sticky' })
        const second = page
            .getByRole('status')
            .filter({ hasText: 'Second sticky' })
        await settled(first)
        await settled(second)
        const a = (await first.boundingBox())!
        const b = (await second.boundingBox())!
        expect(Math.abs(a.x - b.x)).toBeLessThan(1)
        expect(Math.abs(a.y - b.y)).toBeGreaterThan(a.height)
        const viewport = page.viewportSize()!
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x + a.width).toBeLessThanOrEqual(viewport.width)
        expect(
            position.includes('right') ? viewport.width - a.x - a.width : a.x,
        ).toBeLessThan(30)
        const edge = position.includes('top')
            ? Math.min(a.y, b.y)
            : viewport.height - Math.max(a.y + a.height, b.y + b.height)
        expect(edge).toBeLessThan(30)
        await first
            .getByRole('button', { name: 'Benachrichtigung schließen' })
            .click()
        await expect(first).toHaveCount(0)
        await expect
            .poll(async () => {
                const bounds = (await second.boundingBox())!
                return position.includes('top')
                    ? bounds.y
                    : viewport.height - bounds.y - bounds.height
            })
            .toBeLessThan(30)
        await expect(second).toBeVisible()
    })
}

test('snaps a short slow swipe back and dismisses a long swipe', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    const original = (await toast.boundingBox())!
    await drag(page, toast, -35)
    await settled(toast)
    expect(Math.abs((await toast.boundingBox())!.x - original.x)).toBeLessThan(
        1,
    )
    await drag(page, toast, -120)
    await expect(toast).toHaveCount(0)
})

test('dismisses a fast swipe below the distance threshold', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    await timedSwipe(page, toast, 50)
    await expect(toast).toHaveCount(0)
})

test('keeps a slow swipe below both dismissal thresholds', async ({ page }) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    await timedSwipe(page, toast, 500)
    await settled(toast)
    await expect(toast).toBeVisible()
})

test('forgets swipe velocity after the pointer rests before release', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    await timedSwipe(page, toast, 50, 500)
    await settled(toast)
    await expect(toast).toBeVisible()
})

test('continues smoothly when a swipe interrupts its snap-back', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    await drag(page, toast, -60)
    const before = (await toast.boundingBox())!
    const x = before.x + before.width / 2
    const y = before.y + before.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    const held = (await toast.boundingBox())!
    await page.mouse.move(x - 5, y)
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
            ),
    )
    const continued = (await toast.boundingBox())!
    expect(Math.abs(continued.x - held.x)).toBeLessThan(15)
    await page.mouse.move(x - 130, y)
    await page.mouse.up()
    await expect(toast).toHaveCount(0)
})

test('keeps one working stack when the portal container changes', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    await page.getByRole('button', { name: 'Second', exact: true }).click()
    await settled(page.getByRole('status').first())
    await page
        .getByRole('button', { name: 'Switch portal', exact: true })
        .click()
    await expect(page.locator('[data-rentner-toast-region]')).toHaveCount(1)
    await expect(page.getByRole('status')).toHaveCount(2)
    const first = page.getByRole('status').filter({ hasText: 'First sticky' })
    const second = page.getByRole('status').filter({ hasText: 'Second sticky' })
    await settled(first)
    await settled(second)
    await first
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .click()
    await expect(first).toHaveCount(0)
    await expect
        .poll(async () => {
            const bounds = (await second.boundingBox())!
            return page.viewportSize()!.height - bounds.y - bounds.height
        })
        .toBeLessThan(30)
    await page
        .getByRole('button', { name: 'Switch portal', exact: true })
        .click()
    await expect(page.locator('[data-rentner-toast-region]')).toHaveCount(1)
    await settled(second)
    await second
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .click()
    await expect(page.getByRole('status')).toHaveCount(0)
})

test('keeps link and copy actions usable without starting a swipe', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    const toast = page.getByRole('alert')
    await settled(toast)
    const link = toast.getByRole('link', { name: 'a link' })
    await expect(link).toHaveAttribute('href', 'https://example.com/toast')
    await link.evaluate((element) =>
        element.addEventListener('click', (event) => event.preventDefault()),
    )
    await link.click()
    await toast.getByRole('button', { name: 'Fehlermeldung kopieren' }).click()
    await expect(toast).toBeVisible()
    await settled(toast)
    await toast
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .click()
    await expect(toast).toHaveCount(0)
})

test('animates close button hover, icon rotation, and press feedback', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    const close = toast.getByRole('button', {
        name: 'Benachrichtigung schließen',
    })
    await close.hover()
    await expect
        .poll(() =>
            close.evaluate(
                (element) =>
                    new DOMMatrix(getComputedStyle(element).transform).a,
            ),
        )
        .toBeGreaterThan(1.1)
    await expect
        .poll(() =>
            close.locator('svg').evaluate((element) => {
                const matrix = new DOMMatrix(
                    getComputedStyle(element.parentElement!).transform,
                )
                return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
            }),
        )
        .toBeGreaterThan(85)
    await page.mouse.down()
    await expect
        .poll(() =>
            close.evaluate(
                (element) =>
                    new DOMMatrix(getComputedStyle(element).transform).a,
            ),
        )
        .toBeLessThan(0.9)
    await page.mouse.up()
    await expect(toast).toHaveCount(0)
})

test('freezes progress on hover and focus, then resumes from the remaining time', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'Timed', exact: true }).click()
    const toast = page.getByRole('status')
    const progress = toast.getByTestId('toast-progress')
    await settled(toast)
    const scale = () =>
        progress.evaluate(
            (element) => new DOMMatrix(getComputedStyle(element).transform).a,
        )
    await toast.hover()
    const paused = await scale()
    await page.waitForTimeout(400)
    expect(Math.abs((await scale()) - paused)).toBeLessThan(0.025)
    await toast
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .focus()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    expect(Math.abs((await scale()) - paused)).toBeLessThan(0.025)
    await page.getByRole('button', { name: 'Timed', exact: true }).focus()
    await expect.poll(scale).toBeLessThan(paused - 0.05)
    await expect(toast).toHaveCount(0, { timeout: 4500 })
})

test('disables displacement and swipe after reduced motion changes at runtime', async ({
    page,
}) => {
    await openFixture(page)
    await page.getByRole('button', { name: 'First', exact: true }).click()
    const toast = page.getByRole('status')
    await settled(toast)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(toast).toHaveCSS('transform', 'none')
    await drag(page, toast, -120)
    await expect(toast).toBeVisible()
    await expect(toast).toHaveCSS('transform', 'none')
    await toast
        .getByRole('button', { name: 'Benachrichtigung schließen' })
        .click()
    await expect(toast).toHaveCount(0)
})
