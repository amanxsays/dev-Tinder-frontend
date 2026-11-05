import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { toast } from 'react-toastify';
import { isAndroid, NativeNotifications } from '../platform/platform';
import { session } from '../platform/session';
import { installExternalLinks } from '../platform/externalLinks';
import { closeNativePdf, nativePdfActive } from '../platform/nativePdf';
import { onboardNotifications, notificationDestination, rotateNotificationToken, retryNotificationCleanup } from '../platform/nativeNotifications';
import { forgetSession } from '../utils/sessionHint';
import { removeUser } from '../utils/userSlice';
import { removeFeed } from '../utils/feedSlice';
import { removeConnections } from '../utils/connectionsSlice';
import { removeAllRequests } from '../utils/requestsSlice';
import { useChatExperience } from '../contexts/ChatExperienceContext';
import '../styles/android.css';

export default function AndroidLifecycle() {
  const accountId = useSelector(store => store.user?._id);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { runtime, aiOpen, closeAi } = useChatExperience();
  const [pending, setPending] = useState(null);
  const state = useRef({ accountId, location, aiOpen, closeAi, runtime });
  state.current = { accountId, location, aiOpen, closeAi, runtime };

  useEffect(() => {
    if (!isAndroid()) return;
    document.documentElement.classList.add('dt-android');
    const releaseLinks = installExternalLinks();
    let disposed = false;
    const handles = [];
    const listen = promise => void promise.then(handle => { if (disposed) void handle.remove(); else handles.push(handle); }).catch(() => {});
    const consume = async () => {
      const tap = await NativeNotifications.consumePendingTap();
      if (!disposed && tap?.eventId) setPending(tap);
    };
    listen(NativeNotifications.addListener('notificationTap', tap => { if (!disposed) setPending(tap); }));
    listen(NativeNotifications.addListener('tokenChanged', event => { void rotateNotificationToken(event.token).catch(() => {}); }));
    listen(App.addListener('appStateChange', ({ isActive }) => {
      const current = state.current;
      const authenticated = Boolean(current.accountId && session.token());
      const targetUserId = authenticated ? current.location.pathname.match(/^\/chat\/([a-f0-9]{24})$/i)?.[1] : '';
      void NativeNotifications.setContext({ active: isActive, targetUserId: targetUserId || '' }).catch(() => {});
      if (!isActive) { current.runtime.interrupt(); void closeNativePdf().catch(() => {}); }
      else {
        if (current.accountId && !authenticated) window.dispatchEvent(new Event('devtinder:session-expired'));
        window.dispatchEvent(new Event('focus'));
        void consume().catch(() => {});
        void retryNotificationCleanup().catch(() => {});
      }
    }));
    listen(App.addListener('backButton', () => {
      const current = state.current;
      if (nativePdfActive()) { void closeNativePdf(); return; }
      if (current.aiOpen) { current.closeAi(); return; }
      if (current.location.pathname === '/chat/ai-agent') { navigate('/connections', { replace: true }); return; }
      if (current.location.pathname !== '/' && current.location.pathname !== '/login') {
        if (Number(window.history.state?.idx) > 0) navigate(-1);
        else navigate('/', { replace: true });
      } else void App.minimizeApp();
    }));
    const expired = () => {
      if (!state.current.accountId) return;
      // Keep the independently opted-in generic notification binding after JWT expiry.
      state.current.runtime.interrupt();
      void closeNativePdf().catch(() => {});
      void session.clear().catch(() => {});
      forgetSession();
      dispatch(removeUser()); dispatch(removeFeed()); dispatch(removeConnections()); dispatch(removeAllRequests());
      navigate('/login', { replace: true });
    };
    window.addEventListener('devtinder:session-expired', expired);
    const online = () => { void retryNotificationCleanup().catch(() => {}); };
    window.addEventListener('online', online);
    online();
    void consume().catch(() => {});
    return () => {
      disposed = true;
      handles.forEach(handle => void handle.remove());
      releaseLinks();
      window.removeEventListener('devtinder:session-expired', expired);
      window.removeEventListener('online', online);
    };
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!isAndroid()) return;
    const targetUserId = accountId && session.token() ? location.pathname.match(/^\/chat\/([a-f0-9]{24})$/i)?.[1] || '' : '';
    void NativeNotifications.setContext({ active: !document.hidden, targetUserId }).catch(() => {});
    if (accountId) void onboardNotifications(accountId).catch(() => {});
    if (!accountId) return;
    const remaining = Date.parse(session.snapshot()?.expiresAt) - Date.now();
    const timer = setTimeout(() => window.dispatchEvent(new Event('devtinder:session-expired')), Math.max(0, remaining || 0));
    return () => clearTimeout(timer);
  }, [accountId, location.pathname]);

  useEffect(() => {
    if (!isAndroid() || !pending) return;
    let disposed = false;
    void NativeNotifications.getState().then(binding => {
      if (disposed) return;
      if (!accountId || !session.token()) {
        if (accountId) window.dispatchEvent(new Event('devtinder:session-expired'));
        navigate('/login', { replace: true }); return;
      }
      const destination = notificationDestination(pending, binding, accountId);
      setPending(null);
      if (destination) navigate(destination);
      else toast.info('This notification is no longer available for this account.');
    }).catch(() => { if (!disposed) setPending(null); });
    return () => { disposed = true; };
  }, [pending, accountId, navigate]);
  return null;
}
