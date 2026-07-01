# NASEC ERP — Mobile App Build Guide

The NASEC ERP web build is wrapped with **Capacitor**, which turns the same React/Vite app into a fully native iOS + Android application. The mobile build adds native superpowers the browser can't do:

- **Auto-geofence attendance.** The phone's OS-level geofencing API wakes the app to fire a punch when an employee enters or leaves a project site — even when the app is closed.
- **Background tracking.** Always-Allow location keeps the punches accurate even when the app is in the background.
- **Push notifications.** Approvals, SLA breaches, doc expiries can ping the user directly.
- **Biometric login** (Face ID / Touch ID) — wireable in a follow-up iteration.
- **Camera with EXIF** — site engineers attach geo-tagged photos to inspection requests.

## What ships with the source

- `capacitor.config.ts` — appId `ae.nasec.erp`, appName "NASEC ERP", web build pointer.
- `package.json` — Capacitor packages added: `@capacitor/core`, `/cli`, `/ios`, `/android`, `/geolocation`, `/preferences`, `/status-bar`, `/splash-screen`, `/haptics`, `/push-notifications`, and `@capacitor-community/background-geolocation`.
- `client/src/lib/native/platform.ts` — `isNative()` and `nativePlatform()` helpers.
- `client/src/lib/native/geofence-service.ts` — the auto-geofence service. Idle on web, active on native.
- `client/src/components/mobile/MobileShell.tsx` — bottom-tab navigator that replaces the desktop sidebar on phones.
- `client/src/pages/MobileSiteHome.tsx` — site-engineer mobile home: presence banner, hours stats, tasks, RFIs.

## Prerequisites (one-time per workstation)

- **Node 20+** and **pnpm** — same as for the web build.
- **For iOS:**
  - A **Mac**. iOS apps can only be built on macOS.
  - **Xcode 15+** (free from the Mac App Store).
  - An **Apple Developer account** ($99/yr) to install on a real device or ship to the App Store. Personal-team certs work for installing on your own devices for testing.
- **For Android:**
  - **Android Studio** (Windows / Mac / Linux).
  - **JDK 17** (Android Studio installs this).
  - A **Google Play Console** account ($25 one-time) to publish to the Play Store. Free to install on connected devices for testing.

## First-time setup

From the project root (`C:\Users\info\Desktop\ERP\NASEC ERP\aec-erp` on your machine):

```bash
# 1. Install all dependencies including the Capacitor packages
pnpm install

# 2. Build the web bundle
pnpm build

# 3. Add the native platforms (only the first time)
npx cap add ios       # creates an ios/ folder
npx cap add android   # creates an android/ folder

# 4. Sync the latest web build into both native shells
npx cap sync
```

After this, the `ios/` and `android/` folders are real Xcode and Android Studio projects you can open natively.

## iOS — build & install

```bash
npx cap open ios
```

In Xcode:
1. Select **NASEC ERP** at the top, then the **Signing & Capabilities** tab.
2. Pick your **Team** (Personal or Developer).
3. Plug a real iPhone in via USB (Lightning or USB-C). The first time, also trust the computer on the phone.
4. Pick the iPhone as the run target (top toolbar, next to the play button).
5. Click **Run** (▶︎). Xcode builds, signs, and installs the app onto the phone.
6. On the phone: Settings → General → VPN & Device Management → trust your developer profile. Open NASEC ERP.

For the **App Store** release: Product → Archive → Distribute App → App Store Connect.

## Android — build & install

```bash
npx cap open android
```

In Android Studio:
1. Connect a phone via USB with **USB debugging enabled** (Developer Options).
2. Pick the phone in the device dropdown.
3. Click **Run ▶︎**. The app installs.

For the **Play Store** release: Build → Generate Signed Bundle / APK → Android App Bundle → Upload to Play Console.

## Permissions to enable on first launch

On both iOS and Android, the OS prompts for **Location · Always Allow**. This is required for auto-geofence punches when the app is closed. The Mobile Site home includes an in-app banner that asks for this if it isn't granted yet.

On iOS you must add usage descriptions to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>NASEC ERP uses your location to register your presence on construction sites.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>NASEC ERP uses your location in the background to auto-record site arrivals and departures, even when the app is closed.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>NASEC ERP uses your location in the background to auto-record site arrivals and departures.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>processing</string>
</array>
```

On Android edit `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Both Capacitor sample manifests are pre-populated when `npx cap add` runs — you only need to verify the keys are present.

## Re-deploy after a code change

After any change to the React source:

```bash
pnpm cap:sync    # = pnpm build && npx cap sync
```

Then re-launch from Xcode / Android Studio (or just install the rebuilt APK on Android via `adb install`).

## App icon & splash

Place a 1024×1024 PNG of the NASEC logo at `resources/icon.png` and a 2732×2732 PNG (a centred logo on black) at `resources/splash.png`. Then:

```bash
pnpm add -D @capacitor/assets
npx capacitor-assets generate
npx cap sync
```

`@capacitor/assets` regenerates every iOS and Android icon size + splash from those two source files in one command.

## Multi-user backend requirement

The auto-geofence punches are only useful if HR + PM can see them from elsewhere. That requires the **Supabase backend** (already wired in v8). With localStorage every device has its own private data. So before you roll the mobile app out to staff:

1. Connect the ERP to Supabase via Settings → Backend (see `supabase/BACKEND-SETUP.md`).
2. The same `nasec_kv` table receives both web AND mobile writes via Capacitor's HTTPS calls.
3. Realtime sync → every punch from a phone shows up on the HR Manager's dashboard within seconds.

## App Store / Play Store metadata

For submission you'll need:
- App icon (1024×1024)
- Privacy policy URL (mandatory for both stores — Capacitor apps with background location must disclose this)
- App description, screenshots (10 max each), category (Business)
- Content rating questionnaire
- Apple App Store listing language → English (UAE) + Arabic; Play Store likewise

## Troubleshooting

- **App opens to a white screen.** `dist/public/` is empty. Run `pnpm build` first, then `npx cap sync`.
- **Background tracking doesn't fire.** Check Settings → NASEC ERP → Location → Always (iOS) / Allow all the time (Android). The plugin needs Always-Allow specifically; "While Using" is not enough.
- **Build fails on Xcode with code signing error.** Tap "Sign in" in Xcode → Settings → Accounts, add your Apple ID, then re-select Team in Signing.
- **APK install blocked on Android.** Enable "Install from unknown sources" for your file manager, or push via `adb install -r app-debug.apk`.

## Next iteration candidates (mobile-only polish)

- Biometric login (Face ID / Touch ID) — `@capacitor/biometric` (3rd party).
- Camera capture for site photos that automatically attach to a Document record.
- Push notifications for approvals + SLA breaches (Firebase Cloud Messaging via `@capacitor/push-notifications`).
- Offline-first sync — already 90% there because reads are local; needs a write-queue layer when offline.
- Apple Watch companion for site engineers to glance at hours / approvals.
