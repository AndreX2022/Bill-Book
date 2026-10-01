#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${BILLBOOK_SDK:?Set BILLBOOK_SDK to the Android SDK root}"
: "${BILLBOOK_KEYSTORE:?Set BILLBOOK_KEYSTORE to your release keystore}"
: "${BILLBOOK_KEY_PASSWORD:?Set BILLBOOK_KEY_PASSWORD to the keystore password}"
BT="${BILLBOOK_BUILD_TOOLS:-$BILLBOOK_SDK/build-tools/35.0.0}"
JAR="$BILLBOOK_SDK/platforms/android-35/android.jar"
rm -rf build/classes build/dex
mkdir -p build/classes build/dex
"$BT/aapt" package -f -M AndroidManifest.xml -S res -A assets -I "$JAR" -F build/unsigned.apk
if command -v javac >/dev/null; then
  javac --release 8 -classpath "$JAR" -d build/classes src/in/billbook/app/*.java
else
  java -jar "$BILLBOOK_SDK/ecj.jar" -1.8 -classpath "$JAR" -d build/classes src/in/billbook/app/*.java
fi
(cd build/classes && zip -q -r ../classes.jar .)
"$BT/d8" --lib "$JAR" --min-api 26 --output build/dex build/classes.jar
(cd build/dex && zip -q -u ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --ks "$BILLBOOK_KEYSTORE" --ks-key-alias billbook --ks-pass env:BILLBOOK_KEY_PASSWORD --key-pass env:BILLBOOK_KEY_PASSWORD --out build/BillBook-1.2.apk build/aligned.apk
"$BT/apksigner" verify --verbose build/BillBook-1.2.apk
