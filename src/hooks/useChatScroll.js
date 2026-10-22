import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function useChatScroll(changeKey, enabled = true) {
  const scrollRef = useRef(null);
  const following = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (!enabled) {
      following.current = true;
      setShowLatest(false);
      return;
    }
    following.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90;
    setShowLatest(!following.current);
  }, [enabled]);
  const jumpToLatest = useCallback(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
    following.current = true;
    setShowLatest(false);
  }, []);
  useLayoutEffect(() => {
    if (!enabled) {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      following.current = true;
      setShowLatest(false);
    } else if (following.current) jumpToLatest();
    else setShowLatest(true);
  }, [changeKey, enabled, jumpToLatest]);
  return { scrollRef, onScroll, showLatest, jumpToLatest };
}
