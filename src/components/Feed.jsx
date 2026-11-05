import { useEffect, useState } from 'react';
import UserCard from './UserCard';
import axios from '../platform/apiClient';
import { BASE_URL } from '../utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import { addFeed } from '../utils/feedSlice';
import { FaSpinner } from 'react-icons/fa';
import { AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiX } from 'react-icons/fi';
import '../styles/feed.css';

function DeveloperCards({ feed, accountId }) {
  const hintKey = 'devtinder.swipe-hint:' + accountId;
  const [hintVisible, setHintVisible] = useState(() => {
    try { return localStorage.getItem(hintKey) !== 'seen'; } catch { return true; }
  });
  const dismissHint = () => {
    setHintVisible(false);
    try { localStorage.setItem(hintKey, 'seen'); } catch { /* Keep dismissal in memory. */ }
  };
  return <div className="dt-feed-stack">
    {hintVisible && <aside className="dt-swipe-hint" aria-label="Swipe left to ignore or right if interested">
      <div className="dt-swipe-directions"><span><FiArrowLeft aria-hidden="true" />Ignore</span><span>Interested<FiArrowRight aria-hidden="true" /></span></div>
      <div className="dt-swipe-track" aria-hidden="true"><span /></div>
      <p>Swipe a card. Or use the buttons.</p>
      <button type="button" aria-label="Dismiss swipe hint" onClick={dismissHint}><FiX aria-hidden="true" /></button>
    </aside>}
    <AnimatePresence mode="wait"><UserCard key={feed[0]._id} user={feed[0]} onAction={dismissHint} /></AnimatePresence>
  </div>;
}

export default function Feed() {
  const dispatch = useDispatch();
  const feed = useSelector(store => store.feed);
  const accountId = useSelector(store => store.user?._id);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!accountId || feed) return;
    let disposed = false;
    const controller = new AbortController();
    void axios.get(BASE_URL + '/user/feed', { withCredentials: true, signal: controller.signal, timeout: 15000 })
      .then(response => {
        if (disposed) return;
        if (!Array.isArray(response.data)) throw new Error('Invalid developer feed');
        dispatch(addFeed(response.data));
      }).catch(failure => {
        if (!disposed && !axios.isCancel(failure)) setError('Could not load developers. Check your connection and try again.');
      });
    return () => { disposed = true; controller.abort(); };
  }, [accountId, feed, dispatch, retry]);
  if (error && !feed) return <section className="dt-session-status"><h1>Let’s reconnect</h1><p role="status">{error}</p><button type="button" onClick={() => { setError(''); setRetry(value => value + 1); }}>Retry developers</button></section>;
  if (!feed) return <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="status"><FaSpinner className="animate-spin text-blue-400 text-3xl" aria-hidden="true" /><p className="text-slate-400 text-sm">Loading developers…</p></div>;
  if (feed.length === 0) return <section className="dt-session-status"><h1>You’re all caught up</h1><p className="text-slate-400 leading-relaxed">There are no more developers in your feed right now. Use the header search to find someone by name.</p></section>;
  return <DeveloperCards key={accountId} feed={feed} accountId={accountId} />;
}
