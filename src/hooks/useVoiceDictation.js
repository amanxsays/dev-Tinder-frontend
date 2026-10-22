import { useEffect, useState } from 'react';
import { useChatExperience } from '../contexts/ChatExperienceContext';

export function useVoiceDictation(owner) {
  const { runtime, speech, draft, setDraft } = useChatExperience();
  const [elapsed, setElapsed] = useState(0);
  const owns = speech.owner === owner;
  const status = owns ? speech.status : 'idle';
  const active = ['permission', 'listening', 'finishing'].includes(status);
  useEffect(() => () => runtime.release(owner), [runtime, owner]);
  useEffect(() => {
    if (!owns || !speech.startedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.min(60, Math.floor((Date.now() - speech.startedAt) / 1000)));
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [owns, speech.startedAt]);
  return {
    status, active, elapsed, supported: runtime.recognitionSupported,
    hint: speech.recognitionHint,
    interim: owns ? speech.interim : '',
    error: owns ? speech.error : '',
    notice: owns ? speech.notice : '',
    start: () => runtime.start({ owner, draft: draft(owner), onDraft: text => setDraft(owner, text) }),
    stop: () => runtime.stop(owner),
    cancel: () => runtime.cancel(owner),
  };
}
