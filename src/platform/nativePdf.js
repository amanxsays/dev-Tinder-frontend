import { isAndroid, NativePdf } from './platform.js';

export function createNativePdfManager({ native, bridge }) {
  let active = false;
  let listener;
  let revision = 0;
  let currentId = null;
  let currentClosed = null;
  const prefix = globalThis.crypto?.randomUUID?.() || String(Date.now());
  return {
    active: () => active,
    async open(source, { onClose } = {}) {
      if (!native()) return;
      let url;
      try { url = new URL(source.fileUrl); } catch { throw new Error('This resume cannot be opened safely.'); }
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password ||
        (url.port && url.port !== '443') || !url.pathname.includes('/raw/upload/')) throw new Error('This resume cannot be opened safely.');
      const epoch = ++revision;
      const previewId = prefix + ':' + epoch;
      currentId = previewId;
      currentClosed = onClose;
      active = true; // Back/logout must also cancel a preview still waiting on the native bridge.
      try {
        listener ||= bridge.addListener('pdfClosed', event => {
          if (event.previewId === currentId) {
            active = false; currentId = null;
            const closed = currentClosed; currentClosed = null;
            closed?.();
          }
        }).catch(error => { listener = null; throw error; });
        await listener;
        if (epoch !== revision) return;
        await bridge.open({ url: url.href, fileName: source.fileName, documentId: source.documentId, previewId });
        if (epoch === revision && currentId === previewId) active = true;
      } catch (error) {
        if (epoch === revision) { active = false; currentId = null; currentClosed = null; }
        throw error;
      }
    },
    async close() {
      revision++;
      active = false; currentId = null;
      const closed = currentClosed; currentClosed = null;
      closed?.();
      if (native()) await bridge.close();
    },
  };
}
const manager = createNativePdfManager({ native: isAndroid, bridge: NativePdf });
export const nativePdfActive = manager.active;
export const openNativePdf = manager.open;
export const closeNativePdf = manager.close;
