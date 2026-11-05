import { useState } from 'react';

function AvatarImage({ src, name, initials, className }) {
  const [failed, setFailed] = useState(false);
  const style = 'dt-user-avatar ' + className;
  return src && !failed
    ? <img className={style} src={src} alt={name + ' profile'} draggable={false} onError={() => setFailed(true)} />
    : <span className={style + ' dt-avatar-fallback'} role="img" aria-label={name + ' profile'}><span aria-hidden="true">{initials}</span></span>;
}

export default function UserAvatar({ user, className = '' }) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Developer';
  const initials = ((user?.firstName?.trim()?.[0] || 'D') + (user?.lastName?.trim()?.[0] || '')).toUpperCase();
  return <AvatarImage key={user?.photoUrl || 'initials'} src={user?.photoUrl} name={name} initials={initials} className={className} />;
}
