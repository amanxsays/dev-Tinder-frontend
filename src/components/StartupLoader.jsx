import '../styles/startup.css';
export default function StartupLoader({ message = 'Getting things ready...', error = false, children }) {
  return <section className="dt-startup" aria-label={error ? 'Connection unavailable' : 'Loading DevTinder'}>
    <div className="dt-startup-mark" aria-hidden="true">{error ? <span>!</span> : <span className="dt-startup-spinner" />}</div>
    <h1>{error ? 'Reconnect to continue' : 'Just a moment'}</h1>
    <p role="status">{message}</p>
    {children && <div className="dt-startup-actions">{children}</div>}
  </section>;
}
