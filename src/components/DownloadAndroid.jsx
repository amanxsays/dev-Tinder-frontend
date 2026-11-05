import { Link } from 'react-router-dom';
import { FiDownload, FiMessageCircle, FiBell, FiMic, FiArrowUpRight } from 'react-icons/fi';
import '../styles/download.css';

const releaseUrl = 'https://github.com/amanxsays/dev-Tinder-frontend/releases/tag/android-v1.0.0';
const apkUrl = 'https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.0/DevTinder-1.0.0.apk';
const checksum = '9c1751a457585713c4537e2535c2084f1679d803ef64d9f45023535f60368359';

export default function DownloadAndroid() {
  return <section className="dt-download-page" aria-labelledby="android-title">
    <div className="dt-download-hero">
      <div className="dt-download-copy">
        <p className="dt-download-eyebrow">DEVTINDER FOR ANDROID</p>
        <h1 id="android-title">Your developer network.<br />Now in your pocket.</h1>
        <p>Find developers, keep conversations going, and take your AI recruiter with you. Sign in with your existing DevTinder account.</p>
        <a className="dt-download-primary" href={apkUrl}><FiDownload aria-hidden="true" />Download Android APK</a>
        <p className="dt-download-meta">Version 1.0 · 5.4 MB · Android 8.0 or later</p>
        <Link className="dt-download-web" to="/">Continue on the web <FiArrowUpRight aria-hidden="true" /></Link>
      </div>
      <div className="dt-download-card">
        <img src="/image.png" alt="" width="52" height="60" />
        <h2>DevTinder, wherever you are.</h2>
        <ul>
          <li><FiMessageCircle aria-hidden="true" /><span><strong>Keep in touch</strong>Human chat, connections, profiles, and developer search.</span></li>
          <li><FiBell aria-hidden="true" /><span><strong>Stay in the loop</strong>Optional notifications for messages and connection requests.</span></li>
          <li><FiMic aria-hidden="true" /><span><strong>Speak your draft</strong>Dictation with review before sending, plus optional AI Read aloud.</span></li>
        </ul>
      </div>
    </div>
    <div className="dt-download-details">
      <section aria-labelledby="install-title">
        <h2 id="install-title">Install in a few steps</h2>
        <ol>
          <li>Download the APK on your Android phone and open the downloaded file.</li>
          <li>If Android asks, allow your browser to install apps from this source. You can turn this permission off after installation.</li>
          <li>Tap Install, open DevTinder, and sign in. Allow notifications if you want message and connection-request alerts.</li>
        </ol>
        <p>This is a direct APK download, separate from Google Play. Review Android’s security prompts before continuing. On iPhone or desktop, use the web app.</p>
      </section>
      <section aria-labelledby="release-title">
        <h2 id="release-title">Updates and privacy</h2>
        <p>Website updates do not automatically update the installed app. Return here to download a newer APK and install it over your existing DevTinder app.</p>
        <p>Microphone access is optional and used when you start dictation. Speech may be processed by your device’s speech service. Notification previews use generic text; delivery can be delayed by network, battery settings, or server startup.</p>
        <a href={releaseUrl}>Release notes and checksum file <FiArrowUpRight aria-hidden="true" /></a>
        <details><summary>Verify the APK’s SHA-256 checksum</summary><code>{checksum}</code></details>
      </section>
    </div>
  </section>;
}
