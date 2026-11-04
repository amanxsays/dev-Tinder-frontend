import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { isAndroid } from '../platform/platform';
import { disableNotifications, enableNotifications, getNotificationState, setNotificationsOptIn } from '../platform/nativeNotifications';

export default function NotificationSettings() {
  const userId = useSelector(store => store.user?._id);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let alive = true; void getNotificationState().then(value => { if (alive) setState(value); }).catch(() => { if (alive) setMessage('Notification setup is unavailable in this build.'); }); return () => { alive = false; }; }, []);
  const change = async enabled => {
    setBusy(true); setMessage('');
    setNotificationsOptIn(enabled);
    try {
      if (enabled) await enableNotifications(userId, { requestPermission: true });
      else await disableNotifications();
      setMessage(enabled ? 'Notifications enabled. Message content stays private.' : 'Notifications disabled.');
    } catch (error) { setMessage(error.message || 'Could not update notification registration. Try again.'); }
    finally { setState(await getNotificationState().catch(() => null)); setBusy(false); }
  };
  return <section className="dt-session-status" aria-labelledby="notification-settings-title">
    <h1 id="notification-settings-title">Notifications</h1>
    <p>Get private alerts for new messages and connection requests. Alerts do not include names or message text.</p>
    {isAndroid() ? <>
      <p>Android permission: {state?.permission || 'checking'}</p>
      <p>{state?.bindingId ? 'This phone is registered.' : 'This phone is not registered.'}</p>
      <div><button type="button" disabled={busy} onClick={() => change(true)}>Enable notifications</button>
        <button type="button" disabled={busy} onClick={() => change(false)}>Disable notifications</button></div>
      <p>Permission can also be managed in Android Settings → Apps → DevTinder → Notifications. Server startup and battery restrictions can delay alerts.</p>
    </> : <p>Phone notifications are available in the DevTinder Android application.</p>}
    <p role="status">{busy ? 'Updating notifications…' : message}</p>
    <Link to="/connections">Back to connections</Link>
  </section>;
}
