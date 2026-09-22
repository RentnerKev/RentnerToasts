# @rentnerkev/toasts

Accessible and customizable React toast notifications with four status variants, progress indicators, safe Markdown links, localization, and Tailwind CSS styling.

## Installation

Install the package with npm:

```bash
npm install @rentnerkev/toasts
```

Or with Bun:

```bash
bun add @rentnerkev/toasts
```

React, React DOM, Motion, and Lucide React are peer dependencies supplied by the consuming application.

## Set up the provider

Render `ToastProvider` once above the part of the application that creates notifications:

```tsx
import { ToastProvider } from '@rentnerkev/toasts'

export function App() {
    return (
        <ToastProvider position="bottom-right" locale="en">
            <MainApp />
        </ToastProvider>
    )
}
```

## Show a toast

The namespace API provides a named method for each status variant. Every method returns the new toast ID:

```tsx
import { toast } from '@rentnerkev/toasts'

const toastId = toast.success('Your changes were saved.', {
    title: 'Saved',
    duration: 5000,
})
```

The imperative methods are intended for browser event handlers and other client-only functions. The store lives once per JavaScript process, so never call them during server rendering. Guard any mount effect against React Strict Mode's repeated development execution to avoid creating duplicate toasts.

## Dismiss and update toasts

Dismiss one toast by ID, or clear visible and queued toasts together with all expiration timers:

```tsx
toast.dismiss(toastId)
toast.dismissAll()
```

`update()` keeps the toast ID and position. Only provided fields change; `title: null` removes an existing title. A new `duration` restarts expiration and the progress indicator:

```tsx
const updated = toast.update(toastId, {
    content: 'The file was saved.',
    title: 'Complete',
    type: 'success',
    duration: 4000,
})
```

The method returns `false` for an unknown or already dismissed ID and `true` after a successful update.

## Track a promise

`toast.promise()` immediately creates a persistent info toast, then updates the same ID to `success` or `error`. The returned promise preserves the original fulfillment value or rejection reason:

```tsx
const user = await toast.promise(
    () => fetch('/api/user').then((response) => response.json()),
    {
        loading: 'Loading user…',
        success: (result) => ({
            content: `${result.name} was loaded.`,
            title: 'Complete',
        }),
        error: (error) => ({
            content: error instanceof Error ? error.message : 'Unknown error',
            title: 'Loading failed',
        }),
        duration: 5000,
    },
)
```

The `success` and `error` values accept text, an object containing `content`, `title`, and `duration`, or a resolver function. A status-specific duration overrides the shared duration. If the loading toast is dismissed before the promise settles, it is not recreated.

## Variants, duration, and compatibility

Available variants are `success`, `error`, `info`, and `warning`. Each shorthand method uses the same option shape:

```ts
toast.info(content: string, options?: ToastOptions): ToastId
```

The previous positional API remains available as a backward-compatible alias:

```ts
customToast(
    content: string,
    title?: string,
    type?: ToastType,
    duration?: number,
): ToastId
```

`removeToast(toastId)` also remains available as the compatible single-toast removal function.

The default duration is 6000 milliseconds. Set `duration: 0` to disable automatic expiration. Negative, non-finite, and otherwise invalid values fall back to the default; positive values are capped at a safe `setTimeout` limit.

## Localization

German accessible system messages remain the default for backward compatibility. Set `locale="en"` for the English catalog, or override individual messages with a typed `Partial<ToastMessages>`:

```tsx
<ToastProvider
    locale="en"
    messages={{ closeNotification: 'Dismiss notification' }}
>
    <App />
</ToastProvider>
```

The message catalog and resolver are exported as `toastMessageCatalog` and `resolveToastMessages`.

## `ToastProvider` props

| Prop           | Type                     | Default          | Description                                             |
| -------------- | ------------------------ | ---------------- | ------------------------------------------------------- |
| `position`     | `ToastPosition`          | `'bottom-right'` | Screen position used for the toast stack.               |
| `customDesign` | `ToastCustomDesign`      | `undefined`      | Overrides Tailwind classes for individual visual parts. |
| `className`    | `string`                 | `undefined`      | Additional Tailwind classes applied to every toast.     |
| `locale`       | `'de' \| 'en'`           | `'de'`           | Selects the accessible system-message catalog.          |
| `messages`     | `Partial<ToastMessages>` | `undefined`      | Overrides individual system messages.                   |
| `children`     | `ReactNode`              | -                | Application content rendered by the provider.           |

## Tailwind CSS

Import the package entry after Tailwind CSS in your application stylesheet:

```css
@import 'tailwindcss';
@import '@rentnerkev/toasts/tailwind.css';
```

The package entry scans only the published JavaScript under `dist` and provides the shared theme tokens `primary`, `primary-hover`, `background-dark`, `surface-dark`, `input-dark`, `border-dark`, `secondary-text`, and `muted-foreground`. Override them with a later `@theme` block when needed.

### Custom design

Design overrides are Tailwind class strings:

```tsx
const customDesign = {
    successWrapper: 'border-l-4 border-green-500 bg-green-100',
    successProgress: 'bg-green-600',
    linkText: 'text-blue-600 hover:underline',
    titleText: 'font-bold text-green-900',
    contentText: 'text-green-700',
    closeButton: 'text-green-500 hover:text-green-700',
    copyButton: 'text-blue-500 hover:text-blue-700',
}

<ToastProvider customDesign={customDesign}>
    <App />
</ToastProvider>
```

Available `ToastCustomDesign` fields:

| Fields                                                                | Purpose                                  |
| --------------------------------------------------------------------- | ---------------------------------------- |
| `successWrapper`, `errorWrapper`, `infoWrapper`, `warningWrapper`     | Toast container classes for each status. |
| `successIcon`, `errorIcon`, `infoIcon`, `warningIcon`                 | Status icon classes.                     |
| `successProgress`, `errorProgress`, `infoProgress`, `warningProgress` | Progress indicator classes.              |
| `titleText`                                                           | Title classes.                           |
| `contentText`                                                         | Content classes.                         |
| `linkText`                                                            | Markdown link classes.                   |
| `closeButton`                                                         | Dismiss button classes.                  |
| `copyButton`                                                          | Error-copy button classes.               |

## Links and accessibility

Markdown links written as `[label](URL)` are interactive and open in a new tab. Only `http` and `https` URLs become links; unsupported schemes remain visible as plain text.

```tsx
toast.info('Open [the ticket](https://example.com/tickets/45).', {
    title: 'New ticket',
})
```

Error toasts also provide a button that copies the title and content. Normal notifications use a polite live region; errors use an assertive announcement.

## TypeScript

Public types are available from the package root:

```tsx
import type {
    ToastApi,
    ToastContentOptions,
    ToastCustomDesign,
    ToastId,
    ToastLocale,
    ToastMessages,
    ToastOptions,
    ToastPosition,
    ToastPromiseOptions,
    ToastProviderProps,
    ToastType,
    ToastUpdateOptions,
} from '@rentnerkev/toasts'
```

## Public entry points

| Entry point                       | Purpose                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `@rentnerkev/toasts`              | Provider, namespace API, compatibility functions, messages, and public types. |
| `@rentnerkev/toasts/toast`        | Namespace API and compatibility functions.                                    |
| `@rentnerkev/toasts/messages`     | Locale catalog, resolver, and message types.                                  |
| `@rentnerkev/toasts/types`        | Toast API, provider, and design types.                                        |
| `@rentnerkev/toasts/tailwind.css` | Tailwind source and shared theme tokens.                                      |
| `@rentnerkev/toasts/package.json` | Package metadata.                                                             |

## Development

```bash
bun install
bun run verify
bun run playground:dev
```

`bun run verify` checks types, lint, formatting, tests, the package build, and the published package contents. The playground remains a local development and test environment and is not included in the npm package.

## License

MIT. See [LICENSE](./LICENSE).
