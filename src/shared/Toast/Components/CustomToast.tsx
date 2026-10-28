import { ToastText } from './ToastText.tsx'
import { ToastIcon } from './ToastIcon.tsx'
import { Check, Copy, X } from 'lucide-react'
import type { CustomToastComponentProps } from '../Types/toast-logic.types.ts'
import { ToastActionButton } from './ToastActionButton.tsx'
import { useCustomToastLogic } from '../Hooks/useCustomToastLogic.ts'

export function CustomToast({
    toast,
    position,
    onRemove,
    customDesign,
    classNames,
    className,
    messages,
    ref,
    present = true,
    onExitComplete,
}: CustomToastComponentProps) {
    const {
        state,
        handler,
        refs: { setWrapperRef, progress },
    } = useCustomToastLogic(
        {
            toast,
            position,
            onRemove,
            customDesign,
            classNames,
            className,
            messages,
        },
        ref,
        present,
        onExitComplete,
    )

    return (
        <div
            ref={setWrapperRef}
            data-toast-id={toast.id}
            data-toast-state={present ? 'present' : 'exiting'}
            onPointerDown={handler.handlePointerDown}
            onPointerMove={handler.handlePointerMove}
            onPointerUp={handler.handlePointerUp}
            onPointerCancel={handler.handlePointerCancel}
            onLostPointerCapture={handler.handleLostPointerCapture}
            onClickCapture={handler.handleClickCapture}
            onMouseEnter={handler.handleMouseEnter}
            onMouseLeave={handler.handleMouseLeave}
            onFocusCapture={handler.handleFocus}
            onBlurCapture={handler.handleBlur}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={state.wrapperClasses}
        >
            <div className="mt-0.5 shrink-0">
                <ToastIcon
                    type={toast.type}
                    customDesign={customDesign}
                    className={classNames?.icon}
                />
            </div>

            <div
                className={`min-w-0 ${classNames?.body ?? 'flex flex-col gap-1 flex-1'}`}
            >
                {toast.title && (
                    <span
                        className={`wrap-break-word ${classNames?.title ?? `text-sm font-semibold tracking-tight ${customDesign?.titleText ?? 'text-[color:var(--rentner-foreground,#f9fafb)]'}`}`}
                    >
                        <ToastText
                            tokens={state.parsedTitle}
                            className={state.linkClassName}
                        />
                    </span>
                )}
                <span
                    className={`wrap-break-word ${classNames?.content ?? `text-sm leading-snug ${customDesign?.contentText ?? (toast.title ? 'text-[color:var(--rentner-muted,#d1d5db)]' : 'font-medium')}`}`}
                >
                    <ToastText
                        tokens={state.parsedContent}
                        className={state.linkClassName}
                    />
                </span>
            </div>

            <div
                className={
                    classNames?.actions ??
                    '-mr-1.5 -mt-1.5 flex shrink-0 items-center gap-1'
                }
            >
                {toast.type === 'error' && (
                    <ToastActionButton
                        animated={state.dragEnabled}
                        type="button"
                        onClick={handler.handleCopyError}
                        aria-label={
                            state.copied
                                ? messages.errorCopied
                                : messages.copyError
                        }
                        className={`relative group shrink-0 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentner-accent focus-visible:ring-offset-2 ${classNames?.copyButton ?? 'rounded-full p-1.5'}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute inset-0 pointer-events-none ${classNames?.buttonOverlay ?? 'rounded-full bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none'}`}
                        />
                        {state.copied ? (
                            <Check
                                size={14}
                                aria-hidden="true"
                                className={`relative z-10 transition-colors duration-300 motion-reduce:transition-none ${classNames?.copyIcon ?? customDesign?.copyButton ?? 'text-emerald-300 group-hover:text-emerald-200'}`}
                            />
                        ) : (
                            <Copy
                                size={14}
                                aria-hidden="true"
                                className={`relative z-10 transition-colors duration-300 motion-reduce:transition-none ${classNames?.copyIcon ?? customDesign?.copyButton ?? 'text-gray-400 group-hover:text-white'}`}
                            />
                        )}
                    </ToastActionButton>
                )}
                <ToastActionButton
                    animated={state.dragEnabled}
                    type="button"
                    data-toast-close=""
                    onClick={() => onRemove(toast.id)}
                    aria-label={messages.closeNotification}
                    className={`relative group shrink-0 cursor-pointer touch-manipulation overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentner-accent focus-visible:ring-offset-2 ${classNames?.closeButton ?? 'rounded-full p-1.5'}`}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute inset-0 pointer-events-none ${classNames?.buttonOverlay ?? 'rounded-full bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none'}`}
                    />
                    <div data-toast-close-icon="" className="relative z-10">
                        <X
                            size={14}
                            aria-hidden="true"
                            className={`transition-colors duration-300 motion-reduce:transition-none ${classNames?.closeIcon ?? customDesign?.closeButton ?? 'text-gray-400 group-hover:text-white'}`}
                        />
                    </div>
                </ToastActionButton>
            </div>

            {toast.duration > 0 && (
                <div
                    ref={progress}
                    aria-hidden="true"
                    data-testid="toast-progress"
                    className={`absolute bottom-0 left-0 w-full origin-left ${state.progressClasses}`}
                />
            )}
        </div>
    )
}
