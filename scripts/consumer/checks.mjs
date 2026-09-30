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

    await page.clock.install()
    await page.emulateMedia({ reducedMotion: 'reduce' })
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
