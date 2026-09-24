import { Check, Copy, X } from 'lucide-react'
import type { Ref } from 'react'
import type { CustomToastProps } from '../types.js'
import { motion } from 'motion/react'
import {
    closeButtonIconTransition,
    closeButtonIconVariants,
} from '../Animations/toastAnimations.js'
import { useCustomToastLogic } from '../Hooks/useCustomToastLogic.js'

type CustomToastComponentProps = CustomToastProps & {
    ref?: Ref<HTMLDivElement>
}

export function CustomToast({
    toast,
    position,
    onRemove,
    customDesign,
    className,
    messages,
    ref,
}: CustomToastComponentProps) {
    const { state, handler } = useCustomToastLogic({
        toast,
        position,
        onRemove,
        customDesign,
        className,
        messages,
    })

    return (
        <motion.div
            ref={ref}
            layout="position"
            initial={state.initialAnimation}
            animate={state.animate}
            exit={state.exitAnimation}
            transition={state.transition}
            drag={state.dragEnabled ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            whileDrag={state.dragAnimation}
            onDragEnd={handler.handleDragEnd}
            onMouseEnter={handler.handleMouseEnter}
            onMouseLeave={handler.handleMouseLeave}
            onFocusCapture={handler.handleFocus}
            onBlurCapture={handler.handleBlur}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={state.wrapperClasses}
        >
            <div className="mt-0.5 shrink-0">{state.toastIcon}</div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
                {toast.title && (
                    <span
                        className={`text-sm font-semibold tracking-tight wrap-break-word ${customDesign?.titleText || 'text-gray-50'}`}
                    >
                        {state.parsedTitle}
                    </span>
                )}
                <span
                    className={`text-sm wrap-break-word leading-snug ${toast.title ? customDesign?.contentText || 'text-gray-300' : 'font-medium'}`}
                >
                    {state.parsedContent}
                </span>
            </div>

            <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center gap-1">
                {toast.type === 'error' && (
                    <motion.button
                        type="button"
                        onClick={handler.handleCopyError}
                        whileHover={
                            state.dragEnabled ? { scale: 1.15 } : undefined
                        }
                        whileTap={
                            state.dragEnabled ? { scale: 0.85 } : undefined
                        }
                        aria-label={
                            state.copied
                                ? messages.errorCopied
                                : messages.copyError
                        }
                        className="relative group shrink-0 cursor-pointer touch-manipulation rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
                    >
                        <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
                        {state.copied ? (
                            <Check
                                size={14}
                                aria-hidden="true"
                                className={`relative z-10 transition-colors duration-300 motion-reduce:transition-none ${customDesign?.copyButton || 'text-emerald-300 group-hover:text-emerald-200'}`}
                            />
                        ) : (
                            <Copy
                                size={14}
                                aria-hidden="true"
                                className={`relative z-10 transition-colors duration-300 motion-reduce:transition-none ${customDesign?.copyButton || 'text-gray-400 group-hover:text-white'}`}
                            />
                        )}
                    </motion.button>
                )}
                <motion.button
                    type="button"
                    onClick={() => onRemove(toast.id)}
                    whileHover={state.dragEnabled ? { scale: 1.15 } : undefined}
                    whileTap={state.dragEnabled ? { scale: 0.85 } : undefined}
                    aria-label={messages.closeNotification}
                    className="relative group shrink-0 cursor-pointer touch-manipulation overflow-hidden rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
                >
                    <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
                    <motion.div
                        transition={closeButtonIconTransition}
                        variants={closeButtonIconVariants}
                        initial="idle"
                        whileHover={state.dragEnabled ? 'hover' : undefined}
                        className="relative z-10"
                    >
                        <X
                            size={14}
                            aria-hidden="true"
                            className={`transition-colors duration-300 motion-reduce:transition-none ${customDesign?.closeButton || 'text-gray-400 group-hover:text-white'}`}
                        />
                    </motion.div>
                </motion.button>
            </div>

            {toast.duration > 0 && (
                <motion.div
                    key={`${toast.id}-${toast.createdAt}`}
                    initial={{ scaleX: state.startingScale }}
                    animate={{
                        scaleX: state.isTimerRunning ? 0 : state.startingScale,
                    }}
                    transition={{
                        duration: state.isTimerRunning
                            ? state.progressDuration
                            : 0,
                        ease: 'linear',
                    }}
                    aria-hidden="true"
                    data-testid="toast-progress"
                    className={`absolute bottom-0 left-0 h-1 w-full origin-left ${state.progressClasses}`}
                />
            )}
        </motion.div>
    )
}
