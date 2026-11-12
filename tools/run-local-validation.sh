#!/usr/bin/env bash
# All tests executable without Android SDK. A PASS here is not an Android APK build.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CLASSES="$(mktemp -d)"
trap 'rm -rf "$CLASSES"' EXIT
python3 tools/preflight-v10.py
python3 tools/make-fixtures.py
python3 tools/make-binary-fixtures.py
python3 tools/make-v04-fixtures.py
python3 tools/make-v05-fixtures.py
python3 tools/make-v06-fixtures.py
python3 tools/make-v07-fixtures.py
javac -d "$CLASSES" app/src/main/java/id/reverselab/studio/inspector/*.java \
  tools/InspectorTest.java tools/BinaryInspectorTest.java tools/PackageSetTest.java \
  tools/AdvancedInspectorTest.java tools/DexSymbolInspectorTest.java \
  tools/JadxBundleInspectorTest.java tools/ApktoolBundleInspectorTest.java
for name in InspectorTest BinaryInspectorTest PackageSetTest AdvancedInspectorTest DexSymbolInspectorTest JadxBundleInspectorTest ApktoolBundleInspectorTest; do
  java -cp "$CLASSES" "$name"
done
javac -d "$CLASSES" app/src/main/java/id/reverselab/studio/BackNavigationGuard.java tools/BackNavigationGuardTest.java
java -cp "$CLASSES" BackNavigationGuardTest
javac -d "$CLASSES" app/src/main/java/id/reverselab/studio/ai/DirectAuthPolicy.java tools/DirectAuthPolicyTest.java
java -cp "$CLASSES" DirectAuthPolicyTest
python3 tools/test-apktool-workflow.py
python3 tools/test-build-sign-verify.py
python3 tools/test-jadx-bundle.py
python3 tools/test-verify-orientation.py
node tools/smoke-test.js
node tools/bridge-contract.test.js
node --test tools/jadx-offline.test.mjs
node --check app/src/main/assets/studio.js
bash -n tools/android-device-smoke.sh
echo 'PASS: DIRECT CHATGPT OAUTH SOURCE VALIDATION ONLY; REAL SDK BUILD, OAUTH ACCOUNT, AND EMULATOR ARE NOT TESTED.'
