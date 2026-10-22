import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ChatExperienceContext } from '../../contexts/ChatExperienceContext';
import { createSpeechRuntime } from '../../utils/speechRuntime';
import '../../styles/chat.css';

export default function ChatExperienceProvider({ children }) {
  const accountId = useSelector(store => store.user?._id) || 'anonymous';
  const { pathname } = useLocation();
  const runtime = useMemo(() => createSpeechRuntime({
    ownerScope: accountId,
    Recognition: window.SpeechRecognition || window.webkitSpeechRecognition,
    synthesis: window.speechSynthesis,
    Utterance: window.SpeechSynthesisUtterance,
    secureContext: window.isSecureContext,
  }), [accountId]); // New account receives a completely separate speech owner.
  const speech = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  useEffect(() => {
    let disposed = false;
    // Brave can expose Chromium's constructor even when its speech service is unavailable.
    Promise.resolve().then(() => navigator.brave?.isBrave?.())
      .then(isBrave => { if (!disposed && isBrave) runtime.setBrowserName('Brave'); })
      .catch(() => { /* Browser detection is optional; normal feature/error checks still apply. */ });
    return () => { disposed = true; };
  }, [runtime]);
  const [draftStore, setDraftStore] = useState({ accountId, values: {} });
  const [surface, setSurface] = useState(null);
  const aiOpen = accountId !== 'anonymous' && surface?.accountId === accountId && surface?.pathname === pathname && surface.open;
  const aiOwner = accountId + ':ai';
  const openAi = useCallback(() => {
    if (accountId === 'anonymous') return;
    runtime.interrupt();
    setSurface({ accountId, pathname, open: true });
  }, [accountId, pathname, runtime]);
  const closeAi = useCallback(() => {
    runtime.release(aiOwner);
    setSurface(null);
  }, [runtime, aiOwner]);
  const setDraft = useCallback((owner, text) => {
    setDraftStore(previous => ({
      accountId,
      values: { ...(previous.accountId === accountId ? previous.values : {}), [owner]: text },
    }));
  }, [accountId]);
  const draft = useCallback(owner => draftStore.accountId === accountId ? draftStore.values[owner] || '' : '',
    [draftStore, accountId]);

  useEffect(() => {
    const hidden = () => {
      document.documentElement.classList.toggle('dt-chat-page-hidden', document.hidden);
      if (document.hidden) runtime.interrupt();
    };
    const leave = () => runtime.interrupt();
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', hidden);
      document.documentElement.classList.remove('dt-chat-page-hidden');
      runtime.reset();
    };
  }, [runtime]);
  useEffect(() => { runtime.interrupt(); }, [pathname, runtime]);
  // Clear retained drafts even if the same account signs in again later.
  useEffect(() => { setDraftStore({ accountId, values: {} }); }, [accountId]);

  return <ChatExperienceContext.Provider value={{
    accountId, aiOwner, aiOpen: Boolean(aiOpen), openAi, closeAi, draft, setDraft, runtime, speech,
  }}>{children}</ChatExperienceContext.Provider>;
}
