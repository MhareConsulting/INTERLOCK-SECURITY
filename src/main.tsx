import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import './index.css';
import App from './App.tsx';

// PWA service worker only in the browser. On Capacitor, an SW often intercepts
// requests incorrectly and Supabase login fails with "Failed to fetch".
if (!Capacitor.isNativePlatform()) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#14171c' });
  } catch {
    // Status bar APIs can fail on some WebView builds
  }
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    // Optional
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  try {
    await SplashScreen.hide();
  } catch {
    // Splash may already be hidden
  }
}

void initNativeShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
