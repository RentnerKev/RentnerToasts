import { expect, test } from 'bun:test'
import { captureToastPresentation } from '../../../lib/ToastText/toastPresentation.ts'
import { resolveToastMessages } from '../../../lib/Messages/toastMessages.ts'
import type {
    ToastClassNames,
    ToastCustomDesign,
} from '../../../shared/Toast/Types/toast-ui.types.ts'

test('presentation snapshots detect in-place slot edits without changing their original inputs', () => {
    const design = { infoWrapper: 'before', titleText: '' }
    const slots = { content: 'before-content', closeButton: '' }
    const before = captureToastPresentation(design, slots)
    design.infoWrapper = 'after'
    slots.content = ''
    const after = captureToastPresentation(design, slots)
    expect(before.design.infoWrapper).toBe('before')
    expect(after.design.infoWrapper).toBe('after')
    expect(after.design.titleText).toBe('')
    expect(before.classNames.content).toBe('before-content')
    expect(after.classNames.content).toBe('')
    expect(after.classNames.closeButton).toBe('')
    expect(after.hasAccessors).toBe(false)
})

test('design and slot capture preserve inherited and nonenumerable lookup semantics', () => {
    const parent = { infoWrapper: 'inherited-wrapper' }
    const design: ToastCustomDesign = Object.create(parent)
    Object.defineProperty(design, 'titleText', { value: 'nonenumerable-title' })
    const slotParent = { content: 'inherited-content' }
    const slots: ToastClassNames = Object.create(slotParent)
    Object.defineProperty(slots, 'closeIcon', { value: '' })
    const before = captureToastPresentation(design, slots)
    expect(before.design.infoWrapper).toBe('inherited-wrapper')
    expect(before.design.titleText).toBe('nonenumerable-title')
    expect(before.classNames.content).toBe('inherited-content')
    expect(before.classNames.closeIcon).toBe('')
    parent.infoWrapper = 'changed-wrapper'
    slotParent.content = 'changed-content'
    const after = captureToastPresentation(design, slots)
    expect(after.design.infoWrapper).toBe('changed-wrapper')
    expect(after.classNames.content).toBe('changed-content')
    expect(before.design.infoWrapper).toBe('inherited-wrapper')
})

test('accessors force live rendering without eagerly calling even unused or inherited getters', () => {
    let reads = 0
    const design: ToastCustomDesign = Object.create({
        get infoWrapper() {
            reads++
            return 'live'
        },
    })
    const slots: ToastClassNames = {
        get content() {
            throw new Error('must only be read by the toast')
        },
    }
    expect(captureToastPresentation(design, slots).hasAccessors).toBe(true)
    expect(reads).toBe(0)
    expect(design.infoWrapper).toBe('live')
    expect(reads).toBe(1)
})

test('messages keep spread semantics for getters, inherited/nonenumerable fields and empty overrides', () => {
    let reads = 0
    const inherited = { closeNotification: 'inherited, ignored' }
    const messages = Object.create(inherited)
    Object.defineProperty(messages, 'copyError', {
        value: 'nonenumerable, ignored',
    })
    Object.defineProperty(messages, 'regionLabel', {
        enumerable: true,
        get() {
            reads++
            return ''
        },
    })
    const resolved = resolveToastMessages('en', messages)
    expect(reads).toBe(1)
    expect(resolved.regionLabel).toBe('')
    expect(resolved.closeNotification).toBe('Close notification')
    expect(resolved.copyError).toBe('Copy error message')
})
