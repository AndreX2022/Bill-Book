# Bill Book

Offline billing app for Android, with the original web, backend and Expo projects included.

## Download and install

[Download BillBook 1.2 APK](downloads/BillBook-1.2.apk?raw=true) · [Android instructions](android-offline/README.md)

Android 8.0+ with an updated Android System WebView. Export a backup before updating,
then install the APK over the existing app. Do not uninstall or clear app data.

## Android features

- Bill of Supply and GST invoices, discounts, totals and sequential numbering
- Customers, products, inventory, payments, invoice history and reports
- Add customers from a selected phone contact, with review before saving
- Share bills as PDF attachments through the Android share sheet
- Bank details and UPI QR on bills; automatic QR display sizing
- Responsive phone/tablet layouts and system-bar/keyboard spacing
- Configurable support email drafts, help, local storage and JSON backups

## Source

| Directory | Purpose |
| --- | --- |
| `android-offline/` | Standalone Android APK source, build script and tests |
| `downloads/` | Signed Android APK |
| `web/` | Original Next.js interface, requires backend |
| `backend/` | Original Express/Prisma API |
| `mobile/` | Original Expo client, requires backend |

The offline APK does not require a server or an Expo account. The original
server-based projects are documented in [SERVER_EDITION.md](SERVER_EDITION.md).
They were not validated as part of the standalone Android build.

## Build and test

See [android-offline/README.md](android-offline/README.md) for SDK and signing setup.
Private signing keys and passwords are deliberately excluded from this repository.
Use the original private signing archive to build compatible updates.

```bash
node android-offline/tests/core.test.cjs
npm install --prefix .qa --no-save jsdom@26 fake-indexeddb@6
NODE_PATH="$PWD/.qa/node_modules" node android-offline/tests/dom.test.cjs
```

The 16 core tests, DOM integration and browser layout tests passed. The release
APK was compiled, aligned and signature-verified. Native contact picking, native
PDF generation/attachment access and Android system-bar layout still require a
physical-device check. Browser rendering tests validate the separate HTML print path.

All records remain on the device. Export backups regularly; uninstalling or
clearing storage removes local records. Payments are recorded manually.
