import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiVolume2, FiSquare } from 'react-icons/fi';
import { useAgenticChat } from '../hooks/useAgenticChat';
import { useChatExperience } from '../contexts/ChatExperienceContext';
import { useChatScroll } from '../hooks/useChatScroll';
import { useReadAloud } from '../hooks/useReadAloud';
import { AI_CHAT_ENABLED, BASE_URL } from '../utils/constants';
import { localMessageId, messageTime } from '../utils/chatMessages';
import ResumePreview from './ResumePreview';
import ChatShell from './chat/ChatShell';
import ChatComposer from './chat/ChatComposer';
import ChatOrb from './chat/ChatOrb';
import ChatMarkdown from './chat/ChatMarkdown';
import AiProgress from './chat/AiProgress';

const SUGGESTIONS = ['Find React developers open to remote work', "Summarise Aman's resume", 'Remember that I prefer backend engineers'];
const WELCOME = 'I can search candidate profiles, read resumes and remember what you are looking for. Ask me anything about your pipeline.';

function AiExperience({ children }) {
  const user = useSelector(store => store.user);
  const { aiOwner, aiOpen, openAi, closeAi, setDraft, runtime } = useChatExperience();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const alive = useRef(true);
  const openRef = useRef(aiOpen);
  openRef.current = aiOpen;
  const previewEpoch = useRef(0);
  const previewOpener = useRef(null);
  const invalidatePreview = useCallback(() => { previewEpoch.current++; }, []);
  const sendGuard = useRef(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [messages, setMessages] = useState([]);
  const [steps, setSteps] = useState([]);
  const { askAiRecruiter, aiStatus, isAiThinking, aiResponse } = useAgenticChat();
  const playback = useReadAloud(aiOwner);
  const { scrollRef, onScroll, showLatest, jumpToLatest } = useChatScroll(
    [messages.length, steps.length, aiResponse, aiOpen, selectedResume?.documentId].join(':'),
    messages.length > 0 || isAiThinking);
  const conversationRef = useRef([]);
  conversationRef.current = messages;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const closePreview = () => {
    invalidatePreview();
    setSelectedResume(null);
    requestAnimationFrame(() => { if (previewOpener.current?.isConnected) previewOpener.current.focus(); });
  };

  const dismiss = useCallback(() => {
    previewEpoch.current++;
    setSelectedResume(null);
    closeAi();
    if (pathname === '/chat/ai-agent') navigate('/connections', { replace: true });
  }, [closeAi, pathname, navigate]);

  useEffect(() => {
    const node = dialog.current;
    if (!node || !AI_CHAT_ENABLED) return;
    if (!aiOpen) { node.close(); return; }
    const opener = document.activeElement;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
      runtime.release(aiOwner);
      invalidatePreview();
    };
  }, [aiOpen, runtime, aiOwner, invalidatePreview]);

  const checkSources = useCallback(async sources => {
    const current = [];
    for (let start = 0; start < sources.length; start += 100) {
      const response = await axios.post(BASE_URL + '/profile/resume/active-sources',
        { sources: sources.slice(start, start + 100) }, { withCredentials: true, timeout: 15000 });
      if (!Array.isArray(response.data?.sources)) throw new Error('Invalid source response');
      current.push(...response.data.sources);
    }
    return current;
  }, []);

  const invalidateSources = useCallback(retired => {
    if (!alive.current || !retired.size) return;
    const speakingId = runtime.getSnapshot().speaking?.messageId;
    if (conversationRef.current.some(message => message.id === speakingId
      && message.sources?.some(source => retired.has(source.documentId)))) runtime.stopSpeaking();
    setMessages(previous => previous.map(message => message.sources?.some(source => retired.has(source.documentId))
      ? { ...message, kind: 'notice', text: 'A resume used in this answer was replaced or removed. Ask again for current information.', sources: [] }
      : message));
    setSelectedResume(previous => retired.has(previous?.documentId) ? null : previous);
  }, [runtime]);

  const openResume = async source => {
    previewOpener.current = document.activeElement;
    const epoch = ++previewEpoch.current;
    try {
      const current = await checkSources([source]);
      if (!alive.current || !openRef.current || epoch !== previewEpoch.current) return;
      if (current.length) setSelectedResume(current[0]);
      else invalidateSources(new Set([source.documentId]));
    } catch {
      if (alive.current && openRef.current) toast.error('Could not check this resume. Please try again.');
    }
  };

  useEffect(() => {
    if (!AI_CHAT_ENABLED || !aiOpen) return;
    let disposed = false;
    const refresh = async () => {
      const sources = [...new Map(conversationRef.current.flatMap(message => message.sources || [])
        .map(source => [source.documentId, source])).values()];
      if (!sources.length) return;
      try {
        const current = new Set((await checkSources(sources)).map(source => source.documentId));
        if (!disposed) invalidateSources(new Set(sources.filter(source => !current.has(source.documentId)).map(source => source.documentId)));
      } catch { /* Retry on focus, next interval, or explicit preview. */ }
    };
    const changed = event => {
      previewEpoch.current++;
      const retired = conversationRef.current.flatMap(message => message.sources || [])
        .filter(source => source.candidateId === event.detail?.candidateId).map(source => source.documentId);
      invalidateSources(new Set(retired));
    };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('devtinder:resume-changed', changed);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      disposed = true; clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('devtinder:resume-changed', changed);
    };
  }, [aiOpen, checkSources, invalidateSources]);

  useEffect(() => {
    if (isAiThinking && aiStatus) setSteps(previous => previous.at(-1) === aiStatus ? previous : [...previous, aiStatus]);
  }, [isAiThinking, aiStatus]);

  const send = async text => {
    if (!AI_CHAT_ENABLED || !user?._id || !text.trim() || sendGuard.current || isAiThinking) return;
    sendGuard.current = true;
    runtime.release(aiOwner);
    runtime.clearStatus(aiOwner);
    setMessages(previous => [...previous, { id: localMessageId(), sender: 'user', text, time: new Date() }]);
    setDraft(aiOwner, '');
    setSteps([]);
    try {
      await askAiRecruiter(text, user._id, async (answer, sources = [], metadata = {}) => {
        if (!alive.current) return;
        let currentSources = sources;
        let kind = metadata.kind || 'answer';
        if (sources.length) {
          try {
            currentSources = await checkSources(sources);
            if (currentSources.length !== sources.length) {
              answer = 'A resume used in this answer was replaced or removed. Ask again for current information.';
              currentSources = []; kind = 'notice';
            }
          } catch {
            answer = 'Could not verify the resumes used in this answer. Please try again.';
            currentSources = []; kind = 'error';
          }
        }
        if (!alive.current) return;
        setMessages(previous => [...previous, { id: localMessageId(), sender: 'ai', text: answer, sources: currentSources, kind, time: new Date() }]);
        setSteps([]);
      });
    } finally { sendGuard.current = false; }
  };

  if (!AI_CHAT_ENABLED) return children;
  return <>
    {children}
    <button type="button" className="dt-chat-launcher" onClick={openAi}
      title="Open AI recruiter" aria-label="Open AI recruiter" aria-haspopup="dialog"><ChatOrb size="launcher" /></button>
    <dialog ref={dialog} className={'dt-ai-dialog' + (selectedResume ? ' dt-ai-dialog--preview' : '')} aria-label="AI recruiter"
      onClick={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dismiss();
      }}
      onCancel={event => { event.preventDefault(); if (selectedResume) closePreview(); else dismiss(); }}>
      <div className={'dt-ai-layout' + (selectedResume ? ' dt-ai-layout--preview' : '')}>
        {selectedResume && <ResumePreview key={selectedResume.documentId + ':' + selectedResume.fileUrl} source={selectedResume} onClose={closePreview} />}
        <ChatShell modal title="AI Recruiter" subtitle={isAiThinking ? 'Working on your request' : 'DevTinder · Candidate intelligence'}
          identity={<ChatOrb active={isAiThinking} />} onBack={dismiss}
          composer={<ChatComposer owner={aiOwner} onSend={send} disabled={isAiThinking} placeholder={isAiThinking ? 'Recruiter is working…' : 'Ask about a candidate…'} />}>
          <div ref={scrollRef} onScroll={onScroll} className="dt-chat-scroll">
            {!messages.length && <div className="dt-chat-welcome">
              <ChatOrb size="large" /><h2>How can I help you today?</h2><p>{WELCOME}</p>
              <div className="dt-suggestions">{SUGGESTIONS.map(text => <button type="button" className="dt-suggestion" key={text} onClick={() => send(text)}>{text}</button>)}</div>
            </div>}
            {messages.map(message => <article className={'dt-message-row' + (message.sender === 'user' ? ' dt-message-row--own' : '')} key={message.id}>
              {message.sender === 'ai' && <ChatOrb />}
              <div className="dt-message-content">
                <div className="dt-message-meta"><span>{message.sender === 'user' ? 'You' : 'DevTinder AI'}</span><time dateTime={message.time.toISOString()}>{messageTime(message.time)}</time></div>
                <div className={'dt-bubble' + (message.sender === 'user' ? ' dt-bubble--own' : '')}>
                  {message.sender === 'user' ? message.text : <ChatMarkdown text={message.text} sources={message.sources} onOpenResume={openResume} />}
                  {!!message.sources?.length && <div className="dt-source-list" aria-label="Resumes used">
                    {message.sources.map(source => <button key={source.documentId} type="button" className="dt-source" onClick={() => openResume(source)}
                      aria-label={'Preview ' + source.fileName} aria-pressed={selectedResume?.documentId === source.documentId}>{source.fileName}</button>)}
                  </div>}
                </div>
                {message.sender === 'ai' && message.kind === 'answer' && <div className="dt-answer-actions">
                  {playback.supported ? <button type="button" className="dt-text-button"
                    onClick={() => playback.speakingId === message.id ? playback.stop() : playback.read(message.id, message.text)}>
                    {playback.speakingId === message.id ? <><FiSquare /> Stop reading</> : <><FiVolume2 /> Read aloud</>}
                  </button> : <p className="dt-voice-disclosure">Read aloud is unavailable in this browser.</p>}
                </div>}
              </div>
            </article>)}
            {isAiThinking && <AiProgress status={aiStatus} steps={steps} partial={aiResponse} />}
            {!isAiThinking && messages.length > 0 && <p className="sr-only" role="status">AI conversation updated.</p>}
            {playback.error && <p className="dt-error" role="status">{playback.error}</p>}
          </div>
          {showLatest && messages.length > 0 && <button type="button" className="dt-latest" onClick={jumpToLatest}>Jump to latest ↓</button>}
        </ChatShell>
      </div>
    </dialog>
  </>;
}
export default function AiDrawerLayout({ children }) {
  const { accountId } = useChatExperience();
  if (accountId === 'anonymous') return children;
  return <AiExperience key={accountId}>{children}</AiExperience>;
}
