import { useEffect, useRef, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { FiCamera } from 'react-icons/fi';
import { toast } from 'react-toastify';
import uploadClient from 'axios';
import api from '../platform/apiClient';
import { BASE_URL } from '../utils/constants';
import { addUser } from '../utils/userSlice';
export default function ProfilePhotoUpload({ photoUrl, onUploaded, onBusy }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const dispatch = useDispatch();
  const store = useStore();
  const active = useRef(true);
  const controller = useRef(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      toast.error('Choose a JPG, PNG or WebP image under 5 MB.'); event.target.value = ''; return;
    }
    setBusy(true); onBusy?.(true);
    const owner = store.getState().user?._id;
    controller.current = new AbortController();
    try {
      const { data: signed } = await api.get(BASE_URL + '/profile/photo/upload-signature', { timeout: 30000, signal: controller.current.signal });
      const data = new FormData(); data.append('file', file); data.append('api_key', signed.apiKey); data.append('signature', signed.signature);
      Object.entries(signed.params).forEach(([key, value]) => data.append(key, String(value)));
      const result = await uploadClient.post(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, data, { timeout: 90000, signal: controller.current.signal });
      const response = await api.patch(BASE_URL + '/profile/photo', { publicId: result.data.public_id, version: result.data.version,
        signature: result.data.signature, format: result.data.format }, { timeout: 30000, signal: controller.current.signal });
      if (!active.current || owner !== store.getState().user?._id) return;
      onUploaded(response.data.data.photoUrl); dispatch(addUser(response.data.data)); toast.success('Profile photo updated.');
    } catch { if (!active.current || owner !== store.getState().user?._id) return; toast.error('Could not upload your photo. Your previous photo is unchanged.'); }
    finally { setBusy(false); if (active.current) onBusy?.(false); if (input.current) input.current.value = ''; }
  };
  return <fieldset className="fieldset dt-photo-upload"><legend>Profile photo</legend>
    <div>{photoUrl && <img src={photoUrl} alt="Current profile" />}<button type="button" disabled={busy} onClick={() => input.current?.click()}><FiCamera />{busy ? 'Uploading...' : photoUrl ? 'Change photo' : 'Add photo'}</button></div>
    <input type="file" ref={input} accept="image/jpeg,image/png,image/webp" hidden onChange={upload} disabled={busy} aria-label="Choose profile photo" />
    <p>JPG, PNG or WebP - Up to 5 MB</p>
  </fieldset>;
}
