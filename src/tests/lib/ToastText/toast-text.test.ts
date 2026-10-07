import { describe, expect, test } from 'bun:test'
import {
    parseToastText,
    isSafeToastLink,
} from '../../../lib/ToastText/toastText'
import { hasTailwindUtility } from '../../../lib/ToastText/tailwindUtility'
describe('toast text helpers', () => {
    test('retains text and refuses script links while preserving safe and relative links', () => {
        expect(
            parseToastText(
                'Hello [ticket](/ticket/1), [bad](javascript:alert)',
            ),
        ).toEqual([
            { kind: 'text', value: 'Hello ' },
            { kind: 'link', value: 'ticket', href: '/ticket/1', offset: 6 },
            { kind: 'text', value: ', ' },
            { kind: 'text', value: '[bad](javascript:alert)' },
        ])
        expect(isSafeToastLink('data:text/html,test')).toBe(false)
        expect(parseToastText(undefined)).toEqual([])
        expect(parseToastText('[a](https://example.com)')).toEqual(
            parseToastText('[a](https://example.com)'),
        )
    })
    test('conditional variants retain defaults and arbitrary colons are utility content', () => {
        expect(hasTailwindUtility('md:w-40 hover:p-2', 'w')).toBe(false)
        expect(hasTailwindUtility('!w-40', 'w')).toBe(true)
        expect(hasTailwindUtility('w-[calc(var(--size):2)]!', 'w')).toBe(true)
        expect(hasTailwindUtility('px-4', 'p')).toBe(false)
    })
})
