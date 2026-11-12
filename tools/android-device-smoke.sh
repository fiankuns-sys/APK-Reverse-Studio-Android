#!/usr/bin/env bash
# Android v1.0 Build 15 smoke: install/launch + real WebView JS readiness, orientation, restart.
# Does not prove APK parsing, 40GB capability, Codex login, or signing correctness.
set -euo pipefail
APK="${1:-app/build/outputs/apk/debug/app-debug.apk}"
PKG='id.reverselab.studio'
OUT='device-smoke-results'
mkdir -p "$OUT"
trap 'adb logcat -d -v time > "$OUT/logcat.txt" 2>/dev/null || true' EXIT
[[ -f "$APK" ]] || { echo "APK missing: $APK" >&2; exit 1; }
adb wait-for-device
adb install -r "$APK" | tee "$OUT/install.txt"
wait_for_ui() {
  local stage="$1" ok=0
  for i in $(seq 1 30); do
    adb shell pidof "$PKG" >/dev/null || { echo "Android process exited ($stage)" >&2; return 1; }
    local lines
    lines="$(adb logcat -d -s APKReverseStudio:I '*:S' 2>/dev/null || true)"
    if grep -q 'UI_READY=true' <<< "$lines"; then ok=1; break; fi
    if grep -q 'UI_READY=false' <<< "$lines"; then
      echo "WebView finished but JavaScript/root UI was not ready ($stage)" >&2
      return 1
    fi
    sleep 1
  done
  if [[ "$ok" -ne 1 ]]; then echo "No WebView UI_READY event ($stage)" >&2; return 1; fi
  echo "PASS: native process and rendered WebView ($stage)" | tee -a "$OUT/ui-ready.txt"
}
adb logcat -c || true
adb shell am force-stop "$PKG"
adb shell settings put system accelerometer_rotation 0 || true
adb shell settings put system user_rotation 0 || true
adb shell am start -W -n "$PKG/.MainActivity" | tee "$OUT/launch-portrait.txt"
wait_for_ui portrait
adb shell screencap -p /sdcard/apkr-portrait.png
adb pull /sdcard/apkr-portrait.png "$OUT/portrait.png" >/dev/null
adb shell settings put system user_rotation 1 || true
sleep 3
adb shell pidof "$PKG" >/dev/null || { echo 'Android process exited on orientation change' >&2; exit 1; }
adb shell screencap -p /sdcard/apkr-landscape.png
adb pull /sdcard/apkr-landscape.png "$OUT/landscape.png" >/dev/null
# Assert actual screenshot dimensions; a force-rotation command is not proof that
# the UI has switched orientations. The PNG IHDR contains big-endian W and H.
python3 tools/verify-orientation.py "$OUT/portrait.png" "$OUT/landscape.png"
adb shell settings put system user_rotation 0 || true
adb shell am force-stop "$PKG"
adb logcat -c || true
adb shell am start -W -n "$PKG/.MainActivity" | tee "$OUT/launch-restart.txt"
wait_for_ui restart
adb logcat -d -v time > "$OUT/logcat.txt"
python3 - "$OUT/logcat.txt" <<'PY'
import pathlib,sys
log=pathlib.Path(sys.argv[1]).read_text(errors='replace')
for crash in log.split('FATAL EXCEPTION:')[1:]:
    if 'Process: id.reverselab.studio' in crash[:3000]:
        sys.exit('FATAL EXCEPTION in APK Reverse Studio; see logcat.txt')
print('PASS: install, WebView ready, portrait/landscape, restart, no app fatal exception.')
PY
