import { readDeviceCache, writeDeviceCache } from '../platform/deviceCache';
import { session } from '../platform/session';
import { isAndroid } from '../platform/platform';
import NavBar from './NavBar'
import StartupLoader from './StartupLoader'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Footer from './Footer'
import { useCallback, useEffect, useRef, useState } from 'react'
import axios from '../platform/apiClient'
import { BASE_URL } from '../utils/constants'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { addUser } from '../utils/userSlice'
import { forgetSession, hasSessionHint, isSessionRejected, rememberSession, sessionReturnPath } from '../utils/sessionHint'
import '../styles/site.css'
const Body = () => {
  const dispatch = useDispatch()
  const store = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  locationRef.current = location
  const accountId = useSelector(state => state.user?._id)
  const [connected, setConnected] = useState(navigator.onLine);
  useEffect(() => {
    const refresh = () => setConnected(navigator.onLine);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); };
  }, []);
  const [remembered, setRemembered] = useState(hasSessionHint)
  const [restoring, setRestoring] = useState('checking')
  const [retry, setRetry] = useState(0)
  const [manualAuth, setManualAuth] = useState(false)
  const manualAuthRef = useRef(false)
  const startManualAuth = useCallback(() => { manualAuthRef.current = true; setManualAuth(true) }, [])
  useEffect(() => {
    if (accountId || manualAuth) return
    let disposed = false
    const controller = new AbortController()
    setRemembered(hasSessionHint())
    setRestoring('checking')
    // This also wakes Node, but never blocks displaying the public login form.
    session.load().then(() => {
      if (disposed || manualAuthRef.current) throw new DOMException('Cancelled', 'AbortError');
      if (isAndroid() && !session.token()) {
        setRemembered(false);
        setRestoring('anonymous');
        // An unauthenticated profile probe still wakes Node while credentials are entered.
      }
      if (isAndroid() && !navigator.onLine && session.token()) {
        return readDeviceCache(session.snapshot()?.userId, 'profile').then(cached => {
          if (!cached) throw new Error('No offline profile');
          return { data: cached, offline: true };
        });
      }
      return axios.get(BASE_URL + '/session', {
      withCredentials: true, signal: controller.signal, timeout: 180000,
      });
    }).then(response => {
      if (!response) return;
      if (disposed || manualAuthRef.current || store.getState().user?._id) return
      if (!response.data?._id) throw new Error('The session response is not ready.')
      const destination = locationRef.current.pathname === '/login'
        ? sessionReturnPath(locationRef.current.state?.from) : null
      rememberSession()
      dispatch(addUser(response.data))
      if (!response.offline) void writeDeviceCache(response.data._id, 'profile', response.data)
      if (destination !== null) navigate(destination, { replace: true })
    }).catch(error => {
      if (disposed || manualAuthRef.current || axios.isCancel(error) || store.getState().user?._id) return
      if (isSessionRejected(error.response)) {
        if (isAndroid()) void session.clear().catch(() => {});
        forgetSession()
        setRemembered(false)
        setRestoring('anonymous')
      } else {
        // A network/startup failure does not prove a saved session has expired.
        setRestoring('error')
      }
    })
    return () => { disposed = true; controller.abort() }
  }, [accountId, dispatch, manualAuth, navigate, retry, store])
  const returnTo = location.pathname + location.search + location.hash
  let page
  if (accountId) {
    page = <Outlet />
  } else if (location.pathname === '/login') {
    page = <Outlet context={{ startManualAuth }} />
  } else if (!remembered || restoring === 'anonymous' || manualAuth) {
    page = <Navigate to="/login" replace state={{ from: returnTo }} />
  } else {
    page = <StartupLoader error={restoring === 'error'} message={restoring === 'error' ? 'Check your connection and try again.' : 'Securely connecting to your account...'}>
      {restoring === 'error' && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
      <button type="button" className="dt-sign-in-alternative" onClick={() => {
        startManualAuth()
        navigate('/login', { replace: true, state: { from: returnTo } })
      }}>Sign in instead</button>
    </StartupLoader>
  }
  return (
    <div className="dt-app-frame">
      <div className="dt-app-backdrop" aria-hidden="true" />
      <NavBar />
      <main className="dt-app-main">
        {accountId && isAndroid() && !connected && <p className="dt-offline-banner" role="status">Offline - Saved data only</p>}{page}</main>
      {!isAndroid() && <Footer />}
    </div>
  )
}
export default Body
