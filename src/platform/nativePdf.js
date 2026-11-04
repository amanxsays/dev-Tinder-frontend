import { isAndroid, NativePdf } from './platform.js';

let active = false;
let listener = null;
export const nativePdfActive = () => active;
export async function openNativePdf(source) {
  if (!isAndroid()) return;
  const url = new URL(source.fileUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') throw new Error('This resume cannot be opened safely.');
  active = true;
  try {
    if (!listener) listener = await NativePdf.addListener('pdfClosed', () => { active = false; });
    await NativePdf.open({ url: url.href, fileName: source.fileName, documentId: source.documentId });
  }
  catch (error) { active = false; throw error; }
}
export async function closeNativePdf() {
  active = false;
  if (isAndroid()) await NativePdf.close();
}
