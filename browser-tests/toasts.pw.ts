import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('toast playground', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('announces toast variants and has no axe violations', async ({
        page,
    }) => {
        await page.getByTestId('show-toasts').click()

        await expect(page.getByRole('status')).toHaveCount(2)
        await expect(page.getByRole('alert')).toHaveCount(1)
        await expect(page.getByRole('status').first()).toContainText(
            'Alles gut gelaufen',
        )

        const results = await new AxeBuilder({ page })
            .include('[role="region"]')
            .analyze()

        expect(results.violations).toEqual([])
    })

    test('supports keyboard dismissal with a visible focus state', async ({
        page,
    }) => {
        await page.getByTestId('show-toasts').click()

        const toastToDismiss = page
            .getByRole('status')
            .filter({ hasText: 'Alles gut gelaufen' })
        const closeButton = toastToDismiss.getByRole('button', {
            name: 'Benachrichtigung schließen',
        })
        await page.evaluate(() => {
            const firstButton = document.querySelector('button')
            firstButton?.focus()
        })

        for (let index = 0; index < 20; index += 1) {
            if (
                // Tab order must be observed one step at a time.
                // eslint-disable-next-line no-await-in-loop
                await closeButton.evaluate(
                    (element) => document.activeElement === element,
                )
            ) {
                break
            }

            // Tab order must be observed one step at a time.
            // eslint-disable-next-line no-await-in-loop
            await page.keyboard.press('Tab')
        }

        await expect(closeButton).toBeFocused()

        const focusStyle = await closeButton.evaluate((element) => {
            const style = getComputedStyle(element)
            return {
                outlineStyle: style.outlineStyle,
                boxShadow: style.boxShadow,
            }
        })

        expect(
            focusStyle.outlineStyle !== 'none' ||
                focusStyle.boxShadow !== 'none',
        ).toBe(true)

        await page.keyboard.press('Enter')
        await expect(toastToDismiss).toBeHidden()
    })

    test('pauses a linked toast on hover and keyboard focus', async ({
        page,
    }) => {
        await page.clock.install()
        await page.getByTestId('show-link-toast').click()
        const linkedToast = page.getByRole('status').filter({
            hasText: 'Das ist der Link',
        })

        await linkedToast.hover()
        await page.clock.fastForward(7000)
        await expect(linkedToast).toBeVisible()

        await page.mouse.move(0, 0)
        await linkedToast.getByRole('link').focus()
        await page.clock.fastForward(7000)
        await expect(linkedToast).toBeVisible()

        await page.getByTestId('dismiss-all').focus()
        await page.clock.fastForward(7000)
        await expect(linkedToast).toBeHidden()
    })

    test('honors reduced motion for toast transforms and progress', async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.getByTestId('show-toasts').click()

        const toast = page.getByRole('status').first()
        await expect(toast).toBeVisible()
        await expect
            .poll(() =>
                toast.evaluate(
                    (element) => getComputedStyle(element).transform,
                ),
            )
            .toBe('none')

        const progress = toast.locator('[data-testid="toast-progress"]')
        await expect(progress).toHaveCount(1)
        await expect
            .poll(() =>
                progress.evaluate(
                    (element) => getComputedStyle(element).transitionDuration,
                ),
            )
            .toBe('0s')
    })

    test('toggles the playground theme without losing the toast provider', async ({
        page,
    }) => {
        const themeButton = page.getByRole('button', { name: 'Light mode' })
        await expect(themeButton).toHaveAttribute('aria-pressed', 'true')
        await themeButton.click()
        await expect(
            page.getByRole('button', { name: 'Dark mode' }),
        ).toHaveAttribute('aria-pressed', 'false')

        await page.getByTestId('show-link-toast').click()
        await expect(page.getByRole('status')).toContainText('Das ist der Link')
    })
})
