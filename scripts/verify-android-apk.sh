#!/usr/bin/env bash
# Verify bytes built by Gradle AND the prior published APK before an upgrade test.
set -euo pipefail
APK="$1" EXPECTED_NAME="$2" EXPECTED_CODE="$3"
EXPECTED_CERT=$(tr -d '[:space:]:' < android/release-certificate.sha256 | tr '[:upper:]' '[:lower:]')
TOOLS="${ANDROID_HOME:?}/build-tools/$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -1)"
DUMP=$("$TOOLS/apksigner" verify --min-sdk-version 24 --verbose --print-certs "$APK")
printf '%s\n' "$DUMP"
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' <<< "$DUMP"
ACTUAL_CERT=$(sed -n 's/.*certificate SHA-256 digest:[[:space:]]*//p' <<< "$DUMP" | tr -d '\r:' | tr '[:upper:]' '[:lower:]' | sort -u)
[ "$ACTUAL_CERT" = "$EXPECTED_CERT" ] || { echo '::error::Signing certificate changed. Android would reject an in-place update.'; exit 1; }
# Catch unaligned native libraries, including Android 15's 16 KB page-size requirement.
"$TOOLS/zipalign" -c -P 16 4 "$APK"
BADGING=$("$TOOLS/aapt2" dump badging "$APK")
PACKAGE=$(sed -n "s/^package: name='\([^']*\)'.*/\1/p" <<< "$BADGING")
CODE=$(sed -n "s/^package:.*versionCode='\([0-9]*\)'.*/\1/p" <<< "$BADGING")
NAME=$(sed -n "s/^package:.*versionName='\([^']*\)'.*/\1/p" <<< "$BADGING")
[ "$PACKAGE" = 'com.omix.aide' ] && [ "$CODE" = "$EXPECTED_CODE" ] && [ "$NAME" = "$EXPECTED_NAME" ] || {
  echo "::error::Unexpected APK identity: $PACKAGE $NAME ($CODE)"; exit 1;
}
# Newer aapt2 prints minSdkVersion; older build-tools print sdkVersion.
# Accept exactly one numeric declaration, never a missing/ambiguous value.
SDK=$(sed -nE "s/^(minSdkVersion|sdkVersion):'([0-9]+)'.*/\2/p" <<< "$BADGING" | tr -d '\r')
[ "$SDK" = 24 ] || {
  printf '%s\n' "$BADGING"
  echo "::error::APK minimum SDK '${SDK:-missing}' disagrees with the updater manifest contract (24)"
  exit 1
}
if grep -q '^application-debuggable' <<< "$BADGING"; then
  echo '::error::Refusing a debuggable production APK'; exit 1
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  printf 'package=%s\ncert_sha256=%s\n' "$PACKAGE" "$ACTUAL_CERT" >> "$GITHUB_OUTPUT"
fi
printf 'Verified %s %s (%s), certificate %s\n' "$PACKAGE" "$NAME" "$CODE" "$ACTUAL_CERT"
