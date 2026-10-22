import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { createSocketConnection } from '../utils/socket';
import { BASE_URL } from '../utils/constants';
import { normalizeMessage, messageTime } from '../utils/chatMessages';
import { useChatExperience } from '../contexts/ChatExperienceContext';
import { useChatScroll } from '../hooks/useChatScroll';
import ChatShell from './chat/ChatShell';
import ChatComposer from './chat/ChatComposer';

function Avatar({ url, name }) {
  return url ? <img className="dt-avatar" src={url} alt={name + ' avatar'} />
    : <span className="dt-avatar dt-avatar-placeholder" aria-hidden="true">{name?.slice(0, 1) || '?'}</span>;
}

export default function Chat() {
  const { targetUserId } = useParams();
  const userId = useSelector(store => store.user?._id) || '';
  return <HumanChat key={userId + ':' + targetUserId} targetUserId={targetUserId} />;
}

function HumanChat({ targetUserId }) {
  const user = useSelector(store => store.user);
  const connections = useSelector(store => store.connection);
  const { accountId, setDraft, runtime } = useChatExperience();
  const owner = accountId + ':human:' + targetUserId;
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState('Connecting…');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { scrollRef, onScroll, showLatest, jumpToLatest } = useChatScroll(messages.length + ':' + loading);
  const userId = user?._id;

  useEffect(() => {
    const known = connections?.find(person => person._id === targetUserId);
    if (known) { setPartner(known); return; }
    let disposed = false;
    const controller = new AbortController();
    axios.get(BASE_URL + '/profile/view/' + targetUserId, { withCredentials: true, signal: controller.signal, timeout: 15000 })
      .then(response => { if (!disposed) setPartner(response.data); })
      .catch(() => { /* History still identifies participants where available. */ });
    return () => { disposed = true; controller.abort(); };
  }, [targetUserId, connections]);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    const controller = new AbortController();
    const socket = createSocketConnection();
    socketRef.current = socket;
    setLoading(true);
    setError('');
    setMessages([]);
    const joined = () => {
      if (disposed) return;
      socket.emit('joinChat', { userId, targetUserId });
      setConnection('Connected');
      setError(previous => previous.startsWith('Chat connection interrupted.') ? '' : previous);
    };
    const disconnected = () => {
      if (disposed) return;
      setConnection('Disconnected');
      setError('Chat connection interrupted. Your unsent draft is preserved. Reconnect before sending.');
    };
    const received = payload => {
      if (disposed) return;
      const message = normalizeMessage({ ...payload, time: Date.now() }, userId);
      setMessages(previous => [...previous, message]);
    };
    socket.on('connect', joined);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', disconnected);
    socket.on('messageReceived', received);
    if (socket.connected) joined();
    axios.get(BASE_URL + '/chat/' + targetUserId, {
      withCredentials: true, signal: controller.signal, timeout: 15000,
    }).then(response => {
      if (disposed) return;
      const history = (Array.isArray(response.data?.messages) ? response.data.messages : []).map(message => normalizeMessage(message, userId));
      setMessages(previous => [...history, ...previous]);
    }).catch(() => {
      if (!disposed) setError('Could not load chat history. Retry explicitly; your draft is preserved.');
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => {
      disposed = true; controller.abort();
      socket.off('connect', joined);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', disconnected);
      socket.off('messageReceived', received);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, targetUserId, attempt]);

  const send = text => {
    const socket = socketRef.current;
    if (!user || !socket?.connected) {
      setError('Chat is disconnected. Your draft has not been sent. Reconnect and press Send.');
      return;
    }
    if (!text.trim()) return;
    runtime.release(owner);
    runtime.clearStatus(owner);
    socket.emit('sendMessage', { firstName: user.firstName, userId, targetUserId, text, photoUrl: user.photoUrl });
    setDraft(owner, '');
    setError('');
    // Only room broadcasts insert live messages: no second optimistic copy.
    // This legacy protocol has no persistence/recipient acknowledgement.
  };
  const partnerName = partner ? [partner.firstName, partner.lastName].filter(Boolean).join(' ') : 'Conversation';
  return <div className="dt-chat-surface">
    <ChatShell title={partnerName} subtitle="DevTinder · Direct message"
      identity={<Avatar url={partner?.photoUrl} name={partnerName} />} onBack={() => navigate('/connections')}
      composer={<ChatComposer owner={owner} onSend={send} disabled={loading || !userId} />}>
      <div ref={scrollRef} onScroll={onScroll} className="dt-chat-scroll">
        {loading && <p className="dt-human-empty" role="status">Loading conversation…</p>}
        {!loading && !messages.length && <div className="dt-human-empty"><h2>Start a conversation</h2><p>Say hello with a message, or dictate a draft.</p></div>}
        {error && <div className="dt-reasoning" role="status"><p className="dt-error">{error}</p>
          <button type="button" className="dt-text-button" onClick={() => setAttempt(previous => previous + 1)}>Reconnect and reload history</button></div>}
        <p className="sr-only" role="status">Chat connection: {connection}</p>
        {messages.map(message => {
          // Historical IDs are reliable. Legacy live events only provide display names.
          const own = message.own ?? message.firstName === user?.firstName;
          return <article key={message.id} className={'dt-message-row' + (own ? ' dt-message-row--own' : '')}>
            {!own && <Avatar url={message.photoUrl} name={message.firstName} />}
            <div className="dt-message-content">
              <div className="dt-message-meta"><span>{own ? 'You' : message.firstName}</span>
                {message.time && <time dateTime={message.time.toISOString()}>{messageTime(message.time)}</time>}</div>
              <div className={'dt-bubble' + (own ? ' dt-bubble--own' : '')} style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
            </div>
            {own && <Avatar url={message.photoUrl} name={message.firstName} />}
          </article>;
        })}
      </div>
      {showLatest && <button type="button" className="dt-latest" onClick={jumpToLatest}>Jump to latest ↓</button>}
    </ChatShell>
  </div>;
}
