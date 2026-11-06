import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { FiDownload, FiRefreshCw, FiShield } from 'react-icons/fi';
import { isAndroid } from '../platform/platform';
import { checkAndroidUpdate } from '../utils/androidUpdate';
import '../styles/android-update.css';

const enabled = () => isAndroid() && import.meta.env.VITE_ANDROID_ENV !== 'development';

export default function AndroidUpdateGate({ children }) {
  const [state, setState] = useState({ status: 'checking' });
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const heading = useRef(null);
  const status = useRef(state.status);
  status.current = state.status;
  useEffect(() => {
    if (!enabled()) return;
    let disposed = false;
    let inFlight = false;
    let controller;
    const check = async () => {
      if (disposed || inFlight || document.hidden) return;
      inFlight = true;
      controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const result = await checkAndroidUpdate({ getInfo: () => App.getInfo(), signal: controller.signal });
        if (!disposed) setState(result);
      } catch {
        if (!disposed) setState(previous => previous.status === 'required' ? previous : { status: 'unavailable' });
      } finally { clearTimeout(timer); inFlight = false; }
    };
    const resume = () => { if (!document.hidden) void check(); };
    void check();
    const interval = setInterval(resume, 300000);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    const lifecycle = App.addListener('appStateChange', event => { if (event.isActive) void check(); });
    const back = App.addListener('backButton', () => { if (status.current !== 'current') void App.minimizeApp(); });
    return () => {
      disposed = true; controller?.abort(); clearInterval(interval);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
      void lifecycle.then(handle => handle.remove()).catch(() => {});
      void back.then(handle => handle.remove()).catch(() => {});
    };
  }, [retry]);
  useEffect(() => { if (enabled() && state.status !== 'current') heading.current?.focus(); }, [state.status]);
  if (!enabled() || state.status === 'current') return children;
  const required = state.status === 'required';
  const download = async () => {
    setOpening(true); setDownloadError('');
    try {
      const result = await AppLauncher.openUrl({ url: state.release.apkUrl });
      if (!result.completed) throw new Error('Cannot open download');
    } catch { setDownloadError('Could not open the download. Check your browser and try again.'); }
    finally { setOpening(false); }
  };
  return <main className="dt-update-page" aria-labelledby="dt-update-heading">
    <section className="dt-update-card">
      <div className="dt-update-symbol" aria-hidden="true"><FiShield /></div>
      <p className="dt-update-brand">DevTinder</p>
      <h1 id="dt-update-heading" tabIndex={-1} ref={heading}>{required ? 'Update to continue' : state.status === 'checking' ? 'Checking your app' : 'Connect to continue'}</h1>
      <p role="status">{required ? `Version ${state.release.versionName} is ready. Install the latest update to keep using DevTinder.`
        : state.status === 'checking' ? 'Checking for the latest version?' : 'We could not check for updates. Connect to the internet and retry.'}</p>
      {required && <><button type="button" className="dt-update-primary" disabled={opening} onClick={download}><FiDownload />{opening ? 'Opening download?' : 'Update now'}</button>
        <p className="dt-update-help">Open the downloaded APK and approve the update. Your account and app data stay on this phone.</p></>}
      {state.status !== 'checking' && <button type="button" className="dt-update-retry" onClick={() => { if (!required) setState({ status: 'checking' }); setRetry(value => value + 1); }}><FiRefreshCw />Check again</button>}
      {downloadError && <p role="alert">{downloadError}</p>}
    </section>
  </main>;
}
