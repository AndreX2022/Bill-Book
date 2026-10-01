# Bill Book

Offline billing app for Android, with the original web, backend and Expo projects included.

## Download and install

[Download BillBook 1.3 APK](downloads/BillBook-1.3.apk?raw=true) · [Android instructions](android-offline/README.md)

Android 8.0+ with an updated Android System WebView. Export a backup before updating,
then install the APK over the existing app. Do not uninstall or clear app data.

## Android features

- Bill of Supply and GST invoices, discounts, totals and sequential numbering
- Customers, products, inventory, payments, invoice history and reports
- Add customers from a selected phone contact, with review before saving
- Share bills as PDF attachments through the Android share sheet
- Edit bills while preserving their number and payments, with stock recalculated
- Delete bills after confirmation; restore stock and remove their payment records
- Bank details appear only after a positive bank-transfer payment is recorded
- Compact UPI QR fitted to each bill, preserving the uploaded image and aspect ratio
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

The 21 core tests, DOM integration and browser layout tests passed. The release
APK was compiled, aligned and signature-verified. Native contact picking, native
PDF generation/attachment access and Android system-bar layout still require a
physical-device check. Browser rendering tests validate the separate HTML print path.

All records remain on the device. Export backups regularly; uninstalling or
clearing storage removes local records. Payments are recorded manually.

## Version 1.3 behavior

Open any active bill and tap **Edit bill** to change the customer, document type, dates, items or notes. The original customer snapshot remains available even if the customer was removed from the customer list. Existing payments stay attached; a bill total below the amount already paid is rejected. Cancelled bills cannot be edited.

**Delete bill** permanently removes its bill and payment records, restores stock only if the bill is active, and updates reports. It does not refund money. Bill numbers are not reused. Export a backup before deleting.

Bank visibility follows recorded payments, not the selected mode on an unpaid bill. Any positive bank-transfer payment, including part of a mixed payment, shows the saved bank details. Cash, UPI, card and unpaid bills omit them from the screen, print/PDF, copy and share outputs.

The supplied sample was used only as a QR layout reference. No sample customer, amounts, branding or QR payload were imported. Upload your original payment QR in Settings.
