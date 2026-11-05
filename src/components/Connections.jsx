import axios from '../platform/apiClient';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import { addConnections } from '../utils/connectionsSlice';
import ConnectionCard from './ConnectionCard';

export default function Connections() {
  const dispatch = useDispatch();
  const connections = useSelector(store => store.connection);
  const accountId = useSelector(store => store.user?._id);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let disposed = false;
    const controller = new AbortController();
    void axios.get(BASE_URL + '/user/connections', {
      withCredentials: true, signal: controller.signal, timeout: 15000,
    }).then(response => {
      if (disposed) return;
      if (!Array.isArray(response.data)) throw new Error('Invalid connections response');
      dispatch(addConnections(response.data));
      setError('');
    }).catch(failure => {
      if (!disposed && !axios.isCancel(failure)) setError('Could not load your connections. Check your connection and try again.');
    });
    return () => { disposed = true; controller.abort(); };
  }, [accountId, dispatch, retry]);
  return <section aria-labelledby="dt-connections-heading">
    <h1 id="dt-connections-heading" className="dt-section-title text-3xl font-mono pt-2 text-center">Connections</h1>
    {error && <div className="dt-session-status"><p role="status">{error}</p><button type="button" onClick={() => { setError(''); setRetry(value => value + 1); }}>Retry connections</button></div>}
    {!connections && !error && <p role="status" className="text-center text-slate-400 py-8">Loading connections…</p>}
    {Array.isArray(connections) && connections.length === 0 && <p className="text-center text-slate-400 py-8">No connections yet.</p>}
    {Array.isArray(connections) && connections.map(user => <ConnectionCard key={user._id} user={user} />)}
  </section>;
}
