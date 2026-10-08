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
