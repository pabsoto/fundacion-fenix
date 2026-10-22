import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { Providers } from './app/providers'
import { Router } from './app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Router />
    </Providers>
  </StrictMode>,
)
