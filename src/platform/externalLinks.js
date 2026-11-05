import { Browser } from '@capacitor/browser';
import { Clipboard } from '@capacitor/clipboard';
import { AppLauncher } from '@capacitor/app-launcher';
import { isAndroid } from './platform.js';

export async function copyText(text) {
  if (isAndroid()) await Clipboard.write({ string: text });
  else await navigator.clipboard.writeText(text);
}
export function installExternalLinks(documentObject = document) {
  if (!isAndroid()) return () => {};
  const open = event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented) return;
    let url;
    try { url = new URL(anchor.href); } catch { return; }
    if (url.origin === window.location.origin && anchor.target !== '_blank') return;
    event.preventDefault();
    if (['https:', 'http:'].includes(url.protocol)) void Browser.open({ url: url.href }).catch(() => {});
    if (url.protocol === 'mailto:') void AppLauncher.openUrl({ url: url.href }).catch(() => {});
    // Never load arbitrary remote content or javascript: into the privileged WebView.
  };
  documentObject.addEventListener('click', open);
  return () => documentObject.removeEventListener('click', open);
}
