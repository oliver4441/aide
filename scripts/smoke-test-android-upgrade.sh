#!/usr/bin/env bash
# Emulator-only compatibility test. No installation shell commands exist in the app.
set -euo pipefail
PREVIOUS_APK="$1" NEW_APK="$2" EXPECTED_CODE="$3"
PACKAGE=com.omix.aide
# Preserve evidence even when installation, UI-idle detection or a process check fails.
trap 'echo "::error::Android compatibility test failed at line $LINENO: $BASH_COMMAND"' ERR
trap 'adb logcat -d -s AndroidRuntime:E > android-runtime.txt || true' EXIT
adb root
adb wait-for-device
adb logcat -c
MARKER="/data/user/0/$PACKAGE/.aide-upgrade-marker"
if [ -n "$PREVIOUS_APK" ]; then
  adb install "$PREVIOUS_APK"
  # v1.0.12 may crash here. Its startup failure must not be attributed to the
  # replacement APK, but the old package/data must still be upgraded in place.
  if ! adb shell am start -W -n "$PACKAGE/com.omix.aide.MainActivity"; then
    echo '::notice::Previous production APK could not launch; continuing to verify its repair by an in-place upgrade.'
  fi
  adb shell am force-stop "$PACKAGE"
  adb logcat -d -s AndroidRuntime:E > android-previous-runtime.txt
  adb shell "printf aide-retain-local-data > '$MARKER'"
  BEFORE_UID=$(adb shell dumpsys package "$PACKAGE" | sed -nE 's/^[[:space:]]*(userId|appId)=([0-9]+).*/\2/p' | tr -d '\r')
fi
# No uninstall and no -d downgrade bypass: exercise Android's actual upgrade rules.
adb install -r "$NEW_APK"
INSTALLED=$(adb shell dumpsys package "$PACKAGE" | sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' | tr -d '\r')
[ "$INSTALLED" = "$EXPECTED_CODE" ] || { echo "Unexpected installed code $INSTALLED"; exit 1; }
if [ -n "$PREVIOUS_APK" ]; then
  AFTER_UID=$(adb shell dumpsys package "$PACKAGE" | sed -nE 's/^[[:space:]]*(userId|appId)=([0-9]+).*/\2/p' | tr -d '\r')
  [ -n "$BEFORE_UID" ] && [ "$BEFORE_UID" = "$AFTER_UID" ] || { echo 'Upgrade did not retain the package UID'; exit 1; }
  [ "$(adb shell cat "$MARKER" | tr -d '\r')" = aide-retain-local-data ] || { echo 'Upgrade lost the app-private data marker'; exit 1; }
fi
# Discard ONLY the old app's crash log. Capture all launches of the NEW app below.
adb logcat -c
for launch in 1 2; do
  adb shell am start -W -n "$PACKAGE/com.omix.aide.MainActivity"
  adb shell uiautomator dump /sdcard/aide-upgrade-window.xml
  adb logcat -d -s AndroidRuntime:E > android-runtime.txt
  if grep -E 'FATAL EXCEPTION|Process: com.omix.aide,' android-runtime.txt; then
    echo '::error::Production app crashed after installation'; exit 1
  fi
  adb shell pidof "$PACKAGE"
  if [ "$launch" = 1 ]; then adb shell am force-stop "$PACKAGE"; fi
 done
