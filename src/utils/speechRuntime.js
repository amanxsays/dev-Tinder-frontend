const idle = { owner: null, status: 'idle', interim: '', error: '', notice: '', startedAt: null,
  speaking: null, speechError: '', recognitionHint: '' };
const messages = {
  'not-allowed': 'Microphone permission was denied. Allow it in browser settings, or keep typing.',
  'service-not-allowed': 'Your browser does not allow speech recognition here. Keep typing instead.',
  'audio-capture': 'The microphone is unavailable or busy. Check your device and try again.',
  'network': 'Speech recognition could not connect. Your confirmed text is still available.',
  'no-speech': 'No speech was recognized. Try again or type your message.',
  'language-not-supported': 'English dictation is unavailable in this browser. Keep typing instead.',
  aborted: 'Dictation stopped. Review your draft before sending.',
};
const join = (base, text) => base + (base && text && !/\s$/.test(base) ? ' ' : '') + text;

export function recognitionErrorMessage(code, browserName = '') {
  if (browserName === 'Brave' && ['network', 'service-not-allowed'].includes(code)) {
    return "Brave's speech recognition is unavailable here. Use Chrome for voice, or your device's keyboard dictation in the text box. Your draft is preserved.";
  }
  return messages[code] || 'Speech recognition stopped unexpectedly. Review your text or keep typing.';
}

/** Browser-only speech boundary, with injectable engines/timers for dependency-free tests.
 * No audio, interim transcript, or draft is logged or persisted.
 */
export function createSpeechRuntime(options = {}) {
  let browserName = options.browserName || '';
  const Recognition = options.Recognition;
  const synthesis = options.synthesis;
  const Utterance = options.Utterance;
  const schedule = options.setTimeout || globalThis.setTimeout;
  const unschedule = options.clearTimeout || globalThis.clearTimeout;
  const now = options.now || Date.now;
  let snapshot = { ...idle };
  let capture = null;
  let playback = null;
  const listeners = new Set();
  const emit = (patch) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach(listener => listener());
  };
  const clearCapture = () => {
    const session = capture;
    capture = null;
    if (!session) return;
    session.timers.forEach(unschedule);
    session.engine.onstart = session.engine.onresult = session.engine.onerror = session.engine.onend = null;
    try { session.engine.abort(); } catch { /* Already ended. */ }
  };
  const complete = (session, error = '') => {
    if (capture !== session) return;
    const text = session.confirmed;
    session.onDraft(join(session.base, text));
    clearCapture();
    emit({ status: error ? 'error' : 'review', interim: '', startedAt: null, error,
      notice: text ? 'Dictation complete. Review and send when ready.' : 'No confirmed speech. You can type or try again.' });
  };
  const stopSpeaking = () => {
    const previous = playback;
    playback = null;
    if (previous) {
      if (previous.utterance) previous.utterance.onend = previous.utterance.onerror = null;
      try { synthesis.cancel(); } catch { /* The browser may have already stopped its speech service. */ }
    }
    emit({ speaking: null });
  };
  const interrupt = (cancel = false) => {
    const session = capture;
    if (session) {
      session.onDraft(cancel ? session.base : join(session.base, session.confirmed));
      clearCapture();
      emit({ status: cancel ? 'cancelled' : 'review', interim: '', startedAt: null, error: '',
        notice: cancel ? 'Dictation cancelled. Original draft restored.' : 'Dictation stopped. Review your confirmed text.' });
    }
    stopSpeaking();
  };
  return {
    setBrowserName(name) {
      browserName = name;
      emit({ recognitionHint: name === 'Brave'
        ? 'Dictation may be unavailable in Brave. Use Chrome or your device\'s keyboard dictation. Your browser may process speech remotely.'
        : '' });
    },
    recognitionSupported: Boolean(Recognition),
    synthesisSupported: Boolean(synthesis && Utterance),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    start({ owner, draft, onDraft }) {
      interrupt();
      if (!Recognition || options.secureContext === false) {
        emit({ owner, status: 'error', error: !Recognition
          ? 'Voice dictation is unavailable in this browser. You can keep typing.'
          : 'Microphone access requires HTTPS or localhost. You can keep typing.' });
        return false;
      }
      let engine;
      try { engine = new Recognition(); } catch {
        emit({ owner, status: 'error', error: 'Speech recognition is unavailable. You can keep typing.' });
        return false;
      }
      const session = { engine, base: draft, confirmed: '', onDraft, timers: [] };
      capture = session;
      engine.lang = 'en-IN';
      engine.interimResults = true;
      engine.continuous = true;
      engine.maxAlternatives = 1;
      emit({ owner, status: 'permission', error: '', interim: '', notice: 'Waiting for microphone permission…' });
      engine.onstart = () => {
        if (capture !== session) return;
        session.timers.forEach(unschedule);
        session.timers = [];
        emit({ status: 'listening', startedAt: now(), notice: 'Listening. Stop to review your text.' });
        session.timers.push(schedule(() => this.stop(owner), 60000));
      };
      engine.onresult = event => {
        if (capture !== session) return;
        const confirmed = [];
        const provisional = [];
        // Reconstruct the indexed result list; interim revisions never append duplicates.
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          (result.isFinal ? confirmed : provisional).push(result[0].transcript);
        }
        session.confirmed = confirmed.join(' ').trim();
        onDraft(join(session.base, session.confirmed));
        emit({ interim: provisional.join(' ').trim() });
      };
      engine.onerror = event => complete(session, recognitionErrorMessage(event.error, browserName));
      engine.onend = () => complete(session);
      session.timers.push(schedule(() => complete(session, 'Microphone permission did not complete. You can retry explicitly or keep typing.'), 15000));
      try { engine.start(); } catch {
        complete(session, 'Could not start dictation. Check microphone access or keep typing.');
        return false;
      }
      return true;
    },
    stop(owner) {
      const session = capture;
      if (!session || snapshot.owner !== owner || snapshot.status === 'finishing') return;
      if (snapshot.status === 'permission') { complete(session); return; }
      emit({ status: 'finishing', notice: 'Finishing recognition. Review before sending.' });
      session.timers.push(schedule(() => complete(session), 2000));
      try { session.engine.stop(); } catch { complete(session); }
    },
    cancel(owner) { if (snapshot.owner === owner) interrupt(true); },
    release(owner) {
      if (capture && snapshot.owner === owner) interrupt();
      if (playback?.owner === owner) stopSpeaking();
    },
    clearStatus(owner) {
      if (!capture && snapshot.owner === owner) emit({ status: 'idle', error: '', notice: '', interim: '' });
    },
    interrupt,
    stopSpeaking,
    speak({ owner, messageId, chunks }) {
      interrupt();
      if (!synthesis || !Utterance || !chunks.length) {
        emit({ speechError: 'Read aloud is unavailable for this answer. You can still read the text.' });
        return;
      }
      let voices = [];
      try { voices = synthesis.getVoices(); } catch { /* Use the browser's default English voice. */ }
      const voice = voices.find(item => /^en[-_]IN$/i.test(item.lang))
        || voices.find(item => /^en\b/i.test(item.lang));
      let index = 0;
      const session = { owner, messageId, utterance: null };
      playback = session;
      const next = () => {
        if (playback !== session) return;
        if (index >= chunks.length) { playback = null; emit({ speaking: null }); return; }
        let utterance;
        try { utterance = new Utterance(chunks[index++]); } catch {
          playback = null;
          emit({ speaking: null, speechError: 'Read aloud could not start. The text is still available.' });
          return;
        }
        session.utterance = utterance;
        utterance.lang = voice?.lang || 'en-IN';
        if (voice) utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = next;
        utterance.onerror = () => {
          if (playback !== session) return;
          playback = null;
          emit({ speaking: null, speechError: 'Read aloud stopped. The text is still available.' });
        };
        try { synthesis.speak(utterance); } catch { utterance.onerror(); }
      };
      emit({ speaking: { owner, messageId }, speechError: '' });
      next();
    },
    reset() {
      clearCapture();
      stopSpeaking();
      snapshot = { ...idle };
      listeners.forEach(listener => listener());
    },
  };
}
