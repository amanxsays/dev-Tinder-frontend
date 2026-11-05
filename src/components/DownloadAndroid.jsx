import { Link } from 'react-router-dom';
import { FiDownload, FiMessageCircle, FiBell, FiMic, FiArrowUpRight } from 'react-icons/fi';
import Footer from './Footer';
import { androidRelease } from '../utils/androidRelease';
import { isAndroid } from '../platform/platform';
import '../styles/site.css';
import '../styles/download.css';

const releaseUrl = 'https://github.com/amanxsays/dev-Tinder-frontend/releases/tag/android-v1.0.1';

export default function DownloadAndroid() {
  return <div className="dt-app-frame">
    <div className="dt-app-backdrop" aria-hidden="true" />
    <header className="navbar dt-site-header">
      <Link to="/" className="dt-site-brand" aria-label="DevTinder home">
        <img src="/image.png" alt="" />
        <span><strong>DevTinder</strong><small>DEVELOPER NETWORK</small></span>
      </Link>
      <Link to="/login" className="dt-download-link">Open web app <FiArrowUpRight aria-hidden="true" /></Link>
    </header>
    <main className="dt-app-main">
    <section className="dt-download-page" aria-labelledby="android-title">
    <div className="dt-download-hero">
      <div className="dt-download-copy">
        <p className="dt-download-eyebrow">DEVTINDER FOR ANDROID</p>
        <h1 id="android-title">Your developer network.<br />Now in your pocket.</h1>
        <p>Connect with developers, chat with your network, and take your AI recruiter with you.</p>
        <a className="dt-download-primary" href={androidRelease.downloadPath} download={androidRelease.filename}><FiDownload aria-hidden="true" />Download Android APK</a>
        <p className="dt-download-meta">Version 1.0.1 · 5.7 MB · Android 8.0 or later</p>
        <Link className="dt-download-web" to="/">Continue on the web <FiArrowUpRight aria-hidden="true" /></Link>
      </div>
      <div className="dt-download-card">
        <img src="/image.png" alt="" width="52" height="60" />
        <h2>Stay connected on the go.</h2>
        <ul>
          <li><FiMessageCircle aria-hidden="true" /><span><strong>Your people, one tap away</strong>Find developers and keep the conversation going.</span></li>
          <li><FiBell aria-hidden="true" /><span><strong>Never miss a hello</strong>Get message and connection-request alerts.</span></li>
          <li><FiMic aria-hidden="true" /><span><strong>Say it your way</strong>Dictate your message. Review, then send.</span></li>
        </ul>
      </div>
    </div>
    <section className="dt-download-install" aria-labelledby="install-title">
        <h2 id="install-title">Ready in three steps</h2>
        <ol className="dt-download-steps">
          <li><strong>Download</strong><span>Save the APK to your Android phone.</span></li>
          <li><strong>Install</strong><span>Open the file and follow the prompts.</span></li>
          <li><strong>Sign in</strong><span>Use your existing DevTinder account.</span></li>
        </ol>
        <details className="dt-download-help">
          <summary>Need help installing?</summary>
          <p>If Android asks, allow your browser to install this app, then tap Install. You can switch that permission off afterward. This is a direct download, separate from Google Play.</p>
          <p>Come back here for new APK versions; installed apps do not update automatically. On iPhone or desktop, use the web app.</p>
          <p>Microphone and notifications are optional. Your device’s speech service may process dictation. Notifications use generic previews and can be delayed.</p>
          <p><a href={androidRelease.sourceUrl}>Try the alternative download <FiArrowUpRight aria-hidden="true" /></a></p>
          <a href={releaseUrl}>Release notes and checksum file <FiArrowUpRight aria-hidden="true" /></a>
          <details><summary>APK SHA-256 checksum</summary><code>{androidRelease.sha256}</code></details>
        </details>
    </section>
    </section>
    </main>
    {!isAndroid() && <Footer />}
  </div>;
}
