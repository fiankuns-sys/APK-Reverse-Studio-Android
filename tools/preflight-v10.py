"""v1.0 direct ChatGPT OAuth guardrails (static checks; NOT an Android SDK build)."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
java = (root/'app/src/main/java/id/reverselab/studio/MainActivity.java').read_text()
js = (root/'app/src/main/assets/studio.js').read_text()
index = (root/'app/src/main/assets/index.html').read_text()
manifest = (root/'app/src/main/AndroidManifest.xml').read_text()
gradle = (root/'app/build.gradle').read_text()
workflow = (root/'.github/workflows/android-device-smoke.yml').read_text()
build_workflow=(root/'.github/workflows/build-android.yml').read_text()
direct_client=(root/'app/src/main/java/id/reverselab/studio/ai/ChatGptDirectClient.java').read_text()
script = (root/'tools/android-device-smoke.sh').read_text()

checks = {
  'Build 16 version code (still v1.0)': 'versionCode 16' in gradle,
  'Android Gradle project': 'compileSdk 35' in gradle,
  'Only local WebView asset': 'file:///android_asset/index.html' in java and 'setAllowUniversalAccessFromFileURLs(false)' in java,
  'Native UI readiness callback': 'onPageFinished(WebView v, String url)' in java and 'UI_READY=' in java,
  'WebView root exists': 'id="app"' in index and 'window.StudioUI=' in js,
  'Receipt binding metadata persisted': 'BUILD_REPORT_BINDING_FILE' in java and 'sourceSelectedAt' in java,
  'Receipt bound when restoring': 'binding.optLong("sourceSelectedAt",-1)!=current.optLong("selectedAt",-2)' in java,
  'Clear project removes receipt and binding': java.count('deleteBuildReport();') >= 3,
  'Reject changed project during receipt import': 'Proyek berubah selama impor receipt' in java,
  'Emulator checks actual UI readiness': 'wait_for_ui portrait' in script and 'wait_for_ui restart' in script,
  'Smoke emulator workflow present': 'tools/android-device-smoke.sh' in workflow,
  'Keyboard not blocked by webview': 'adjustResize' in manifest,
  'Back exits when WebView cannot handle navigation': '!"true".equals(value)' in java and 'final WebView current=view;' in java and 'main.postDelayed(fallback,1500)' in java,
  'Emulator asserts portrait and landscape dimensions': 'verify-orientation.py' in script and (root/'tools/verify-orientation.py').is_file(),
  'Back callback has a one-shot timeout': 'main.postDelayed(fallback,1500)' in java and 'ticket.claim()' in java,
  'Back navigation has concurrency unit tests': (root/'tools/BackNavigationGuardTest.java').is_file(),
  'No debug logging of APK contents': 'UI_READY=' in java and not re.search(r'Log\.[ievwd]\([^;]*\.getString\(',java),
  'Direct OAuth PKCE state and nonce': all(x in direct_client for x in ['code_challenge_method=S256','code_verifier','state=random(32)','nonce=random(32)','verifyIdToken']),
  'Official OAuth over local loopback': '127.0.0.1' in direct_client and 'ServerSocket' in direct_client and 'dynamic_agent_client' in direct_client,
  'No gateway or API key in Android AI bridge': 'AiGatewayClient' not in java and 'sendChatGpt(String json)' in java and 'startChatGptLogin()' in java,
  'Encrypted tokens with Android Keystore': all(x in direct_client for x in ['AndroidKeyStore','AES/GCM/NoPadding','KeyGenParameterSpec']),
  'Explicit user consent and non-stored responses': all(x in direct_client for x in ['consent','put("store",false)','put("stream",true)']),
  'Direct AI policy unit tests': (root/'tools/DirectAuthPolicyTest.java').is_file(),
  'CI preserves Gradle diagnostic log': 'gradle --no-daemon --stacktrace :app:assembleDebug' in build_workflow and 'build-output/gradle.log' in build_workflow,
}
for name, okay in checks.items():
    print(f"{'PASS' if okay else 'FAIL'}: {name}")
if not all(checks.values()):
    sys.exit(1)
print(f'PASS: {len(checks)} static v1.0 direct OAuth checks (not a substitute for Gradle/emulator).')
