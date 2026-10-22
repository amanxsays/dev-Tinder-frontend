import { FiCheck } from 'react-icons/fi';
import ChatMarkdown from './ChatMarkdown';

function progressStage(status) {
  if (/queu(?:e|ed|ing)/i.test(status)) return 'In queue';
  if (/connect/i.test(status)) return 'Connecting';
  if (/checking.*resum|verify/i.test(status)) return 'Checking resumes';
  if (/generat|compos|writing/i.test(status)) return 'Preparing your answer';
  if (/search|retriev/i.test(status)) return 'Searching candidates';
  return 'Thinking';
}

// This is a history of received service statuses, not model reasoning or a progress estimate.
export default function AiProgress({ status, steps, partial }) {
  const currentStatus = status || 'Connecting to AI recruiter…';
  const history = steps.at(-1) === currentStatus ? steps : [...steps, currentStatus];
  return <section className="dt-ai-progress" aria-label="AI progress">
    <header className="dt-progress-heading">
      <div><p className="dt-progress-eyebrow">AI RECRUITER</p><h3>{progressStage(currentStatus)}</h3></div>
    </header>
    <p className="sr-only" role="status">{currentStatus}</p>
    <ol className="dt-progress-timeline" aria-label="Received status updates">
      {history.map((step, index) => {
        const active = index === history.length - 1;
        return <li key={index} className={active ? 'is-current' : ''} aria-current={active ? 'step' : undefined}>
          <span className="dt-progress-marker" aria-hidden="true">{active ? <span /> : <FiCheck />}</span>
          <span>{step}</span>
        </li>;
      })}
    </ol>
    {partial && <div className="dt-progress-partial"><ChatMarkdown text={partial} /></div>}
  </section>;
}
