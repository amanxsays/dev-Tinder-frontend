import { useEffect, useState } from 'react';
import UserCard from './UserCard';
import axios from '../platform/apiClient';
import { BASE_URL } from '../utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import { addFeed } from '../utils/feedSlice';
import { FaSpinner } from 'react-icons/fa';
import { AnimatePresence } from 'framer-motion';

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
  return <div className="flex justify-center items-start min-h-[80vh]"><AnimatePresence mode="wait"><UserCard key={feed[0]._id} user={feed[0]} /></AnimatePresence></div>;
}
