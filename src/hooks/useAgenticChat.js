import { useState } from 'react';

export const useAgenticChat = () => {
    const [aiResponse, setAiResponse] = useState('');
    const [aiStatus, setAiStatus] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const askAiRecruiter = async (query, userId, onComplete) => {
        setIsAiThinking(true);
        setAiResponse('');
        setAiStatus('Connecting to Agentic AI...');

        let finalMessage = '';

        try {
            const response = await fetch('http://localhost:8080/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, userId }),
            });

            if (!response.body) throw new Error('Stream not supported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    let currentEvent = '';

                    lines.forEach(line => {
                        if (line.startsWith('name:')) {
                            currentEvent = line.replace('name:', '').trim();
                        } else if (line.startsWith('data:')) {
                            const dataPayload = line.replace('data:', '').trim();

                            if (currentEvent === 'status') {
                                setAiStatus(dataPayload);
                            } else if (currentEvent === 'message') {
                                finalMessage = dataPayload;
                                setAiResponse(dataPayload);
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to stream AI:', error);
            finalMessage = "I encountered a network error connecting to the AI server.";
        } finally {
            setIsAiThinking(false);
            setAiStatus('');
            if (onComplete && finalMessage) {
                onComplete(finalMessage);
            }
        }
    };

    return { askAiRecruiter, aiStatus, isAiThinking };
};