# Android build (Capacitor)

This folder contains a Capacitor shell around the Vite React app. The native project lives in `android/`.

## Prerequisites

- Node.js and npm (run commands from this `app/` directory).
- Android Studio with Android SDK and a device or emulator.
- A JDK (17+). Android Studio bundles one; point Gradle at it or set `JAVA_HOME` before running `gradlew` from the command line.

## Verify the Android project

From `app/android/`, run `gradlew.bat assembleDebug` (Windows) or `./gradlew assembleDebug` (macOS/Linux) to compile a debug APK when `JAVA_HOME` is set. Opening `android/` in Android Studio and running the **app** configuration is the most straightforward option.

## Environment variables (release builds)

Supabase settings are read at **build time** by Vite, not at runtime on the device.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (or your CI secrets) **before** running `npm run build` or `npm run cap:sync`. The compiled JavaScript inside the APK will contain whatever values were present when the web bundle was produced.

If these are missing, the app runs in local demo mode (same as the web app).

## Commands

- `npm run cap:sync` — production build plus `cap sync` (updates `android/app/src/main/assets/public`).
- `npm run cap:open:android` — opens the project in Android Studio.
- `npm run cap:run:android` — build and deploy to a connected device (requires Android toolchain).

After changing only web code, `npm run cap:sync` is enough. After adding Capacitor plugins or changing `capacitor.config.ts`, run `cap sync` again.

## Smoke test on device

With Supabase configured: sign in, open **Job Cards**, filter/search, tap a card to open **Job Modal**, use Details / GPS / Photos / Signature tabs, **Save**, then use the Android **Back** key to close overlays before exiting the app.
