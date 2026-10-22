let sequence = 0;
export const localMessageId = () => `chat-${Date.now()}-${++sequence}`;

export function normalizeMessage(message, currentUserId) {
  const sender = message.senderId;
  const senderId = typeof sender === 'object' && sender ? sender._id : sender;
  const date = new Date(message.createdAt || message.updatedAt || message.time || Date.now());
  return {
    id: String(message._id || message.id || localMessageId()),
    senderId: senderId ? String(senderId) : null,
    firstName: sender?.firstName || message.firstName || 'Member',
    photoUrl: sender?.photoUrl || message.photoUrl || '',
    text: typeof message.text === 'string' ? message.text : '',
    time: Number.isNaN(date.getTime()) ? null : date,
    own: senderId ? String(senderId) === String(currentUserId) : undefined,
  };
}

export function messageTime(time) {
  if (!time) return '';
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
