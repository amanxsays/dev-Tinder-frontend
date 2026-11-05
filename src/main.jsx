import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AI_SERVICE_URL } from './utils/constants'
import { warmIntegrationService } from './utils/integrationWarmup'
import { isAndroid } from './platform/platform'
import './styles/android.css'

// Apply native layout before the first frame, including while session restoration runs.
if (isAndroid()) document.documentElement.classList.add('dt-android')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Start Spring's wake-up alongside the normal app startup, before sign-in.
// Deliberately outside React effects so StrictMode cannot issue duplicate pings.
void warmIntegrationService(AI_SERVICE_URL)
