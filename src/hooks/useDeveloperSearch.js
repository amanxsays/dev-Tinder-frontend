import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import { getApiErrorMessage } from '../utils/apiErrors';

export function useDeveloperSearch(query, page) {
  const accountId = useSelector(state => state.user?._id);
  const name = query.trim();
  const key = JSON.stringify([accountId, name, page]);
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!accountId || name.length < 2) return;
    let disposed = false;
    const controller = new AbortController();
    setResult({ key, status: 'loading', users: [], hasMore: false });
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(BASE_URL + '/user/search', {
          params: { q: name, page }, withCredentials: true, signal: controller.signal, timeout: 30000,
        });
        if (!Array.isArray(response.data?.users) || typeof response.data.hasMore !== 'boolean') {
          throw new Error('Search returned an unexpected response. Please try again.');
        }
        if (!disposed) setResult({ key, status: 'ready', users: response.data.users, hasMore: response.data.hasMore });
      } catch (error) {
        if (!disposed && !axios.isCancel(error)) setResult({ key, status: 'error', users: [], hasMore: false,
          error: getApiErrorMessage(error, 'Search is temporarily unavailable. Please try again.') });
      }
    }, 300);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [accountId, key, name, page, retry]);
  const current = accountId && name.length >= 2
    ? result?.key === key ? result : { status: 'loading', users: [], hasMore: false }
    : { status: 'idle', users: [], hasMore: false };
  return { ...current, retry: () => setRetry(value => value + 1) };
}
