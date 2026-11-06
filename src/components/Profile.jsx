import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import api from '../platform/apiClient';
import { BASE_URL } from '../utils/constants';
import { addUser } from '../utils/userSlice';
import { writeDeviceCache } from '../platform/deviceCache';
import ProfileEdit from './ProfileEdit'
import { useSelector } from 'react-redux'

const Profile = () => {
  const user= useSelector(store=> store.user)
  const dispatch = useDispatch();
  const store = useStore();
  const userId = user?._id;
  useEffect(() => {
    if (!userId || !navigator.onLine) return;
    const controller = new AbortController();
    void api.get(BASE_URL + '/profile/view', { signal: controller.signal, timeout: 30000 }).then(response => {
      if (!controller.signal.aborted && response.data?._id === userId) {
        const current = store.getState().user;
        if (current?._id !== userId) return;
        const handles = value => JSON.stringify([value.githubHandle, value.codeforcesHandle, value.leetcodeHandle]);
        if (handles(current) !== handles(response.data)) return;
        const refreshed = { ...current, integrations: { ...current.integrations, ...response.data.integrations } };
        dispatch(addUser(refreshed)); void writeDeviceCache(userId, 'profile', refreshed);
      }
    }).catch(() => {});
    return () => controller.abort();
  }, [userId, dispatch, store]);
  return user && (
    <div className='dt-profile-page flex gap-10 justify-center pt-13'>
      <ProfileEdit user={user}/>
    </div>
  )
}

export default Profile
