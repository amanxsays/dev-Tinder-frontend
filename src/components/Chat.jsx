import { isAndroid } from '../platform/platform';
import { readDeviceCache, writeDeviceCache } from '../platform/deviceCache';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../platform/apiClient';
import { createSocketConnection } from '../utils/socket';
import { BASE_URL } from '../utils/constants';
import { normalizeMessage, messageTime, mergeMessages } from '../utils/chatMessages';
import { useChatExperience } from '../contexts/ChatExperienceContext';
import { useChatScroll } from '../hooks/useChatScroll';
import StartupLoader from './StartupLoader';
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
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const historyCursor = useRef(null);
  const [savedView, setSavedView] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [olderPending, setOlderPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const sendPending = useRef(false);
  const { scrollRef, onScroll, showLatest, jumpToLatest } = useChatScroll(messages.length + ':' + loading);
  const userId = user?._id;

  useEffect(() => {
    const known = connections?.find(person => person._id === targetUserId);
    if (known) { setPartner(known); return; }
    let disposed = false;
    void readDeviceCache(user?._id, 'chat:' + targetUserId).then(value => { if (!disposed && value?.partner) setPartner(value.partner); });
    const controller = new AbortController();
    if (isAndroid() && !navigator.onLine) return () => { disposed = true; controller.abort(); };
    axios.get(BASE_URL + '/profile/view/' + targetUserId, { withCredentials: true, signal: controller.signal, timeout: 15000 })
      .then(response => { if (!disposed) setPartner(response.data); })
      .catch(() => { /* History still identifies participants where available. */ });
    return () => { disposed = true; controller.abort(); };
  }, [targetUserId, connections, user?._id]);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    const controller = new AbortController();
    const socket = createSocketConnection({ autoConnect: !isAndroid() || navigator.onLine });
    socketRef.current = socket;
    setLoading(true);
    setError('');
    setSending(false);
    sendPending.current = false;
    setMessages([]);
    const joined = () => {
      if (disposed) return;
      socket.timeout(15000).emit('joinChat', { targetUserId }, (failure, result) => {
        if (disposed) return;
        if (failure || !result?.ok) {
          setConnection('Unavailable');
          setError(result?.error || 'Could not join this conversation. Reconnect to try again.');
        } else {
          setConnection('Connected');
          void loadHistory();
          setError(previous => previous.startsWith('Chat connection interrupted.') ? '' : previous);
        }
      });
    };
    const disconnected = () => {
      if (disposed) return;
      setConnection('Disconnected');
      setError('Chat connection interrupted. Your unsent draft is preserved. Reconnect before sending.');
    };
    const received = payload => {
      if (disposed) return;
      const message = normalizeMessage({ ...payload, time: Date.now() }, userId);
      setMessages(previous => mergeMessages(previous, [message]));
    };
    socket.on('connect', joined);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', disconnected);
    socket.on('messageReceived', received);
    let historyPending = false;
    const loadHistory = async () => {
      if (historyPending || disposed) return;
      historyPending = true;
      try {
        if (isAndroid()) {
          const cached = await readDeviceCache(userId, 'chat:' + targetUserId);
          if (disposed) return;
          if (cached?.messages?.length) {
            historyCursor.current ||= cached.cursor || null;
            const restored = cached.messages.map(message => normalizeMessage(message, userId));
            setMessages(previous => mergeMessages(restored, previous));
            setLoading(false); setSavedView(true); setHasEarlier(Boolean(cached.hasEarlier || cached.messages.length >= 300));
          }
          if (!navigator.onLine) { setLoading(false); return; }
          if (!socket.connected) socket.connect();
        }
        for (let batch = 0; batch < 5; batch++) {
          const cachedCursorWasSet = Boolean(historyCursor.current);
          const response = await axios.get(BASE_URL + '/chat/' + targetUserId, {
            withCredentials: true, signal: controller.signal, timeout: 20000,
            params: isAndroid() ? { sync: '1', ...(historyCursor.current ? { after: historyCursor.current } : {}) } : undefined,
          });
          if (disposed) return;
          const history = (Array.isArray(response.data?.messages) ? response.data.messages : []).map(message => normalizeMessage(message, userId));
          if (isAndroid()) historyCursor.current = response.data.cursor || historyCursor.current;
          setMessages(previous => (response.data.reset ? history : mergeMessages(previous, history)).sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0)));
          if (!historyCursor.current || response.data.reset || !cachedCursorWasSet) setHasEarlier(Boolean(response.data.hasEarlier));
          setSavedView(false); setUncertain(false); setError('');
          if (!isAndroid() || !response.data.hasMore) break;
          if (batch === 4) setError('More messages are available. Reconnect and reload to continue syncing.');
        }
      } catch {
        if (!disposed) setError('Could not refresh messages. Saved messages and your draft are still available.');
      } finally { historyPending = false; if (!disposed) setLoading(false); }
    };
    void loadHistory();
    if (socket.connected) joined();
    window.addEventListener('online', loadHistory);
    window.addEventListener('focus', loadHistory);
    return () => {
      disposed = true; controller.abort();
      window.removeEventListener('focus', loadHistory);
      window.removeEventListener('online', loadHistory);
      socket.off('connect', joined);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', disconnected);
      socket.off('messageReceived', received);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, targetUserId, attempt]);

  useEffect(() => {
    if (!isAndroid() || !userId || !messages.length || loading) return;
    const recent = messages.slice(-300).map(message => ({ _id: message.id, senderId: message.senderId,
      firstName: message.firstName, photoUrl: message.photoUrl, text: message.text, createdAt: message.time?.toISOString() }));
    while (recent.length && JSON.stringify(recent).length > 450000) recent.shift();
    const timer = setTimeout(() => { void writeDeviceCache(userId, 'chat:' + targetUserId,
      { messages: recent, cursor: historyCursor.current, hasEarlier: hasEarlier || messages.length > recent.length, partner: partner ? { _id: partner._id, firstName: partner.firstName, lastName: partner.lastName, photoUrl: partner.photoUrl } : null }); }, 300);
    return () => clearTimeout(timer);
  }, [messages, partner, userId, targetUserId, loading, hasEarlier]);

  const loadOlder = async () => {
    if (olderPending || !navigator.onLine || !messages.length) return;
    setOlderPending(true);
    try {
      const response = await axios.get(BASE_URL + '/chat/' + targetUserId, { params: { sync: '1', before: messages[0].id }, timeout: 20000 });
      if (!mounted.current) return;
      const older = (response.data.messages || []).map(message => normalizeMessage(message, userId));
      setMessages(previous => mergeMessages(older, previous)); setHasEarlier(Boolean(response.data.hasEarlier));
    } catch { if (mounted.current) setError('Could not load earlier messages. Please try again online.'); }
    finally { if (mounted.current) setOlderPending(false); }
  };
  const send = text => {
    const socket = socketRef.current;
    if (!user || !socket?.connected) {
      setError('Chat is disconnected. Your draft has not been sent. Reconnect and press Send.');
      return;
    }
    if (!text.trim() || sendPending.current || uncertain) return;
    sendPending.current = true;
    setSending(true);
    runtime.release(owner);
    runtime.clearStatus(owner);
    setError('');
    socket.timeout(15000).emit('sendMessage', { targetUserId, text }, (failure, result) => {
      if (socketRef.current !== socket) return;
      sendPending.current = false;
      setSending(false);
      if (failure) {
        setUncertain(true);
        setError('We could not confirm whether your message was saved. Reload history and review it before sending again. Your draft is preserved.');
      } else if (!result?.ok) {
        setError(result?.error || 'Your message was not saved. Your draft is preserved.');
      } else {
        if (result.message) setMessages(previous => mergeMessages(previous, [normalizeMessage(result.message, userId)]));
        setDraft(owner, '');
      }
    });
  };
  const partnerName = partner ? [partner.firstName, partner.lastName].filter(Boolean).join(' ') : 'Conversation';
  return <div className="dt-chat-surface dt-human-chat">
    <ChatShell title={partnerName} subtitle="DevTinder · Direct message"
      identity={<Avatar url={partner?.photoUrl} name={partnerName} />} onBack={() => navigate('/connections')}
      composer={<ChatComposer owner={owner} onSend={send} disabled={loading || !userId || sending || uncertain} placeholder={sending ? 'Saving message…' : 'Write a message…'} />}>
      <div ref={scrollRef} onScroll={onScroll} className="dt-chat-scroll">
        {hasEarlier && <button type="button" className="dt-text-button" disabled={olderPending || !navigator.onLine} onClick={loadOlder}>{olderPending ? 'Loading...' : 'Load earlier messages'}</button>}
        {savedView && <p className="dt-chat-cache-note" role="status">Saved messages - Reconnecting when online</p>}
        {loading && <StartupLoader message="Opening your conversation..." />}
        {!loading && !messages.length && <div className="dt-human-empty"><h2>Start a conversation</h2><p>Say hello with a message, or dictate a draft.</p></div>}
        {error && <div className="dt-reasoning" role="status"><p className="dt-error">{error}</p>
          <button type="button" className="dt-text-button" onClick={() => setAttempt(previous => previous + 1)}>Reconnect and reload history</button></div>}
        <p className="sr-only" role="status">Chat connection: {connection}</p>
        {messages.map(message => {
          // Historical IDs are reliable. Legacy live events only provide display names.
          const own = message.own ?? message.firstName === user?.firstName;
          return <article key={message.id} className={'dt-message-row' + (own ? ' dt-message-row--own' : '')}>
            <div className="dt-message-content">
              <div className={'dt-bubble' + (own ? ' dt-bubble--own' : '')}>
                <span className="dt-message-text">{message.text}</span>
                {message.time && <time className="dt-bubble-time" dateTime={message.time.toISOString()}>{messageTime(message.time)}</time>}
              </div>
            </div>
          </article>;
        })}
      </div>
      {showLatest && <button type="button" className="dt-latest" onClick={jumpToLatest}>Jump to latest ↓</button>}
    </ChatShell>
  </div>;
}
