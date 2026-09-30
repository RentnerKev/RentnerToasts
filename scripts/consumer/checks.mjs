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
}
