import { useState } from 'react';
import { AI_CHAT_ENABLED, AI_SERVICE_URL } from '../utils/constants';
import { createSseParser } from '../utils/sseParser';
import { getResumeUrl } from '../utils/resumeSources';

export const useAgenticChat = () => {
    const [aiResponse, setAiResponse] = useState('');
    const [aiStatus, setAiStatus] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const askAiRecruiter = async (query, userId, onComplete) => {
        if (!AI_CHAT_ENABLED) return;

        setIsAiThinking(true);
        setAiResponse('');
        setAiStatus('Connecting to Agentic AI...');

        let finalMessage = '';
        let sources = [];
        const readSources = (received) => {
            if (!Array.isArray(received)) return;
            sources = received.filter(source => source && typeof source.documentId === 'string'
                && typeof source.fileName === 'string')
                .map(source => ({ ...source, fileUrl: getResumeUrl(source.fileUrl) }));
        };

        try {
            if (!AI_SERVICE_URL) {
                throw new Error('VITE_STATS_SERVICE_URL is required for AI chat');
            }
            const response = await fetch(`${AI_SERVICE_URL}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, userId }),
            });

            if (!response.ok) throw new Error(`AI request failed (${response.status})`);
            if (!response.body) throw new Error('Stream not supported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            const parser = createSseParser(({ event, data }) => {
                if (event === 'status') setAiStatus(data.trim());
                if (event === 'sources') {
                    readSources(JSON.parse(data));
                }
                if (event === 'message' || event === 'error') {
                    if (event === 'error') sources = [];
                    let answerText = data;
                    if (event === 'message') {
                        try {
                            const answer = JSON.parse(data);
                            if (typeof answer?.text === 'string' && Array.isArray(answer.sources)) {
                                answerText = answer.text;
                                readSources(answer.sources);
                            }
                        } catch {
                            // Older service versions send plain-text answers.
                        }
                    }
                    finalMessage += answerText + '\n';
                    setAiResponse(finalMessage);
                }
            });
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    parser.push(decoder.decode(value, { stream: true }));
                }
                parser.push(decoder.decode());
                parser.finish();
            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            console.error('Failed to stream AI:', error);
            finalMessage = "I encountered a network error connecting to the AI server.";
        } finally {
            try {
                if (onComplete && finalMessage) {
                    setAiStatus('Checking current resumes...');
                    await onComplete(finalMessage.trim(), sources);
                }
            } finally {
                setIsAiThinking(false);
                setAiStatus('');
            }
        }
    };

    return { askAiRecruiter, aiStatus, isAiThinking, aiResponse };
};
