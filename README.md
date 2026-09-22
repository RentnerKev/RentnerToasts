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

Die Namespace-API bietet benannte Methoden für alle vier Varianten. Jede Methode
liefert die ID des neuen Toasts zurück:

```tsx
import { toast } from '@rentnerkev/toasts'

const toastId = toast.success('Deine Nachricht', {
    title: 'Erfolg',
    duration: 5000,
})
```

Die imperativen Methoden sind für Browser-Event-Handler und andere reine
Client-Funktionen vorgesehen. Der Store lebt pro JavaScript-Prozess: Rufe die
Methoden deshalb niemals während eines Server-Renderings auf. Ein Mount-Effekt
muss gegen die doppelte Ausführung im React-StrictMode abgesichert sein, damit
er nicht zwei identische Toasts erzeugt.

### Toasts entfernen und aktualisieren

Einzelne Toasts lassen sich über ihre ID entfernen. `dismissAll()` entfernt auch
nicht sichtbare Toasts und beendet sämtliche Ablauf-Timer:

```tsx
toast.dismiss(toastId)
toast.dismissAll()
```

`update()` behält ID und Position des Toasts bei. Nur übergebene Felder werden
geändert; `title: null` entfernt einen vorhandenen Titel. Eine neue `duration`
startet den Ablauf und die Fortschrittsanzeige erneut:

```tsx
const updated = toast.update(toastId, {
    content: 'Die Datei wurde gespeichert.',
    title: 'Fertig',
    type: 'success',
    duration: 4000,
})
```

Für eine unbekannte oder bereits entfernte ID liefert `update()` den Wert
`false`; andernfalls `true`.

### Promise-Status anzeigen

`toast.promise()` zeigt sofort einen persistenten Info-Toast und aktualisiert
dieselbe ID nach Abschluss auf `success` oder `error`. Das zurückgegebene Promise
behält den ursprünglichen Erfolgswert beziehungsweise Ablehnungsgrund bei:

```tsx
const user = await toast.promise(
    () => fetch('/api/user').then((response) => response.json()),
    {
        loading: 'Benutzer wird geladen …',
        success: (result) => ({
            content: `${result.name} wurde geladen.`,
            title: 'Fertig',
        }),
        error: (error) => ({
            content:
                error instanceof Error ? error.message : 'Unbekannter Fehler',
            title: 'Laden fehlgeschlagen',
        }),
        duration: 5000,
    },
)
```

`success` und `error` akzeptieren Text, ein Objekt mit `content`, `title` und
`duration` oder eine Funktion. Eine Dauer im jeweiligen Statusobjekt hat Vorrang
vor der gemeinsamen `duration`. Wird der Lade-Toast vorher entfernt, erscheint
er nach Abschluss des Promise nicht erneut.

## Varianten, Dauer und Kompatibilität

Verfügbare Varianten sind `success`, `error`, `info` und `warning`. Die
Kurzmethoden verwenden jeweils dieselbe Options-Struktur:

```ts
toast.info(content: string, options?: ToastOptions): ToastId
```

Die bisherige positionsbasierte API bleibt als vollständig kompatibler Alias
erhalten:

```ts
customToast(
    content: string,
    title?: string,
    type?: ToastType,
    duration?: number,
): string
```

Auch `removeToast(toastId)` bleibt als kompatibler Einzel-Handler exportiert.
Die Standarddauer beträgt 6000 Millisekunden. `duration: 0` deaktiviert den
automatischen Ablauf; der Toast bleibt bis zu einem manuellen
Entfernen sichtbar. Negative, nicht endliche oder ungültige Werte fallen auf die
Standarddauer zurück. Positive Werte werden auf eine sichere `setTimeout`-Grenze
begrenzt.

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
toast.info('Öffne [das Ticket](https://example.com/tickets/45).', {
    title: 'Neues Ticket',
})
```

Fehlermeldungen bieten zusätzlich eine Schaltfläche zum Kopieren des Titels
und Inhalts. Die Toast-Varianten verwenden für normale Meldungen eine
polite Live-Region und für Fehler eine assertive Meldung.

## TypeScript

Die wichtigsten Typen können direkt aus dem Paket importiert werden:

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
