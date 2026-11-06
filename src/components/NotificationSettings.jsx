import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { isAndroid, NativeNotifications } from '../platform/platform';
import { disableNotifications, enableNotifications, getNotificationState, notificationsOptedIn, setNotificationsOptIn } from '../platform/nativeNotifications';

export default function NotificationSettings() {
  const userId = useSelector(store => store.user?._id);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        let value = await getNotificationState();
        if (!alive) return;
        if (isAndroid() && value.permission === 'granted' && notificationsOptedIn()) {
          await enableNotifications(userId);
          value = await getNotificationState();
        }
        if (alive) setState(value);
      } catch { if (alive) setMessage('Could not check notifications. Please try again.'); }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, [userId]);
  const enabled = state?.permission === 'granted' && Boolean(state?.bindingId) && notificationsOptedIn();
  const blocked = state?.permission === 'denied';
  const change = async enable => {
    setBusy(true); setMessage('');
    setNotificationsOptIn(enable);
    try {
      if (enable && blocked) await NativeNotifications.openSettings();
      else if (enable) await enableNotifications(userId, { requestPermission: true });
      else await disableNotifications({ awaitRemote: false });
    } catch {
      setMessage('Could not update notifications. Please try again.');
    } finally {
      setState(await getNotificationState().catch(() => null));
      setBusy(false);
    }
  };
  return <section className="dt-session-status dt-notification-settings" aria-labelledby="notification-settings-title">
    <h1 id="notification-settings-title">Notifications</h1>
    {isAndroid() ? <>
      <div className="dt-notification-row">
        <FiBell aria-hidden="true" />
        <div><h2>Messages &amp; requests</h2><p>Sender and message previews appear in notifications. Lock-screen visibility follows your Android settings.</p></div>
        {!blocked && <button type="button" className="dt-notification-switch" role="switch" aria-label="Message and connection-request notifications" aria-checked={enabled} disabled={busy || !state} onClick={() => change(!enabled)}><span /></button>}
      </div>
      {blocked && <><p>Notifications are turned off in your phone settings.</p><button type="button" disabled={busy} onClick={() => change(true)}>Open Android settings</button></>}
    </> : <p>Notifications are available in the Android app.</p>}
    <p role="status">{busy ? 'Updating…' : message}</p>
    <Link to="/connections" className="dt-notification-back">Back to connections</Link>
  </section>;
}
