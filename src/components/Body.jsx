import { notificationsOptedIn } from '../platform/nativeNotifications';
import { session } from '../platform/session';
import { isAndroid } from '../platform/platform';
import NavBar from './NavBar'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
      return axios.get(BASE_URL + '/profile/view', {
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
      if (destination !== null) navigate(destination, { replace: true })
    }).catch(error => {
      if (disposed || manualAuthRef.current || axios.isCancel(error) || store.getState().user?._id) return
      if (isSessionRejected(error.response)) {
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
  if (location.pathname === '/download' || location.pathname === '/download/') {
    page = <Outlet />
  } else if (accountId) {
    page = <Outlet />
  } else if (location.pathname === '/login') {
    page = <Outlet context={{ startManualAuth }} />
  } else if (!remembered || restoring === 'anonymous' || manualAuth) {
    page = <Navigate to="/login" replace state={{ from: returnTo }} />
  } else {
    page = <section className="dt-session-status" aria-label="Session restoration">
      <p className="dt-session-eyebrow">WELCOME BACK</p>
      <h1>{restoring === 'error' ? 'Let’s reconnect.' : 'Restoring your session'}</h1>
      <p role="status">{restoring === 'error'
        ? 'We could not verify your session yet. The server may still be starting.'
        : 'Checking your saved session. This may take a moment if the server is waking up.'}</p>
      <div>
        {restoring === 'error' && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
        <button type="button" onClick={() => {
          startManualAuth()
          navigate('/login', { replace: true, state: { from: returnTo } })
        }}>Sign in instead</button>
      </div>
    </section>
  }

  return (
    <div className="dt-app-frame">
      <div className="dt-app-backdrop" aria-hidden="true" />
      <NavBar />
      <main className="dt-app-main">
        {isAndroid() && accountId && !notificationsOptedIn() && location.pathname !== "/settings/notifications" && <aside className="dt-native-notice"><Link to="/settings/notifications">Enable private message and connection-request notifications</Link></aside>}
        {page}</main>
      <Footer />
    </div>
  )
}

export default Body
