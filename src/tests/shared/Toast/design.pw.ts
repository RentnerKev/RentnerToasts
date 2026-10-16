import { expect, test } from '@playwright/test'

test('renders titleless and titled text, independent button/icon slots, scoped tokens and dedupe in a custom portal', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByTestId('show-design-toasts').click()
    const host = page.getByTestId('design-toast-portal')
    const error = host.getByRole('alert')
    const success = host.getByRole('status')
    await expect(error).toHaveCount(1)
    await expect(error).toContainText('Fehler ohne Titel')
    await expect(host).not.toContainText('Wiederholter Fehler')
    await expect(success).toContainText('Text mit Titel')
    await expect(
        error.getByText('Fehler ohne Titel', { exact: true }),
    ).toHaveCSS('font-size', '18px')
    await expect(
        success.getByText('Text mit Titel', { exact: true }),
    ).toHaveCSS('font-size', '18px')
    await expect(success.getByText('Erfolgreich', { exact: true })).toHaveCSS(
        'font-size',
        '20px',
    )
    const themedBackground = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.backgroundColor =
            'color-mix(in oklab, #ffffff 95%, transparent)'
        document.body.append(probe)
        const color = getComputedStyle(probe).backgroundColor
        probe.remove()
        return color
    })
    await expect(error).toHaveCSS('background-color', themedBackground)
    await expect(error).toHaveCSS('border-radius', '0px')
    await expect(host.locator('section')).toHaveCSS('z-index', '23456')
    const close = error.getByRole('button', {
        name: 'Benachrichtigung schließen',
    })
    const copy = error.getByRole('button', { name: 'Fehlermeldung kopieren' })
    await expect(close).toHaveCSS('padding', '16px')
    await expect(copy).toHaveCSS('padding', '8px')
    await expect(close.locator('svg')).toHaveClass(/text-rose-700/)
    await expect(copy.locator('svg')).toHaveClass(/text-blue-700/)
    await close.click()
    await expect(error).toHaveCount(0)
    await expect(success).toBeVisible()
})
