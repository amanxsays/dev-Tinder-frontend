import { isAndroid, NativeSpeech } from './platform.js';

let sequence = 0;
const nextId = () => 'speech-' + Date.now() + '-' + (++sequence);
const resultEvent = (text, final) => ({ results: [Object.assign([{ transcript: text || '' }], { isFinal: final })] });

/** Adapt native callbacks to the existing, tested browser speech ownership boundary. */
export async function createNativeSpeechEngines(plugin = NativeSpeech) {
  const capabilities = await plugin.getCapabilities();
  class Recognition {
    lang = 'en-IN';
    listener = null;
    sessionId = null;
    start() {
      const id = nextId();
      this.sessionId = id;
      void plugin.addListener('speechEvent', event => {
        if (this.sessionId !== id || event.sessionId !== id) return;
        if (event.type === 'start') this.onstart?.();
        if (event.type === 'partial') this.onresult?.(resultEvent(event.text, false));
        if (event.type === 'final') this.onresult?.(resultEvent(event.text, true));
        if (event.type === 'error') this.onerror?.({ error: event.error || 'audio-capture' });
        if (event.type === 'end') this.onend?.();
      }).then(async listener => {
        if (this.sessionId !== id) { await listener.remove(); return; }
        this.listener = listener;
        await plugin.start({ sessionId: id, language: this.lang, maxDurationMs: 60000 });
      }).catch(() => { if (this.sessionId === id) this.onerror?.({ error: 'audio-capture' }); });
    }
    stop() { if (this.sessionId) void plugin.stop({ sessionId: this.sessionId }).catch(() => this.onend?.()); }
    abort() {
      const id = this.sessionId;
      this.sessionId = null;
      void this.listener?.remove();
      this.listener = null;
      if (id) void plugin.cancel({ sessionId: id }).catch(() => {});
    }
  }
  class Utterance { constructor(text) { this.text = text; this.lang = 'en-IN'; } }
  let playback = null;
  const synthesis = {
    getVoices: () => [{ lang: 'en-IN', name: 'Android English' }],
    cancel() {
      const previous = playback;
      playback = null;
      void previous?.listener?.remove();
      void plugin.stopSpeaking().catch(() => {});
    },
    speak(utterance) {
      this.cancel();
      const current = { id: nextId(), utterance, listener: null };
      playback = current;
      void plugin.addListener('speechEvent', event => {
        if (playback !== current || event.sessionId !== current.id) return;
        if (!['speechEnd', 'speechError'].includes(event.type)) return;
        playback = null;
        void current.listener?.remove();
        if (event.type === 'speechEnd') utterance.onend?.();
        else utterance.onerror?.();
      }).then(async listener => {
        if (playback !== current) { await listener.remove(); return; }
        current.listener = listener;
        await plugin.speak({ sessionId: current.id, text: utterance.text, language: utterance.lang });
      }).catch(() => { if (playback === current) { playback = null; utterance.onerror?.(); } });
    },
  };
  return { Recognition: capabilities.recognition ? Recognition : undefined,
    synthesis: capabilities.synthesis ? synthesis : undefined, Utterance };
}

export const nativeSpeechSupported = isAndroid;
