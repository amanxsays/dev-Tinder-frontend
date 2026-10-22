import { useEffect } from 'react';
import { useChatExperience } from '../../contexts/ChatExperienceContext';
import { AI_CHAT_ENABLED } from '../../utils/constants';

export default function AiChatRoute() {
  const { accountId, openAi } = useChatExperience();
  useEffect(() => { if (AI_CHAT_ENABLED && accountId !== 'anonymous') openAi(); }, [accountId, openAi]);
  // Body resolves the cookie session and redirects signed-out users to /login.
  if (accountId === 'anonymous') return <div className="p-8 text-center" role="status">Checking your session…</div>;
  return <div className="p-8 text-center" role="status">
    {AI_CHAT_ENABLED ? 'Opening AI recruiter…' : 'AI chat is currently unavailable.'}
  </div>;
}
