import { createToastStore } from '../../src/lib/ToastStore/toastApi.ts'
import type {
    ToastDedupeOptions,
    ToastId,
    ToastPauseReason,
    ToastStore,
    ToastType,
    UseCustomToastLogicResult,
} from '../../src/types.ts'
import {
    getToastExitAnimation,
    getToastInitialAnimation,
    toastAnimate,
    toastDragAnimation,
    toastTransition,
} from '../../src/shared/Toast/Animations/toastAnimations.ts'

const store = createToastStore()
const legacyPauseHandler: (
    id: ToastId,
    reason: 'hover' | 'focus',
    paused: boolean,
    owner?: symbol,
) => void = store.setToastPauseReason
const legacyCreateHandler: (
    content: string,
    title?: string,
    type?: ToastType,
    duration?: number,
    options?: ToastDedupeOptions,
) => ToastId = store.createToast
const legacyCustomStore: ToastStore = {
    ...store,
    createToast: legacyCreateHandler,
    setToastPauseReason: legacyPauseHandler,
}
void legacyCustomStore

function exhaustiveLegacyPauseReason(reason: ToastPauseReason): boolean {
    switch (reason) {
        case 'hover':
            return true
        case 'focus':
            return false
        default: {
            const exhaustive: never = reason
            return exhaustive
        }
    }
}
void exhaustiveLegacyPauseReason

// This is the complete v3.8.1 result shape, without action-specific members.
const legacyLogicResult: UseCustomToastLogicResult = {
    state: {
        copied: false,
        wrapperClasses: '',
        toastIcon: null,
        progressClasses: '',
        parsedTitle: null,
        parsedContent: null,
        startingScale: 1,
        progressDuration: 0,
        isTimerRunning: false,
        initialAnimation: getToastInitialAnimation('bottom-right'),
        animate: toastAnimate,
        exitAnimation: getToastExitAnimation('bottom-right'),
        transition: toastTransition,
        dragAnimation: toastDragAnimation,
        dragEnabled: true,
    },
    handler: {
        handleCopyError: () => {},
        handleDragEnd: () => {},
        handleMouseEnter: () => {},
        handleMouseLeave: () => {},
        handleFocus: () => {},
        handleBlur: () => {},
    },
}
void legacyLogicResult
store.dispose()
