import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AndroidUpdateGate from './components/AndroidUpdateGate.jsx'
import { isAndroid } from './platform/platform'
import './styles/android.css'

// Apply native layout before the first frame, including while session restoration runs.
if (isAndroid()) document.documentElement.classList.add('dt-android')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AndroidUpdateGate><App /></AndroidUpdateGate>
  </StrictMode>,
)
