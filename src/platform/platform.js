import { Capacitor, registerPlugin } from '@capacitor/core';

export const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const NativeSession = registerPlugin('DevTinderSession');
export const NativeSpeech = registerPlugin('DevTinderSpeech');
export const NativeNotifications = registerPlugin('DevTinderNotifications');
export const NativePdf = registerPlugin('DevTinderPdf');

export const NativeDeviceData = registerPlugin('DevTinderDeviceData');
