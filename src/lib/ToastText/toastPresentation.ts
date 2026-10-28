import type {
    ToastClassNames,
    ToastCustomDesign,
} from '../../shared/Toast/Types/toast-ui.types.ts'
import type { ToastPresentationSnapshot } from '../../shared/Toast/Types/toast-logic.types.ts'

const designFields: Record<keyof ToastCustomDesign, true> = {
    wrapper: true,
    successWrapper: true,
    errorWrapper: true,
    infoWrapper: true,
    warningWrapper: true,
    successIcon: true,
    errorIcon: true,
    infoIcon: true,
    warningIcon: true,
    successProgress: true,
    errorProgress: true,
    infoProgress: true,
    warningProgress: true,
    titleText: true,
    contentText: true,
    closeButton: true,
    copyButton: true,
    linkText: true,
}
const slotFields: Record<keyof ToastClassNames, true> = {
    region: true,
    root: true,
    icon: true,
    body: true,
    title: true,
    content: true,
    actions: true,
    closeButton: true,
    closeIcon: true,
    copyButton: true,
    copyIcon: true,
    buttonOverlay: true,
    progress: true,
    link: true,
}
const designKeys = Object.keys(designFields) as (keyof ToastCustomDesign)[]
const slotKeys = Object.keys(slotFields) as (keyof ToastClassNames)[]

function captureFields<T extends object>(
    source: T | undefined,
    keys: (keyof T)[],
) {
    const values = {} as T
    let hasAccessors = false
    for (const key of keys) {
        let owner = source
        let accessor = false
        while (owner) {
            const descriptor = Object.getOwnPropertyDescriptor(owner, key)
            if (descriptor) {
                accessor = 'get' in descriptor || 'set' in descriptor
                break
            }
            owner = Object.getPrototypeOf(owner)
        }
        // Calling getters here would move their evaluation out of each toast,
        // and would also invoke unused getters. Accessor-backed slots retain
        // the original live rendering and deliberately bypass memo instead.
        if (accessor) hasAccessors = true
        else values[key] = source?.[key] as T[keyof T]
    }
    return { values, hasAccessors }
}

export function captureToastPresentation(
    design?: ToastCustomDesign,
    classNames?: ToastClassNames,
): ToastPresentationSnapshot {
    const capturedDesign = captureFields(design, designKeys)
    const capturedSlots = captureFields(classNames, slotKeys)
    return {
        design: capturedDesign.values,
        classNames: capturedSlots.values,
        hasAccessors: capturedDesign.hasAccessors || capturedSlots.hasAccessors,
    }
}
