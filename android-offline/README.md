# BillBook — offline Android edition 1.2

The installable application is `BillBook-1.2.apk`, package `in.billbook.app`.
Android 8.0 or newer is required, with an updated Android System WebView.
It is a signed release build, not Expo Go and not a renamed ZIP.

This edition is a self-contained Android app built with a native Android
WebView shell and bundled HTML/CSS/JavaScript. It needs no login, server,
Expo account, or internet connection. The original `web/`, `backend/`, and
Expo `mobile/` sources remain in the project as the separate server-based
edition; the APK does not depend on those components.

## Upgrade from version 1.0 or 1.1

Export a backup first, then open the version 1.2 APK and choose Update/Install.
The package and signing key are unchanged, so the update can retain app data.
Do not uninstall the existing app or clear its storage before upgrading. Old records
and version 1 backups migrate automatically; newly added bank/support fields
start blank. Existing bills keep their original customer/business snapshots.

## Install and use

1. Download/open `BillBook-1.2.apk` on your Android phone. If requested,
   enable "Allow from this source" for the app opening the downloaded APK.
2. Open BillBook. In Settings, verify issuer name, phone, email, address,
   state, UPI ID and (if applicable) GSTIN.
3. Add your support email and bank details (bank name, account holder, account
   number, IFSC, optional branch) in Settings. Bank details are saved on new bills
   and included in their PDFs and text summaries. A copy button is available.
   Contact Support opens an email draft; review and send it in your email app.
4. Import your original PNG/JPEG payment QR in Settings. The original QR
   was not supplied in this archive; no replacement has been generated.
5. Add customers and products. On the Customers screen, choose Add from
   contacts to select a phone number. Review the imported name/phone, enter any
   missing details, then Save. No customer is saved until you confirm with Save.
   A duplicate phone-number warning appears if the number already exists. Product stock is checked before billing.
   Custom line items do not affect product stock.
6. Create a Bill of Supply or a GST Tax Invoice. Bill of Supply is the
   default and does not charge GST. GST invoices require a business GSTIN;
   state comparison selects CGST/SGST or IGST. Use identical state names
   consistently (for example, "West Bengal" rather than alternate spellings).
7. Open a bill and choose Share PDF. BillBook creates an A4 PDF attachment
   and opens Android's share sheet. Choose WhatsApp, email or another receiver
   and select the intended recipient in that app. Nothing is sent automatically.
   Save / Print PDF remains available for saving through Android's print screen.
   Share summary shares text only.
8. Record payments on the bill. Overpayments are rejected. Unpaid bills
   may be cancelled, which restores product stock once. Paid or partially
   paid bills cannot be cancelled in this version.
9. Export a backup from Settings regularly. Restore replaces the current
   data after confirmation. Data does not sync to your Replit app or other
   devices. Uninstalling or clearing app storage deletes the local records.

## New in 1.2

- Customer import from the Android phone-number picker, with review before Save
- Direct PDF attachment sharing from each bill via Android's share sheet
- Native A4 PDF generation with pagination, bank details, balances and payment QR
- Private, read-only content URI grants for PDF attachments
- System bar/cutout/keyboard space reserved around the WebView in a parent layout
- Scroll padding and toast position based on the measured navigation height
- No new broad contacts/storage permission or network permission

## Earlier improvements in 1.1

- Compact-phone, landscape and tablet layouts; larger windows use a side rail
- Accessible SVG navigation icons, text zoom, wrapping and keyboard-aware menus
- Automatic QR display sizing in previews and PDFs; larger source images accepted
- Bank/holder/account/IFSC/branch settings, validation, snapshotting and copying
- Configurable Contact Support email draft and help screen; no automatic sending
- Backward-compatible data migration and same-key APK update

## Included features

- Dashboard, customer/product add/edit/delete, inventory and low-stock alerts
- Sequential bill numbers, quantity/rate/discount, HSN, GST, rupee round-off
- Invoice history and search; unpaid, partial, paid, overdue, cancelled status
- Payment history; sale, collection, outstanding and GST reports
- Original business/customer/QR snapshots on each bill
- Multi-page A4 invoice printing and Android Save as PDF
- Original QR bytes preserved as a data URI, with automatic display sizing
- Native file pickers and JSON backup export/restore
- Escaped invoice content; atomic IndexedDB saves; no network permission

QR uploads accept PNG/JPEG up to 8 MB and 20,000 pixels on either side.
The original bytes are stored unchanged, while display dimensions automatically
fit the screen and a 180 × 180-pixel bounding box in PDFs, preserving aspect ratio.
Existing bills retain their original QR image and also use adaptive display sizing.
The default issuer and UPI details are editable; email/address/GSTIN are left
blank for you to supply. Bill layout is a new clean A4 layout, rather than an
exact reproduction of any unavailable original bill template.

## Native PDF sharing implementation

Share PDF uses `BillPdf.java` and Android's `PdfDocument` on a worker thread.
It renders the selected saved bill snapshot, not the current business settings.
The resulting cache file is exposed through `PdfProvider` with a temporary
read grant attached to the share intent and ClipData. The provider accepts only
PDF filenames under its private shared-bills cache folder and disallows writes.
Cached attachments older than seven days are cleaned up when the app starts.

Contacts use ACTION_PICK with Phone.CONTENT_TYPE and read only the selected
row returned by the picker. Cancellation leaves the customer list unchanged.

Platform reference: https://developer.android.com/guide/components/intents-common
File sharing reference: https://developer.android.com/training/secure-file-sharing

## Build again

Install Android SDK platform 35 and build tools 35.0.0, plus a Java JDK.
No Gradle, React Native build, or third-party Android runtime is needed.

```bash
export BILLBOOK_SDK=/absolute/path/to/android-sdk
export BILLBOOK_KEYSTORE=/absolute/path/to/billbook-release.jks
export BILLBOOK_KEY_PASSWORD='your-keystore-password'
./build.sh
```

The keystore alias is `billbook`. Set `BILLBOOK_BUILD_TOOLS` if your SDK's
build-tools path differs. If only a JRE is available, place Eclipse ECJ
3.33.0 at `$BILLBOOK_SDK/ecj.jar`; the build script uses it automatically.
The companion private signing archive retains the signing key/password for
future app updates. Version 1.2 reuses the version 1.0 signing key. Keep that archive private and preserve the same signing
key/package to install updates without removing the original app. Increment
`android:versionCode` and `android:versionName` for later releases.

## Verification

- `node tests/core.test.cjs`: 16 passing tests covering tax, discount,
  invalid values, numbering, snapshots, stock, payments, cancellation,
  fractional stock precision, backup migration, QR fitting and bank/support validation.
- `tests/dom.test.cjs`: passing UI/IndexedDB integration with jsdom 26 and
  fake-indexeddb 6; forms, restart persistence, QR byte identity, automatic sizing, bank snapshots, email draft privacy, keyboard layout,
  escaped invoice HTML, Android print/PDF-share handoff, selected-contact review/save, cancellation and backup restore.
- APK compiled against Android API 35; zip alignment and v2/v3 signatures
  verified; min SDK 26 and launcher activity confirmed.
- `tests/ui.test.cjs`: passed in Chrome Headless Shell. Exercises the real
  customer/product forms, payments, restart persistence, PDF output, cancellation,
  inventory, reports, contact-import review/save and PDF-share payload. Nine screens checked for horizontal overflow at 280,
  320, 393, 780, 1024 and 1440 pixels; bottom-of-screen navigation clearance also
  tested at 280, 393 and 1024 pixels. Layout screenshots and HTML-print PDF inspected.
- The APK has not been installed on a physical Android device or emulator
  here. Native contact picking, native PDF generation/recipient attachment access,
  keyboard/system-bar layout and installation still need a first-run phone check.
  Browser PDF rendering validates the separate HTML print path, not the native
  PdfDocument attachment generator.

Run DOM tests after installing local test dependencies:

```bash
npm install --no-save jsdom@26 fake-indexeddb@6
node tests/dom.test.cjs
```
