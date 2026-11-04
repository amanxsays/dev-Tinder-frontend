import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiSearch, FiX } from 'react-icons/fi';
import { useDeveloperSearch } from '../hooks/useDeveloperSearch';
import '../styles/discover.css';

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const rawPage = params.get('page') || '1';
  const page = /^[1-9]\d*$/.test(rawPage) ? Math.min(1000, Number(rawPage)) : 1;
  const result = useDeveloperSearch(query, page);
  const search = value => setParams(value ? { q: value } : {}, { replace: true });
  const changePage = next => setParams({ q: query, page: String(next) });
  return <section className="dt-discover" aria-labelledby="discover-title">
    <header className="dt-discover-intro">
      <p className="dt-discover-eyebrow">THE DEVTINDER NETWORK</p>
      <h1 id="discover-title">Discover developers</h1>
      <p>Find people by first or last name. Your next connection starts with a name.</p>
    </header>
    <form className="dt-discover-search" role="search" onSubmit={event => event.preventDefault()}>
      <FiSearch aria-hidden="true" />
      <input type="search" value={query} maxLength={80} aria-label="Name search" placeholder="Try Aman, Amanda, or Amit…"
        onChange={event => search(event.target.value)} />
      {query && <button type="button" aria-label="Clear name search" onClick={() => search('')}><FiX /></button>}
    </form>
    <div className="dt-discover-results" aria-busy={result.status === 'loading'}>
      {result.status === 'idle' && <div className="dt-discover-empty"><FiSearch aria-hidden="true" /><h2>Who would you like to meet?</h2><p>Enter at least 2 characters. For example, “am” finds Aman, Amanda, and Amit.</p></div>}
      {result.status === 'loading' && <p className="dt-discover-status" role="status">Searching developers…</p>}
      {result.status === 'error' && <div className="dt-discover-empty"><p role="alert">{result.error}</p><button type="button" className="dt-text-button" onClick={result.retry}>Try search again</button></div>}
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
