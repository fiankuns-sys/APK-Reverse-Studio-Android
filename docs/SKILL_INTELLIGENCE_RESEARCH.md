# Skill Intelligence Engine — Research and architecture (v1.0 Build 17)

## Intended result
A modular, local-first expert analysis layer for **authorized APK review**, software debugging, and offline modding of applications or games that the user owns or has permission to modify.

**Current implementation:** a deterministic classifier, 13 expert profiles, evidence display, per-skill prompt generation, and explicit user review before AI submission. These profiles are not autonomous agents, do not execute source code, and are **not automatically installed as OpenAI hosted Skills**.

## Evidence pipeline

1. User selects input through the Android document picker.
2. APK inspector reads ZIP/ZIP64 index without unpacking a potentially massive archive.
3. Existing parsers extract bounded Manifest/DEX/ELF/resource/CRC/signing-structure metadata.
4. `SkillIntelligence.evaluate(report)` matches **observed file paths** and parser summaries to 13 domains.
5. UI shows the exact evidence and distinguishable status: `belum-dianalisis`, `bukti-terbatas`, `indikasi`, `ada-bukti`.
6. User selects a skill; the application drafts a specialized audit question.
7. Existing AI Analyst lets the user choose metadata categories and displays the **full outgoing context** before consent.
8. The authorized ChatGPT connection receives the bounded prompt and selected metadata. Local history stays on device.

## Profiles and limitations

| Skill | Signals used | What it cannot infer from signals alone |
|---|---|---|
| Android Engineering | Manifest, DEX, resources | Runtime behavior or permission abuse |
| Programming Engineering | DEX, build files | Full call graph, correctness |
| Java & Kotlin Engineering | DEX, Kotlin metadata | Original implementation language from DEX alone |
| Python Engineering | Embedded .py, pyproject, requirements or libpython | Python use without explicit evidence |
| C/C++ Native | ELF / JNI / .so | Original native source code |
| JavaScript/WebView | JS/HTML/CSS assets | Presence of JS bridge without source evidence |
| Reverse Engineering | Manifest, DEX, Smali, resources | Lossless decompilation |
| Game Engineering | Unity / Unreal / Godot / Cocos indicators | Game engine with certainty from a generic archive |
| Game Modding | Owned/authorized offline asset review | Compatibility without a real test build |
| Game Mechanics & Integrity | Game technology indicators, approved code review | Live cheats, anti-cheat bypass, online manipulation |
| Integrity & Security | Signature structure, CRC samples | Authenticity without cryptographic verification |
| Build & Signing | Manifest/resources/DEX | Installability without real build, signing, device test |
| QA & Debugging | Package metadata plus test artifacts | Device test success from static metadata |

A file named `libunity.so` suggests a game technology but is not proof of engine version. A `.so` file is compiled native code, not equivalent to recoverable C/C++ source. A `classes.dex` file is bytecode, not proof the original source was Java or Kotlin.

## Reliability principles

- **No false certainty:** match outcomes are categories, not invented numeric probability scores.
- **Provenance:** render `label`, `path`, and evidence type for each triggered rule; raw names are HTML-escaped.
- **Independent validation:** AI explanations never replace parsing, test logs or code review.
- **Data minimization:** skill id and methodology may be included in outgoing context; detailed file metadata remains controlled through the existing consent categories.
- **Prompt-injection resistance:** filename, source and metadata are untrusted input; never execute instructions embedded in these fields.
- **No automatic network upload:** selecting a skill only changes the chosen prompt. The AI submit flow still requires preview and explicit consent.
- **No remote code execution:** the engine runs JavaScript classifiers over existing metadata, not uploaded APK code.

## Large-input handling (0–40 GB target)

The size target describes an **input acceptance policy**, not proof that every 40 GB archive can be processed or rebuilt on a phone. File metadata lists are capped for UI responsiveness. Additional engineering requires long-offset streaming, bounded decompression, memory-pressure tests, ZIP bomb defenses, pause/cancel/resume, and filesystem space preflight. No 40 GB end-to-end test has been completed.

## Security and permissions

For authorized software inspection only. No anti-cheat bypass, credential interception, access-control evasion, or disruptive online gaming functionality. Changes should be tested in isolated copies. Never send keystores, account tokens or private API secrets to the model.

## Technologies verified against public documentation

- Android SDK `apkanalyzer`: APK, files, manifest, DEX, resources and comparisons — https://developer.android.com/tools/apkanalyzer
- JADX capabilities and known decompilation limitations — https://github.com/skylot/jadx
- OpenAI Skills standard and optional hosted shell execution — https://developers.openai.com/api/docs/guides/tools-skills
- OpenAI plugin skill manifests and MCP workflows — https://developers.openai.com/plugins/concepts/skills

## Current integration vs future work

**Build 17** contains a local classifier and specialized ChatGPT prompting only. It **does not** dynamically execute independent Python/Java/Smali analysers, load Codex-hosted SKILL.md into an AI sandbox, perform game engine-specific semantic data flow, or run active game modifications. A future controlled execution pipeline could add such capabilities for authorized projects, using isolated workers, source attestations, bounded outputs, optional human approval, and device test fixtures.

## Validation gates

- `node tools/skill-intelligence.test.js`: catalog IDs, evidence classification, game scope, limits, zero-evidence behavior.
- `node tools/smoke-test.js`: existing app UI and WebView bridge regression.
- `node tools/bridge-contract.test.js`: JavaScript/Android interface.
- Android GitHub Actions compilation, asset packaging, and release artifact.
- Manual functional testing on Android and ChatGPT OAuth login remain required before a production claim.
