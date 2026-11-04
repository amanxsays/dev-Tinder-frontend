import { useCallback, useEffect, useRef, useState } from 'react';
import { AI_CHAT_ENABLED, AI_SERVICE_URL } from '../utils/constants';
import { createSseParser } from '../utils/sseParser';
import { getResumeUrl } from '../utils/resumeSources';
import { ensureIntegrationReady } from '../utils/integrationWarmup';

export const useAgenticChat = () => {
  const [aiResponse, setAiResponse] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const requestRef = useRef(null);
  const cancel = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const askAiRecruiter = useCallback(async (query, userId, onComplete) => {
    if (!AI_CHAT_ENABLED || requestRef.current) return false;
    const controller = new AbortController();
    requestRef.current = controller;
    const current = () => requestRef.current === controller;
    let timedOut = false;
    let timer;
    setIsAiThinking(true);
    setAiResponse('');
    setAiStatus('Waiting for AI service to be ready…');
    let text = '';
    let sources = [];
    let kind = 'answer';
    let terminal = false;
    const readSources = received => {
      if (kind === 'error' || !Array.isArray(received)) return;
      sources = received.filter(source => source && typeof source.documentId === 'string'
        && typeof source.fileName === 'string')
        .map(source => ({ ...source, fileUrl: getResumeUrl(source.fileUrl) }));
    };
    try {
      if (!AI_SERVICE_URL) throw new Error('AI service is not configured.');
      await ensureIntegrationReady(AI_SERVICE_URL, { signal: controller.signal });
      if (!current() || controller.signal.aborted) return false;
      setAiStatus('Connecting to AI recruiter…');
      // The answer budget starts only after the separate startup wait completes.
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, 130000);
      const response = await fetch(AI_SERVICE_URL + '/api/chat/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId }), signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 429
        ? 'AI usage is currently limited. Please try again later.'
        : response.status === 503 ? 'The AI service is busy. Please try again shortly.'
        : 'Could not connect to the AI service. Please try again.');
      if (!response.body) throw new Error('This browser could not open the AI response stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser(({ event, data }) => {
        if (!current() || terminal) return;
        if (event === 'status') setAiStatus(data.trim());
        if (event === 'sources') {
          try { readSources(JSON.parse(data)); } catch { /* Ignore malformed source metadata. */ }
        }
        if (event === 'message' || event === 'error') {
          terminal = true;
          text = data;
          if (event === 'error') { kind = 'error'; sources = []; }
          else {
            try {
              const answer = JSON.parse(data);
              if (typeof answer?.text === 'string' && Array.isArray(answer.sources)) {
                text = answer.text; readSources(answer.sources);
              }
            } catch { /* Existing plain-text answer compatibility. */ }
          }
          setAiResponse(text);
        }
      });
      try {
        while (!terminal) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.push(decoder.decode());
        parser.finish();
        if (!terminal || !text.trim()) throw new Error('The AI response was interrupted. Please try again.');
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (error) {
      if (!current()) return false;
      kind = 'error';
      sources = [];
      text = timedOut ? 'The AI request timed out. You can try again explicitly.'
        : error.name === 'AbortError' ? 'The AI request stopped.'
        : error instanceof TypeError ? 'Could not connect to the AI server. Please try again.'
        : error.message;
    } finally {
      clearTimeout(timer);
      if (current()) {
        try {
          setAiStatus(sources.length ? 'Checking current resumes…' : '');
          await onComplete?.(text, sources, { kind });
        } finally {
          if (current()) {
            requestRef.current = null;
            setIsAiThinking(false);
            setAiStatus('');
          }
        }
      }
    }
    return true;
  }, []);
  return { askAiRecruiter, aiStatus, isAiThinking, aiResponse, cancel };
};
