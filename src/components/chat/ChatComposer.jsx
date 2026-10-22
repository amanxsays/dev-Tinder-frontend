import { useId, useLayoutEffect, useRef } from 'react';
import { FiSend, FiMic, FiSquare, FiType, FiX } from 'react-icons/fi';
import { useChatExperience } from '../../contexts/ChatExperienceContext';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

export default function ChatComposer({ owner, onSend, disabled = false, placeholder = 'Write a message…' }) {
  const { draft, setDraft } = useChatExperience();
  const voice = useVoiceDictation(owner);
  const input = useRef(null);
  const statusId = useId();
  const value = draft(owner);
  useLayoutEffect(() => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = Math.min(120, Math.max(44, node.scrollHeight)) + 'px';
  }, [value]);
  const submit = event => {
    event?.preventDefault();
    if (voice.active) { voice.stop(); return; }
    if (!disabled && value.trim()) onSend(value.trim());
  };
  const edit = () => {
    if (voice.active) voice.stop();
    input.current?.focus();
  };
  const label = voice.status === 'permission' ? 'Waiting for microphone permission…'
    : voice.status === 'listening' ? 'Listening · ' + voice.elapsed + ' / 60 seconds'
    : voice.status === 'finishing' ? 'Finishing recognition…'
    : voice.error || voice.notice;
  return <footer className="dt-composer">
    {voice.active && <div className="dt-listening">
      <div className={'dt-waves' + (voice.status === 'listening' ? ' is-listening' : '')} aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
      {voice.interim && <p className="dt-interim" aria-label="Provisional transcript">{voice.interim}</p>}
      <div className="dt-capture-actions">
        <button type="button" className="dt-text-button" onClick={voice.stop} disabled={voice.status === 'finishing'}><FiSquare /> Stop and review</button>
        <button type="button" className="dt-text-button" onClick={voice.cancel}><FiX /> Cancel</button>
      </div>
    </div>}
    <p className={'dt-voice-status' + (voice.error ? ' dt-error' : '')} id={statusId} role="status" aria-live="polite">{label}</p>
    <form className="dt-compose-form" onSubmit={submit}>
      <button type="button" className="dt-icon-button dt-keyboard-button" onClick={edit} aria-label={voice.active ? 'Stop dictation and edit text' : 'Type a message'}><FiType /></button>
      <label className="sr-only" htmlFor={statusId + '-draft'}>Message draft</label>
      <textarea ref={input} id={statusId + '-draft'} value={value} rows={1} placeholder={placeholder}
        aria-describedby={statusId} readOnly={voice.active} disabled={disabled}
        onChange={event => setDraft(owner, event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault(); submit();
          }
        }} />
      <div className="dt-compose-controls">
        <button type="button" className={'dt-mic-button' + (voice.status === 'listening' ? ' is-listening' : '')}
          onClick={voice.active ? voice.stop : voice.start} disabled={disabled || !voice.supported || voice.status === 'finishing'}
          aria-label={voice.active ? 'Stop dictation' : 'Start English voice dictation'} aria-pressed={voice.active}>
          {voice.active ? <FiSquare /> : <FiMic />}
        </button>
        <button type="submit" className="dt-send-button" disabled={disabled || (!value.trim() && !voice.active)} aria-label={voice.active ? 'Stop dictation to review before sending' : 'Send message'}><FiSend /></button>
      </div>
    </form>
    <p className="dt-voice-disclosure">{voice.hint || (voice.supported
      ? 'English dictation · Your browser may process speech remotely. Review before sending.'
      : 'Voice dictation is unavailable in this browser. You can keep typing.')}</p>
  </footer>;
}
