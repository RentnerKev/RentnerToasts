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

## AI and read-only MCP access

The separate `@rentnerkev/toasts/ai` entry is for Node.js and Bun tooling. It reads
only this installed package's manifest, README, usage guide, and built TypeScript
declarations. It does not import React, mount UI, run examples, perform network
requests, or require an MCP runtime. Keep it in server/tooling code.

```ts
import {
    getPackageInfo,
    getPackageApi,
    getPackageDocumentation,
    searchPackageDocumentation,
    getPackageExamples,
} from '@rentnerkev/toasts/ai'

const info = getPackageInfo()
const api = getPackageApi() // All public typed subpaths and dependent declarations
const usage = getPackageDocumentation('usage') // Full guide, including CSS and providers
const readme = getPackageDocumentation('readme')
const matches = searchPackageDocumentation('messages') // Literal, case-insensitive lines
const examples = getPackageExamples() // Fenced examples from the usage guide
```

`getPackageApi({ subpath: '.', symbol: 'ToastProvider' })` validates the symbol
against the selected public entry and returns its complete declaration context.
Unknown subpaths or symbols throw an error. File paths are not accepted. The
`./ai` entry itself is excluded from this UI API context. The manifest's `exports`
map remains available through `getPackageInfo()`.

Public website discovery is planned at
[llms.txt](https://packages.rentner.dev/llms.txt) and
[the MCP endpoint](https://packages.rentner.dev/mcp). These addresses become
available after the website deployment; this documentation does not claim the
endpoint is already online. The website's read-only tools expose public package
information, API declarations, usage guides, examples, and search, without
accounts, write operations, or access to private project files. The installed
`/ai` entry works locally without that service. Always use the documentation and
declarations for the version installed in your project.
