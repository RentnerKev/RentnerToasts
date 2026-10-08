/* eslint-disable no-await-in-loop -- Stateful browser cases run sequentially to bound memory use. */
import { AxeBuilder } from '@axe-core/playwright'

export async function check({ page, expect }) {
    await page.setViewportSize({ width: 500, height: 640 })
    await page.getByRole('button', { name: 'Show toast' }).click()
    const toast = page.getByRole('status')
    await expect(toast).toBeVisible()
    const style = () =>
        toast.evaluate((node) => {
            const css = getComputedStyle(node)
            return {
                x: parseFloat(css.paddingLeft),
                y: parseFloat(css.paddingTop),
                width: parseFloat(css.width),
            }
        })
    expect(await style()).toEqual({ x: 16, y: 16, width: 320 })
    await page.getByLabel('Toast style').selectOption('px-8')
    await expect.poll(style).toEqual({ x: 32, y: 16, width: 320 })
    await page.getByLabel('Toast style').selectOption('py-8')
    await expect.poll(style).toEqual({ x: 16, y: 32, width: 320 })
    await page.getByLabel('Toast style').selectOption('hover:p-8')
    await expect.poll(style).toEqual({ x: 16, y: 16, width: 320 })
    await toast.hover()
    await expect.poll(style).toEqual({ x: 32, y: 32, width: 320 })
    await page.mouse.move(0, 0)
    await page.getByLabel('Toast style').selectOption('sm:w-96')
    await expect.poll(style).toEqual({ x: 16, y: 16, width: 320 })
    await page.setViewportSize({ width: 800, height: 640 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(style).toEqual({ x: 16, y: 16, width: 384 })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.getByLabel('Toast style').selectOption('')
    await expect
        .poll(async () => (await toast.boundingBox())?.width)
        .toBeLessThanOrEqual(288)
    const bounds = await toast.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
    await toast.getByRole('button', { name: 'Close notification' }).click()
    await expect(toast).toBeHidden()

    await page.setViewportSize({ width: 800, height: 640 })
    await page.getByRole('button', { name: 'Show toast', exact: true }).click()
    await expect(toast).toHaveCSS('opacity', '1')
    const dragBounds = await toast.boundingBox()
    expect(dragBounds).not.toBeNull()
    const dragX = dragBounds.x + 60
    const dragY = dragBounds.y + dragBounds.height / 2
    await page.mouse.move(dragX, dragY)
    await page.mouse.down()
    await page.mouse.move(dragX + 160, dragY, { steps: 12 })
    await expect
        .poll(async () => (await toast.boundingBox())?.x)
        .toBeGreaterThan(dragBounds.x + 60)
    await page.mouse.up()
    await expect(toast).toBeHidden()

    await page.clock.install()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(() => {
        let copiedText = ''
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                async writeText(value) {
                    copiedText = value
                },
                async readText() {
                    return copiedText
                },
            },
        })
    })
    await page.getByRole('button', { name: 'Show error toast' }).click()
    const errorToast = page.getByRole('alert')
    const copyButton = errorToast.getByRole('button', {
        name: 'Copy error message',
    })
    await copyButton.click()
    await expect
        .poll(() => page.evaluate(() => navigator.clipboard.readText()))
        .toBe('Consumer error\nConsumer error details')
    await expect(
        errorToast.getByRole('button', { name: 'Error message copied' }),
    ).toBeVisible()
    await page.clock.fastForward(1500)
    await expect(copyButton).toBeVisible()
    await copyButton.click()
    await expect(
        errorToast.getByRole('button', { name: 'Error message copied' }),
    ).toBeVisible()
    await page.evaluate(() => {
        navigator.clipboard.writeText = async () => {
            throw new Error('Clipboard permission denied')
        }
    })
    await errorToast
        .getByRole('button', { name: 'Error message copied' })
        .click()
    await expect(copyButton).toBeVisible()
    await page.clock.fastForward(1500)
    await expect(copyButton).toBeVisible()
    await errorToast.getByRole('button', { name: 'Close notification' }).click()
    await expect(errorToast).toBeHidden()

    await page
        .getByRole('button', { name: 'Show timed toast', exact: true })
        .click()
    const timed = page
        .getByRole('status')
        .filter({ hasText: 'Timed notification' })
    await timed.getByRole('button', { name: 'Close notification' }).focus()
    // Route changes can unmount a provider without first blurring the toast.
    const toggleProvider = page.getByRole('button', {
        name: 'Toggle toast provider',
    })
    await toggleProvider.dispatchEvent('click')
    await expect(timed).toHaveCount(0)
    await toggleProvider.dispatchEvent('click')
    await expect(timed).toBeVisible()
    await page.clock.fastForward(1600)
    await expect(timed).toBeHidden()

    await page
        .getByRole('button', { name: 'Show timed toast', exact: true })
        .click()
    const switched = page
        .getByRole('status')
        .filter({ hasText: 'Timed notification' })
    const switchedClose = switched.getByRole('button', {
        name: 'Close notification',
    })
    await switchedClose.focus()
    await page
        .getByRole('button', { name: 'Switch store facade' })
        .dispatchEvent('click')
    await expect(switchedClose).toBeFocused()
    await page.mouse.move(0, 0)
    await page.clock.fastForward(1600)
    await expect(switched).toBeVisible()
    await page.getByRole('button', { name: 'Switch store facade' }).focus()
    await page.clock.fastForward(1600)
    await expect(switched).toBeHidden()

    await page.getByRole('button', { name: 'Mount shared providers' }).click()
    const duration = page.getByTestId('shared-duration')
    await expect(duration).toHaveText('7000')
    await page.getByRole('button', { name: 'Update earlier defaults' }).click()
    await expect(duration).toHaveText('7000')

    await page.setViewportSize({ width: 1000, height: 640 })
    await page.getByRole('button', { name: 'Show shared timed toast' }).click()
    const earlier = page
        .getByRole('region', { name: 'Earlier display', exact: true })
        .getByRole('status')
    const later = page
        .getByRole('region', { name: 'Later display', exact: true })
        .getByRole('status')
    await later.getByRole('button', { name: 'Close notification' }).focus()
    await earlier.hover()
    await page
        .getByRole('button', { name: 'Remove earlier provider' })
        .dispatchEvent('click')
    await expect(earlier).toHaveCount(0)
    await page.mouse.move(0, 630)
    await page.clock.fastForward(1600)
    await expect(later).toBeVisible()
    await page.getByRole('button', { name: 'Mount shared providers' }).focus()
    await page.clock.fastForward(1600)
    await expect(later).toBeHidden()
    await expect(duration).toHaveText('7000')
    await page.getByRole('button', { name: 'Remove later provider' }).click()
    await expect(duration).toHaveText('1000')
}

export async function checkProviderCompatibility({ browser, url, expect }) {
    const paints = []
    for (const design of ['default', 'light']) {
        // Fresh contexts keep the first invocation cold and independent of
        // the synchronous consumer's simulated clock or module cache.
        const context = await browser.newContext({
            timezoneId: 'UTC',
            reducedMotion: 'no-preference',
        })
        const page = await context.newPage()
        try {
            const errors = []
            const scriptRequests = []
            let notificationsStarted = false
            page.on('pageerror', (error) => errors.push(String(error)))
            await page.route('**/*.js', (route) => {
                if (notificationsStarted) {
                    scriptRequests.push(route.request().url())
                    return route.abort('failed')
                }
                return route.continue()
            })
            await page.goto(`${url}/lazy.html`)
            await expect(page.locator('html')).toHaveAttribute(
                'data-hydrated',
                'true',
            )
            expect(
                await page.evaluate(() => window.consumerHydrationErrors),
            ).toEqual([])
            if (design === 'light')
                await page.getByLabel('Light design').check()
            await page.evaluate(() => {
                window.consumerToastPaints = []
                const seen = new WeakSet()
                const observer = new MutationObserver(() => {
                    for (const node of document.querySelectorAll(
                        '[role="status"], [role="alert"]',
                    )) {
                        if (seen.has(node)) continue
                        seen.add(node)
                        window.consumerToastPaints.push({
                            text: node.textContent,
                            background: getComputedStyle(node).backgroundColor,
                            classes: node.className.split(' '),
                            fallback: node.hasAttribute('data-toast-fallback'),
                            links: node.querySelectorAll('a').length,
                        })
                    }
                })
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                })
            })
            notificationsStarted = true
            for (const [variant, background] of [
                ['info', 'bg-blue-950/95'],
                ['success', 'bg-emerald-950/95'],
                ['error', 'bg-rose-950/95'],
                ['warning', 'bg-amber-950/95'],
            ]) {
                await page
                    .getByRole('button', {
                        name: `Show compatible ${variant}`,
                        exact: true,
                    })
                    .click()
                const toast = page.getByRole(
                    variant === 'error' ? 'alert' : 'status',
                )
                await expect(toast).toHaveCSS('opacity', '1')
                await expect(toast).toContainText(`${variant} title`)
                await expect(toast).toContainText('<safe content>')
                await expect(
                    toast.getByRole('link', { name: 'documentation' }),
                ).toHaveAttribute('href', 'https://example.com/docs')
                const observed = await page.evaluate(
                    (title) =>
                        window.consumerToastPaints.filter((paint) =>
                            paint.text.includes(title),
                        ),
                    `${variant} title`,
                )
                expect(observed).toHaveLength(1)
                const first = observed[0]
                expect(first.fallback).toBe(false)
                expect(first.classes).toContain(
                    design === 'light' ? 'bg-white' : background,
                )
                expect(first.links).toBe(1)
                expect(first.background).toBe(
                    await toast.evaluate(
                        (node) => getComputedStyle(node).backgroundColor,
                    ),
                )
                expect(scriptRequests).toEqual([])
                expect(errors).toEqual([])
                paints.push({ design, variant, ...first })
                if (variant === 'error') {
                    await expect(
                        toast.getByRole('button', {
                            name: 'Copy error message',
                        }),
                    ).toBeVisible()
                    expect(
                        (await new AxeBuilder({ page }).analyze()).violations,
                    ).toEqual([])
                }
                await toast
                    .getByRole('button', { name: 'Close notification' })
                    .click()
                await expect(toast).toHaveCount(0)
            }

            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.clock.install()
            await page
                .getByRole('button', { name: 'Show timed compatible toast' })
                .click()
            await page.clock.runFor(250)
            const timed = page.getByRole('status')
            await timed
                .getByRole('button', { name: 'Close notification' })
                .focus()
            await timed.hover()
            await page.clock.fastForward(1600)
            await expect(timed).toBeVisible()
            await page.mouse.move(0, 0)
            await page.clock.fastForward(1600)
            await expect(timed).toBeVisible()
            await page
                .getByRole('button', { name: 'Show timed compatible toast' })
                .focus()
            await page.clock.fastForward(1600)
            await expect(timed).toHaveCount(0)
            expect(scriptRequests).toEqual([])
            expect(errors).toEqual([])
        } finally {
            await context.close()
        }
    }
    return paints
}
