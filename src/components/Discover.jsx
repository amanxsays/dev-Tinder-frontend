import { useEffect, useState } from 'react';
import axios from '../platform/apiClient';
import { BASE_URL } from '../utils/constants';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { useDeveloperSearch } from '../hooks/useDeveloperSearch';
import '../styles/discover.css';

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const rawPage = params.get('page') || '1';
  const page = /^[1-9]\d*$/.test(rawPage) ? Math.min(1000, Number(rawPage)) : 1;
  const result = useDeveloperSearch(query, page);
  const [connected, setConnected] = useState(new Set());
  useEffect(() => {
    const controller = new AbortController();
    axios.get(BASE_URL + '/user/connections', { withCredentials: true, signal: controller.signal, timeout: 15000 })
      .then(response => { if (!controller.signal.aborted) setConnected(new Set((Array.isArray(response.data) ? response.data : []).map(person => person._id))); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const changePage = next => setParams({ q: query, page: String(next) });
  return <section className="dt-discover" aria-labelledby="discover-title">
    <h1 id="discover-title" className="sr-only">Developer search results</h1>
    <div className="dt-discover-results" aria-busy={result.status === 'loading'}>
      {result.status === 'idle' && <p className="dt-discover-status" role="status">Enter at least 2 characters in the search bar above.</p>}
      {result.status === 'loading' && <p className="dt-discover-status" role="status">Searching developers…</p>}
      {result.status === 'error' && <div className="dt-discover-feedback"><p role="alert">{result.error}</p><button type="button" className="dt-text-button" onClick={result.retry}>Try search again</button></div>}
      {result.status === 'ready' && <>
        <p className="dt-discover-summary" role="status">{result.users.length
          ? `${result.users.length} ${result.users.length === 1 ? 'profile' : 'profiles'} matching “${query.trim()}”${page > 1 ? ` · Page ${page}` : ''}`
          : `No profiles found for “${query.trim()}”. Try another name.`}</p>
        <div className="dt-discover-grid">
          {result.users.map(user => <article className="dt-discover-card" key={user._id}>
            <div className="dt-discover-person">
              <div className="dt-discover-avatar" aria-hidden="true"><span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
                {user.photoUrl && <img src={user.photoUrl} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
              </div>
              <div><h2>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</h2>
                <p>{[user.age && `${user.age} years`, user.gender].filter(Boolean).join(' · ') || 'DevTinder developer'}</p></div>
            </div>
            <p className="dt-discover-about">{user.about || 'Explore this developer’s profile to learn more.'}</p>
            <div className="dt-discover-skills">{(Array.isArray(user.skills) ? user.skills : []).slice(0, 4).map((skill, index) => <span key={index}>{skill}</span>)}</div>
            {connected.has(user._id) && <Link className="dt-search-chat" to={'/chat/' + encodeURIComponent(user._id)}>Chat</Link>}
            <Link to={'/profile/' + encodeURIComponent(user._id)} aria-label={'View ' + [user.firstName, user.lastName].filter(Boolean).join(' ') + ' profile'}>View profile <FiArrowRight aria-hidden="true" /></Link>
          </article>)}
        </div>
        {(page > 1 || result.hasMore) && <nav className="dt-discover-pages" aria-label="Search result pages">
          <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page}</span>
          <button type="button" disabled={!result.hasMore || page >= 1000} onClick={() => changePage(page + 1)}>Next</button>
        </nav>}
      </>}
    </div>
  </section>;
}
