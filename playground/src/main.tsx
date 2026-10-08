import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// oxlint-disable-next-line import/no-unassigned-import -- The playground entry loads its stylesheet.
import './index.css'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
