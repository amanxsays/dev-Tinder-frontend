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
            // Note: Ensure your Spring Boot endpoint is a @PostMapping since you are using POST here
            const response = await fetch('http://localhost:8080/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, userId }),
            });

            if (!response.body) throw new Error('Stream not supported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            
            // Move currentEvent outside the while loop so it persists across stream chunks
            let currentEvent = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        // FIX 1: Listen for 'event:' instead of 'name:'
                        if (line.startsWith('event:')) {
                            currentEvent = line.replace('event:', '').trim();
                        } 
                        else if (line.startsWith('data:')) {
                            // FIX 2: Use substring(5) to preserve intentional spacing from the AI
                            const dataPayload = line.substring(5);

                            if (currentEvent === 'status') {
                                setAiStatus(dataPayload.trim());
                            } 
                            else if (currentEvent === 'message') {
                                // FIX 3: Append the text and a newline to build the full paragraph
                                finalMessage += dataPayload + '\n';
                                setAiResponse(finalMessage);
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
                // Trim any trailing newlines before pushing to the chat bubble
                onComplete(finalMessage.trim()); 
            }
        }
    };

    return { askAiRecruiter, aiStatus, isAiThinking, aiResponse };
};