# @rentnerkev/toasts

Zugängliche und anpassbare Toast-Benachrichtigungen für React mit vier
Statusvarianten, Fortschrittsanzeige, Markdown-Links und Tailwind CSS.

## Installation

```bash
bun add @rentnerkev/toasts
```

oder:

```bash
npm install @rentnerkev/toasts
```

React, React DOM, Motion und Lucide React werden als Peer Dependencies vom
Consumer bereitgestellt.

## Schnellstart

### Provider einrichten

Der `ToastProvider` rendert die Toasts. Binde ihn einmal oberhalb des
Bereichs ein, aus dem Toasts angezeigt werden sollen:

```tsx
import { ToastProvider } from '@rentnerkev/toasts'

export function App() {
    return (
        <ToastProvider position="bottom-right" locale="de">
            <MainApp />
        </ToastProvider>
    )
}
```

### Toast anzeigen

`customToast` kann innerhalb und außerhalb von React-Komponenten aufgerufen
werden. Die Funktion liefert die ID des neuen Toasts zurück:

```tsx
import { customToast } from '@rentnerkev/toasts'

const toastId = customToast('Deine Nachricht', 'Erfolg', 'success', 5000)
```

### Toast entfernen

Entferne einen Toast mit der von `customToast` zurückgegebenen ID:

```tsx
import { removeToast } from '@rentnerkev/toasts'

removeToast(toastId)
```

## Varianten und Dauer

Verfügbare Varianten sind `success`, `error`, `info` und `warning`. Die
Signatur lautet:

```ts
customToast(
    content: string,
    title?: string,
    type?: ToastType,
    duration?: number,
): string
```

Die Standarddauer beträgt 6000 Millisekunden. `duration: 0` deaktiviert den
automatischen Ablauf; der Toast bleibt bis zu einem manuellen
`removeToast` sichtbar. Negative, nicht endliche oder ungültige Werte fallen
auf die Standarddauer zurück. Positive Werte werden auf eine sichere
`setTimeout`-Grenze begrenzt.

## Styling

Die Library liefert einen eigenen Tailwind-Einstieg. Importiere ihn nach Tailwind
CSS in deine Haupt-CSS-Datei:

```css
@import 'tailwindcss';
@import '@rentnerkev/toasts/tailwind.css';
```

Der Paket-Einstieg scannt ausschließlich die veröffentlichten JavaScript-Dateien
unter `dist`. Er stellt die gemeinsamen Theme-Tokens `primary`, `primary-hover`,
`background-dark`, `surface-dark`, `input-dark`, `border-dark`, `secondary-text`
und `muted-foreground` bereit. Eigene Werte können danach mit einem weiteren
`@theme`-Block überschrieben werden.

Der `ToastProvider` unterstützt folgende Props:

| Prop           | Typ                      | Standard         | Beschreibung                                          |
| :------------- | :----------------------- | :--------------- | :---------------------------------------------------- |
| `position`     | `ToastPosition`          | `'bottom-right'` | Position der Toasts.                                  |
| `customDesign` | `ToastCustomDesign`      | `undefined`      | Überschreibt die Tailwind-Klassen einzelner Bereiche. |
| `className`    | `string`                 | `undefined`      | Zusätzliche Tailwind-Klassen für jeden Toast.         |
| `locale`       | `'de' \| 'en'`           | `'de'`           | Sprache der zugänglichen Systemtexte.                 |
| `messages`     | `Partial<ToastMessages>` | `undefined`      | Überschreibt einzelne Systemtexte.                    |
| `children`     | `ReactNode`              | –                | Inhalt der Anwendung.                                 |

Deutsch bleibt der Standard. Für englische ARIA-Texte oder eigene Begriffe
können `locale` und `messages` kombiniert werden:

```tsx
<ToastProvider
    locale="en"
    messages={{ closeNotification: 'Dismiss notification' }}
>
    <App />
</ToastProvider>
```

### Eigenes Design

```tsx
const customDesign = {
    successWrapper: 'bg-green-100 border-l-4 border-green-500',
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

Verfügbare `ToastCustomDesign`-Felder:

| Feld                                                                  | Beschreibung                                 |
| :-------------------------------------------------------------------- | :------------------------------------------- |
| `successWrapper`, `errorWrapper`, `infoWrapper`, `warningWrapper`     | Klassen für den jeweiligen Toast-Container.  |
| `successIcon`, `errorIcon`, `infoIcon`, `warningIcon`                 | Klassen für das jeweilige Status-Icon.       |
| `successProgress`, `errorProgress`, `infoProgress`, `warningProgress` | Klassen für den Fortschrittsbalken.          |
| `titleText`                                                           | Klassen für den Titel.                       |
| `contentText`                                                         | Klassen für den Inhalt.                      |
| `linkText`                                                            | Klassen für Markdown-Links.                  |
| `closeButton`                                                         | Klassen für den Schließen-Button.            |
| `copyButton`                                                          | Klassen für den Kopieren-Button bei Fehlern. |

## Links in Toasts

Links mit der Markdown-Syntax `[Text](URL)` werden klickbar dargestellt und
öffnen sich in einem neuen Tab. Es werden nur `http`- und `https`-URLs
verlinkt; andere Schemes bleiben als Text sichtbar.

```tsx
customToast(
    'Öffne [das Ticket](https://example.com/tickets/45).',
    'Neues Ticket',
    'info',
)
```

Fehlermeldungen bieten zusätzlich eine Schaltfläche zum Kopieren des Titels
und Inhalts. Die Toast-Varianten verwenden für normale Meldungen eine
polite Live-Region und für Fehler eine assertive Meldung.

## TypeScript

Die wichtigsten Typen können direkt aus dem Paket importiert werden:

```tsx
import type {
    ToastCustomDesign,
    ToastLocale,
    ToastMessages,
    ToastPosition,
    ToastProviderProps,
    ToastType,
} from '@rentnerkev/toasts'
```

## Entwicklung

```bash
bun install
bun run check
bun run playground:dev
```

Der Playground bleibt eine lokale Entwicklungs- und Testumgebung und ist
nicht Bestandteil des npm-Pakets.

## Lizenz

MIT, siehe [LICENSE](./LICENSE).
