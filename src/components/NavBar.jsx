import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector, useStore } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { removeUser } from "../utils/userSlice";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { removeFeed } from "../utils/feedSlice";
import { FiBell, FiSearch, FiUsers, FiChevronDown } from "react-icons/fi";
import { removeConnections } from "../utils/connectionsSlice";
import { addRequests, removeAllRequests } from "../utils/requestsSlice";

const NavBar = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const user = useSelector(state => state.user);
  const requests = useSelector(state => state.request);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accountId = user?._id;
  const pendingCount = Array.isArray(requests) ? requests.length : 0;

  useEffect(() => {
    if (!accountId) return;
    let disposed = false;
    let controller = null;
    const refresh = async () => {
      if (disposed || document.hidden || controller) return;
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
      await axios.post(BASE_URL + "/logout", {}, { withCredentials: true });
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
      {accountId && <>
        <label className="dt-header-search">
          <FiSearch aria-hidden="true" />
          <input type="text" placeholder="Search" aria-label="Search developers" />
        </label>
        <nav className="dt-header-actions" aria-label="Main navigation">
          <NavLink to="/" end className="dt-discover-link">Discover</NavLink>
          <NavLink to="/requests" className="dt-header-icon dt-requests-link" aria-label={requestLabel} title={requestLabel}>
            <FiBell aria-hidden="true" />
            {pendingCount > 0 && <span className="dt-request-signal" aria-hidden="true">{pendingCount > 99 ? '99+' : pendingCount}</span>}
          </NavLink>
          <NavLink to="/connections" className="dt-header-icon" aria-label="Connections" title="Connections">
            <FiUsers aria-hidden="true" />
          </NavLink>
          <div className="dropdown dropdown-end dt-account">
            <button type="button" tabIndex={0} className="btn btn-ghost avatar dt-account-button" aria-label="Open account menu">
              <img alt="" src={user.photoUrl || "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"} />
              <FiChevronDown aria-hidden="true" />
            </button>
            <ul tabIndex={0} className="menu menu-sm dropdown-content dt-account-menu">
              <li><Link to="/profile">Profile</Link></li>
              <li><a>Settings</a></li>
              <li><button onClick={handleLogout}>Logout</button></li>
            </ul>
          </div>
        </nav>
      </>}
    </header>
  );
};

export default NavBar;
