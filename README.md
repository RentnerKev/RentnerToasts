<p align="center">
    <img src="https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/banner.png" alt="RentnerToasts" width="100%">
</p>

<p align="center">
    <a href="https://github.com/RentnerKev/RentnerToasts/actions/workflows/ci.yml"><img src="https://github.com/RentnerKev/RentnerToasts/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
    <a href="https://github.com/RentnerKev/RentnerToasts/actions/workflows/codeql.yml"><img src="https://github.com/RentnerKev/RentnerToasts/actions/workflows/codeql.yml/badge.svg?branch=main" alt="CodeQL"></a>
    <a href="https://www.npmjs.com/package/@rentnerkev/toasts"><img src="https://img.shields.io/npm/v/@rentnerkev/toasts" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@rentnerkev/toasts"><img src="https://img.shields.io/npm/dm/@rentnerkev/toasts" alt="npm downloads"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

Accessible React notifications with status variants, progress, Markdown links, and customizable designs.

## Installation

Requires React 19, React DOM 19, and Tailwind CSS 4. Motion and Lucide React are required peers, included below.

```bash
npm install @rentnerkev/toasts motion@^14 lucide-react@^1
# or with Bun
bun add @rentnerkev/toasts motion@^14 lucide-react@^1
```

Add to your application stylesheet:

```css
@import 'tailwindcss';
@import '@rentnerkev/toasts/tailwind.css';
```

## Quick start

```tsx
'use client'

import { ToastProvider, toast } from '@rentnerkev/toasts'

export function App() {
    return (
        <ToastProvider locale="en" position="bottom-right">
            <button onClick={() => toast.success('Your changes were saved.')}>
                Save changes
            </button>
        </ToastProvider>
    )
}
```

## Screenshots

|                                                                                                                                                                                                                                                                                           |                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dark status stack**<br>[![Dark status stack](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/dark-status-stack.png)](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/dark-status-stack.png)         | **Light Playground theme**<br>[![Light Playground theme](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/light-status-stack.png)](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/light-status-stack.png)               |
| **Interactive Markdown link**<br>[![Interactive Markdown link](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/markdown-link.png)](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/markdown-link.png) | **Long messages and progress**<br>[![Long messages and progress](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/long-message-progress.png)](https://raw.githubusercontent.com/RentnerKev/RentnerToasts/main/assets/readme/screenshots/long-message-progress.png) |

Run the local Playground from a repository checkout:

```bash
bun install --cwd playground
bun run playground:dev
```

[Full API and usage guide](https://npm.rentner.dev/docs/toasts) · [Local Playground](./playground) · [MIT license](./LICENSE)
