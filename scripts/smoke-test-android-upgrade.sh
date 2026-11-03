#!/usr/bin/env bash
# Run only against an emulator. This is a CI install test, never application code.
set -euo pipefail
PREVIOUS_APK="$1" NEW_APK="$2" EXPECTED_CODE="$3"
PACKAGE=com.omix.aide
adb logcat -c
if [ -n "$PREVIOUS_APK" ]; then
  adb install "$PREVIOUS_APK"
  adb shell am start -W -n "$PACKAGE/com.omix.aide.MainActivity"
  adb shell am force-stop "$PACKAGE"
  BEFORE_UID=$(adb shell dumpsys package "$PACKAGE" | sed -n 's/.*userId=\([0-9]*\).*/\1/p' | tr -d '\r')
fi
# No uninstall and no -d downgrade bypass: exercise Android's real upgrade rules.
adb install -r "$NEW_APK"
INSTALLED=$(adb shell dumpsys package "$PACKAGE" | sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' | tr -d '\r')
[ "$INSTALLED" = "$EXPECTED_CODE" ] || { echo "Unexpected installed code $INSTALLED"; exit 1; }
if [ -n "$PREVIOUS_APK" ]; then
  AFTER_UID=$(adb shell dumpsys package "$PACKAGE" | sed -n 's/.*userId=\([0-9]*\).*/\1/p' | tr -d '\r')
  [ -n "$BEFORE_UID" ] && [ "$BEFORE_UID" = "$AFTER_UID" ] || { echo 'Upgrade did not retain the package UID'; exit 1; }
fi
adb shell am start -W -n "$PACKAGE/com.omix.aide.MainActivity"
# Wait for the main window without a fixed multi-second sleep.
adb shell am wait-for-broadcast-idle || true
adb logcat -d -s AndroidRuntime:E > android-runtime.txt
if grep -E 'FATAL EXCEPTION|Process: com.omix.aide,' android-runtime.txt; then
  echo 'Production app crashed after installation'; exit 1
fi
adb shell pidof "$PACKAGE"
