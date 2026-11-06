import { isAndroid } from '../platform/platform';
import { session } from '../platform/session';
import { disableNotifications } from '../platform/nativeNotifications';
import UserAvatar from './UserAvatar';
import { useEffect, useRef, useState } from "react";
import axios from "../platform/apiClient";
import { useDispatch, useSelector, useStore } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { removeUser } from "../utils/userSlice";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { removeFeed } from "../utils/feedSlice";
import { FiBell, FiSearch, FiUsers, FiChevronDown, FiDownload } from "react-icons/fi";
import { removeConnections } from "../utils/connectionsSlice";
import { addRequests, removeAllRequests } from "../utils/requestsSlice";
import { forgetSession } from "../utils/sessionHint";

const NavBar = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const user = useSelector(state => state.user);
  const requests = useSelector(state => state.request);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [accountMenu, setAccountMenu] = useState(null);
  const accountRef = useRef(null);
  const accountButton = useRef(null);
  const menuKey = accountId => `${accountId || ''}:${pathname}:${search}`;
  const accountMenuOpen = accountMenu === menuKey(user?._id);
  const profilePage = pathname === '/profile' || pathname.startsWith('/profile/');
  const searchQuery = pathname === '/discover' ? new URLSearchParams(search).get('q') || '' : '';
  const searchDevelopers = query => navigate('/discover' + (query ? '?q=' + encodeURIComponent(query) : ''), { replace: pathname === '/discover' });
  const accountId = user?._id;
  const pendingCount = Array.isArray(requests) ? requests.length : 0;

  useEffect(() => {
    if (!accountMenuOpen) return;
    const outside = event => { if (!accountRef.current?.contains(event.target)) setAccountMenu(null); };
    const escape = event => {
      if (event.key === 'Escape') { setAccountMenu(null); accountButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountId) return;
    let disposed = false;
    let controller = null;
    const refresh = async () => {
      if (disposed || document.hidden || controller || !navigator.onLine) return;
      controller = new AbortController();
      // A review can change the list while this request is in flight.
      const previousRequests = store.getState().request;
      try {
        const response = await axios.get(BASE_URL + "/user/requests/received", {
          withCredentials: true, signal: controller.signal, timeout: 15000,
        });
        if (!disposed && store.getState().user?._id === accountId
          && store.getState().request === previousRequests && Array.isArray(response.data)) {
          dispatch(addRequests(response.data));
        }
      } catch {
        // Keep the last confirmed badge on a temporary network failure.
      } finally { controller = null; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [accountId, dispatch, pathname, store]);

  const handleLogout = async () => {
    try {
      if (isAndroid()) {
        await disableNotifications({ awaitRemote: false });
        await session.clear();
      } else await axios.post(BASE_URL + "/logout", {}, { withCredentials: true });
      forgetSession();
      dispatch(removeUser());
      dispatch(removeFeed());
      dispatch(removeConnections());
      dispatch(removeAllRequests());
      navigate("/login");
      toast.success("Logged out successfully.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  const requestLabel = pendingCount
    ? 'Connection requests, ' + pendingCount + ' pending'
    : 'Connection requests';

  return (
    <header className="navbar dt-site-header">
      <Link to="/" className="dt-site-brand" aria-label="DevTinder home">
        <img src="/image.png" alt="" />
        <span><strong>DevTinder</strong><small>DEVELOPER NETWORK</small></span>
      </Link>
      {!isAndroid() && <Link to="/download" className="dt-download-link" aria-label="Download DevTinder for Android">
        <FiDownload aria-hidden="true" /><span>Get Android app</span>
      </Link>}
      {accountId && <>
        {!profilePage && <form className="dt-header-search" role="search" onSubmit={event => { event.preventDefault(); searchDevelopers(searchQuery); }}>
          <FiSearch aria-hidden="true" />
          <input type="search" placeholder="Search developers" aria-label="Search developers" maxLength={80} value={searchQuery} onChange={event => searchDevelopers(event.target.value)} />
        </form>}
        <nav className="dt-header-actions" aria-label="Main navigation">
          <NavLink to="/requests" className="dt-header-icon dt-requests-link" aria-label={requestLabel} title={requestLabel}>
            <FiBell aria-hidden="true" />
            {pendingCount > 0 && <span className="dt-request-signal" aria-hidden="true">{pendingCount > 99 ? '99+' : pendingCount}</span>}
          </NavLink>
          <NavLink to="/connections" className="dt-header-icon" aria-label="Connections" title="Connections">
            <FiUsers aria-hidden="true" />
          </NavLink>
          <div className="dt-account" ref={accountRef}>
            <button ref={accountButton} type="button" className="btn btn-ghost avatar dt-account-button" aria-label="Open account menu" aria-expanded={accountMenuOpen} aria-controls={accountMenuOpen ? 'dt-account-menu' : undefined} onClick={() => setAccountMenu(accountMenuOpen ? null : menuKey(user?._id))}>
              <UserAvatar user={user} />
              <FiChevronDown aria-hidden="true" />
            </button>
            {accountMenuOpen && <ul id="dt-account-menu" className="menu menu-sm dt-account-menu" onClick={() => setAccountMenu(null)}>
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/settings/notifications">Notifications</Link></li>
              {!isAndroid() && <li><Link to="/download">Get Android app</Link></li>}
              <li><button onClick={handleLogout}>Logout</button></li>
            </ul>}
          </div>
        </nav>
      </>}
    </header>
  );
};

export default NavBar;
