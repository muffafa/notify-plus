#!/usr/bin/env sh
# Build, install, and launch the debug app on a connected Android device.
#
# Why this exists: the launcher-icon color variants flip <activity-alias> enabled states at runtime
# (selecting a color disables the manifest-default ".IconOrange" and enables another). The stock
# `react-native run-android --main-activity .IconOrange` then fails with
# "Activity class {com.notifyplus/.IconOrange} does not exist" after switching colors. We instead
# launch whichever launcher alias is actually enabled, so it works for any selected color.
set -e

PKG=com.notifyplus
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Resolve adb (PATH first, then common SDK locations).
ADB="adb"
command -v adb >/dev/null 2>&1 || \
  ADB="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}/platform-tools/adb"

# 1) Build + install the debug APK. Real build failures surface here (set -e).
( cd "$ROOT/android" && ./gradlew installDebug )

# 2) Start Metro in the background if the packager port isn't already answering (debug JS needs it).
if ! curl -sf http://localhost:8081/status >/dev/null 2>&1; then
  echo "Starting Metro in the background (logs: /tmp/notifyplus-metro.log)…"
  ( cd "$ROOT" && nohup "$ROOT/node_modules/.bin/react-native" start >/tmp/notifyplus-metro.log 2>&1 & )
fi

# 3) Launch whichever launcher-icon alias is currently enabled (regardless of selected color).
"$ADB" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
echo "✓ Launched $PKG"
