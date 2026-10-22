import { FiArrowLeft } from 'react-icons/fi';

export default function ChatShell({ title, subtitle, identity, onBack, children, composer, modal = false }) {
  return <section className={'dt-chat-shell' + (modal ? ' dt-chat-shell--modal' : '')} aria-label={title}>
    <header className="dt-chat-header">
      <button type="button" className="dt-icon-button" onClick={onBack} aria-label={modal ? 'Close AI recruiter' : 'Back to connections'}><FiArrowLeft /></button>
      <div className="dt-chat-title"><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="dt-chat-identity">{identity}</div>
    </header>
    <div className="dt-chat-body">{children}</div>
    {composer}
  </section>;
}
