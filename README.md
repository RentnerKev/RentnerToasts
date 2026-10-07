# @rentnerkev/toasts

Accessible and customizable React toast notifications with four status variants, progress indicators, safe Markdown links, localization, and Tailwind CSS styling.

## Requirements

Use React 19 with React DOM 19, an ESM-capable build, and Tailwind CSS 4 for
the documented styling. Import this package's `tailwind.css` entry into your
Tailwind stylesheet. It uses `@source` for published classes and `@theme` for
global tokens such as `--color-primary`. Check for token name collisions with
your app and override them in a later `@theme` block if needed.

In a React Server Components app, import and render `ToastProvider` from a
module beginning with `'use client'`; call `toast` from client code. See the
[Tailwind directives](https://tailwindcss.com/docs/functions-and-directives)
and [React client boundary](https://react.dev/reference/rsc/use-client) guides.

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
        <ToastProvider
            position="bottom-right"
            locale="en"
            defaultDuration={5000}
            maxVisibleToasts={4}
        >
            <MainApp />
        </ToastProvider>
    )
}
```

### Load the animated toast surface on demand

Use the separate entry when the initial application should defer Motion and
icons until the first notification. It accepts the same props as ToastProvider:

```tsx
import { LazyToastProvider, useToast } from '@rentnerkev/toasts/lazy-provider'
import { createToastStore } from '@rentnerkev/toasts/toast'

const store = createToastStore()

export function App() {
    return (
        <LazyToastProvider store={store} locale="en">
            <MainApp />
        </LazyToastProvider>
    )
}
```

Keep provider and hook imports on the lazy entry, and notification APIs on
`./toast`; importing the regular root entry also loads the synchronous provider.
`ToastProvider` remains synchronous. The lazy surface loads only when a toast
exists. During loading, and permanently if its chunk cannot load, a local
plain-text fallback displays the same titles and messages with localized close
buttons, status/alert semantics, visible limits, and hover/focus timer pauses.
This fallback does not animate or render Markdown links. Closing, updates, and
normal expiry still work; notifications are never hidden merely because loading
failed. A failed module import stays failed until the application reloads.

For SSR, an empty store renders children without starting the import. With
existing notifications, streaming SSR can resolve the Suspense boundary;
`renderToString` emits the readable fallback and React may report its usual
unfinished-Suspense recoverable hydration error. Create request-scoped stores
rather than sharing server notification state.

### Isolated application roots

The provider uses the documented default store when no `store` is supplied.
Create a store explicitly when several React roots need independent toast
stacks:

```tsx
import { createToastStore, ToastProvider, useToast } from '@rentnerkev/toasts'

const adminStore = createToastStore({
    defaultDuration: 5000,
    maxVisibleToasts: 4,
})

function AdminApp() {
    const scopedToast = useToast()

    return (
        <button onClick={() => scopedToast.success('Admin changes saved.')}>
            Save
        </button>
    )
}

export function AdminRoot() {
    return (
        <ToastProvider store={adminStore} position="top-right">
            <AdminApp />
        </ToastProvider>
    )
}
```

`useToast()` returns the API for the nearest provider. Code outside React can
use the same scope with `adminStore.toast`. Each store owns its toasts,
timers, pause state, and defaults.

High-volume applications can opt into a bounded total queue with
`createToastStore({ maxQueuedToasts: 100 })`. This includes visible toasts and
removes the oldest queued notification when the limit is exceeded. The default
queue remains unbounded; invalid, nonpositive, or noninteger values leave it
unbounded.

Hover and focus pauses belong to each mounted toast display. Unmounting a
provider releases its displays' pauses; it preserves pauses held by other
providers sharing that store. Timers continue independently of providers.
Custom displays can pass a stable `Symbol` as the optional fourth argument to
`store.setToastPauseReason(id, reason, paused, owner)` and release both `hover`
and `focus` claims on teardown. Calls without an owner keep their separate
store-level pause until explicitly released.

## Show a toast

The namespace API provides a named method for each status variant. Every method returns the new toast ID:

```tsx
import { toast } from '@rentnerkev/toasts'

const toastId = toast.success('Your changes were saved.', {
    title: 'Saved',
    duration: 5000,
})
```

The imperative methods are intended for browser event handlers and other client-only functions. The unscoped `toast` API uses one default store per JavaScript process, so never call it during server rendering. Create a request-local store when rendering isolated roots on the server, and call its API from client code. Guard any mount effect against React Strict Mode's repeated development execution to avoid creating duplicate toasts.

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

If a success or error resolver throws, the toast keeps the matching status and
shows a fallback message. The returned promise still fulfills with its original
value or rejects with its original reason.

## Variants and duration

Available variants are `success`, `error`, `info`, and `warning`. Each namespace method uses the same option shape:

```ts
toast.info(content: string, options?: ToastOptions): ToastId
```

The default duration is 6000 milliseconds. Set `duration: 0` to disable automatic expiration. Negative, non-finite, and otherwise invalid values fall back to the default; positive values are capped at a safe `setTimeout` limit. Set `defaultDuration` on `ToastProvider` to change this default centrally.

Only the newest three toasts are displayed by default. Set `maxVisibleToasts` on
`ToastProvider` to change the visible limit centrally. Older toasts keep their remaining
time until they become visible. A visible toast pauses its expiration and
progress indicator while hovered or while keyboard focus is inside it; the
timer resumes after both interactions end.

When providers share a store, the most recently mounted provider supplies each
default it defines. Removing a provider restores the defaults supplied by the
remaining providers or the store.

## Localization

German accessible system messages remain the default. Set `locale="en"` for the English catalog, or override individual messages with a typed `Partial<ToastMessages>`:

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

`className` adds Tailwind classes to every toast. Width, padding, radius, and
shadow utilities replace their corresponding defaults.
Horizontal and vertical padding overrides are independent: `px-8` keeps
the default vertical padding, and `py-8` keeps the horizontal padding.
Conditional utilities such as `sm:w-96` or `hover:p-8` keep the base defaults
outside their breakpoint or state. Toasts are bounded by the viewport with
the stack's padding included, including when a custom width is supplied.

| Prop               | Type                     | Default          | Description                                                               |
| ------------------ | ------------------------ | ---------------- | ------------------------------------------------------------------------- |
| `store`            | `ToastStore`             | default store    | Store used by this provider and `useToast()`.                             |
| `position`         | `ToastPosition`          | `'bottom-right'` | Screen position used for the toast stack.                                 |
| `customDesign`     | `ToastCustomDesign`      | `undefined`      | Overrides Tailwind classes for individual visual parts.                   |
| `className`        | `string`                 | `undefined`      | Additional Tailwind classes applied to every toast.                       |
| `locale`           | `'de' \| 'en'`           | `'de'`           | Selects the accessible system-message catalog.                            |
| `messages`         | `Partial<ToastMessages>` | `undefined`      | Overrides individual system messages.                                     |
| `defaultDuration`  | `number`                 | `6000`           | Default duration in milliseconds when a toast has no explicit `duration`. |
| `maxVisibleToasts` | `number`                 | `3`              | Number of newest toasts displayed at once.                                |
| `children`         | `ReactNode`              | -                | Application content rendered by the provider.                             |

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

For a message that users must act on, use `duration: 0` so it remains available
until they dismiss it. Hover and focus pause the timer for timed messages, but
users may need more than the default six seconds to find a link.

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
    ToastDefaults,
    ToastId,
    ToastLocale,
    ToastMessages,
    ToastOptions,
    ToastPosition,
    ToastPromiseOptions,
    ToastProviderProps,
    ToastPauseReason,
    ToastStore,
    ToastStoreOptions,
    ToastType,
    ToastUpdateOptions,
} from '@rentnerkev/toasts'
```

## Public entry points

| Entry point                       | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `@rentnerkev/toasts`              | Provider, scoped-store factory, namespace API, messages, and types. |
| `@rentnerkev/toasts/toast`        | Namespace API and scoped-store factory.                             |
| `@rentnerkev/toasts/messages`     | Locale catalog, resolver, and message types.                        |
| `@rentnerkev/toasts/types`        | Toast API, provider, and design types.                              |
| `@rentnerkev/toasts/tailwind.css` | Tailwind source and shared theme tokens.                            |
| `@rentnerkev/toasts/package.json` | Package metadata.                                                   |

## Development

```bash
bun install
bun run verify
bun run playground:dev
```

`bun run verify` checks types, lint, formatting, unit tests, browser tests, the package build, and the published package contents. Install the Playwright browser once with `bunx playwright install chromium`. The playground remains a local development and test environment and is not included in the npm package.

## License

MIT. See [LICENSE](./LICENSE).

## Source architecture

The public entries in `src/index.ts`, `toast.ts`, `types.ts`, `i18n.ts`, and `lazy-provider.ts` preserve the npm API. Internal code imports its defining module directly.

Toast presentation, animation, context, owning logic hooks, and UI contracts live in `src/shared/Toast`. `useToastProviderLogic` owns defaults, store context, and interaction handoff for both providers; `useToastSurfaceLogic` owns each surface snapshot and localization. `useCustomToastLogic` owns animated notification interactions and timing. Focused hooks handle snapshot subscription and clipboard state; `useToastInteraction` owns pause claims and DOM handoff for both animated and fallback displays, including chunk failures.

UI-free store, timing, messages, link tokenization, and utility matching live in `src/lib`; declarative defaults live in `src/config`. Unit and browser tests are centralized under `src/tests`, mirroring their owners. The playground separates its template, actions, logic hook, and typed contracts.
