# Billbook mobile (Expo / React Native)

Talks to the same backend as the web app - nothing in `backend/` changes for
mobile. Screens: Login, Dashboard, Invoices (list, detail, new), Customers,
Items, Reports.

## 1. Install

```bash
cd mobile
npm install
npx expo install   # re-resolves the native packages below to versions that
                    # match whatever Expo SDK is current when you run this -
                    # the versions in package.json are a starting point, not
                    # guaranteed to stay current
cp .env.example .env
```

Edit `.env`: if you're running on a physical phone or a separate emulator,
`localhost` means the phone/emulator itself, not your computer. Use your
computer's LAN IP instead:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:4000
```

(find yours with `ipconfig getifaddr en0` on Mac, `ipconfig` on Windows,
`hostname -I` on Linux) - and make sure the backend's `CORS_ORIGIN` in
`backend/.env` allows it, or just relax it to `*` for local testing.

## 2. Run on Android - fast path (for development, no build step)

```bash
npx expo start
```

Install **Expo Go** from the Play Store on your Android phone, then scan the
QR code the terminal prints (phone and computer need to be on the same
Wi-Fi). The app reloads live as you edit code. This is how you'll do almost
all day-to-day development and testing - no Android Studio needed.

An emulator works the same way: `npx expo start --android` with Android
Studio's emulator running, or press `a` in the Expo CLI once it's up.

## 3. A real, installable Android app (APK/AAB)

Expo Go is a dev sandbox, not something you hand to someone else. For an
actual installable file:

```bash
npm install -g eas-cli
eas login          # free Expo account
eas build:configure
eas build --platform android --profile preview   # builds an installable .apk
```

This uploads the project and builds it on Expo's servers (their free tier
covers occasional builds) - nothing to install locally, no Android SDK
required. When it finishes, `eas build` gives you a download link for the
`.apk`; put it on the phone and open it (Android will ask you to allow
installs from this source once).

For the Play Store, build an `.aab` instead (`--profile production` in a
typical `eas.json`, which `eas build:configure` sets up for you) and upload
it through the Play Console - that part is entirely outside what I can do
from here.

> I can't run any of this from this sandbox - `eas build` needs your Expo
> account and talks to `expo.dev`/Google's Android build infrastructure,
> neither of which this environment can reach. Everything above runs
> normally from your own machine.

## Sign in

Same backend, same login as the web app - whatever `ADMIN_EMAIL` /
`ADMIN_PASSWORD` you seeded.

## Known differences from web (for now)

- **Reports** is condensed (key stats, low stock, outstanding dues) rather
  than the full per-invoice GST filing table - that table's a
  sit-at-a-desk tool, better suited to the web app.
- **Print/PDF** uses `expo-print` + `expo-sharing` (generates a PDF, opens
  the native share sheet) rather than the browser's print dialog.
- App icon/splash are plain placeholders (`assets/`) - swap them for real
  branding before you ship this to anyone.
