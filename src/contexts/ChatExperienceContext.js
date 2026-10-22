import { createContext, useContext } from 'react';

export const ChatExperienceContext = createContext(null);
export function useChatExperience() {
  const context = useContext(ChatExperienceContext);
  if (!context) throw new Error('ChatExperienceProvider is required');
  return context;
}
