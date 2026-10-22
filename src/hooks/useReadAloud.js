import { useChatExperience } from '../contexts/ChatExperienceContext';
import { speechChunks, speechText } from '../utils/speechText';

export function useReadAloud(owner) {
  const { runtime, speech } = useChatExperience();
  return {
    supported: runtime.synthesisSupported,
    speakingId: speech.speaking?.owner === owner ? speech.speaking.messageId : null,
    error: speech.speechError,
    stop: runtime.stopSpeaking,
    read: (messageId, text) => runtime.speak({ owner, messageId, chunks: speechChunks(speechText(text)) }),
  };
}
