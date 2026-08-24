# Sanket Setu Alert (SSA) React Native client

This package contains the active **React Native/Expo** client for Sanket Setu Alert. React Native is the chosen implementation because the repository already has an Expo Router shell, shared TypeScript protocol and cryptography packages, and a local Android Nearby Connections module. A separate Flutter client is intentionally not maintained in parallel; a Flutter port can reuse the shared packet contract later.

## Run the JavaScript client

From the repository root:

```bash
pnpm install
pnpm --filter @sanketly/mobile start
pnpm --filter @sanketly/mobile run typecheck
pnpm --filter @sanketly/mobile test
```

A native development build requires Android Studio/SDK or Xcode and a physical device or emulator:

```bash
pnpm --filter @sanketly/mobile android
pnpm --filter @sanketly/mobile ios
```

The repository sandbox can validate TypeScript and protocol behavior, but it does not contain Android SDK, Gradle, adb, or a radio-capable device. Therefore Nearby discovery, foreground-service recovery, OEM battery behavior, and multi-hop radio range remain physical-device acceptance tests.

## Source structure

| Area | Responsibility |
|---|---|
| `app/` | Thin Expo Router screens: dashboard, alert compose/list/detail, network, settings, onboarding, and peer chat |
| `components/ssa/` | Reusable status pills, buttons, cards, alert tiles, priority chips, and peer rows |
| `features/alerts/` | Structured-alert display and sorting helpers |
| `features/network/` | Transport-state and verified-peer helpers |
| `features/settings/` | Settings sections and persistence-boundary copy |
| `constants/ssa.ts` | Bengali-first labels, alert taxonomy, palette, and priorities |
| `lib/sanketly-provider.tsx` | Identity loading, native transport event handling, UI state, alert/message creation |
| `lib/mesh/mesh-engine.ts` | Transport-independent ingress, destination decryption, route selection, relay forwarding, queueing, and retry draining |
| `lib/storage.ts` | SecureStore identity and AsyncStorage outbox, relay queue, alert records, and relay events |
| `modules/ssa-nearby/` | Primary Android Google Nearby Connections `P2P_CLUSTER` bridge and foreground service |
| `modules/sanketly-mesh/` | Experimental raw BLE fallback; not the primary SSA pilot transport |

The fuller repository map and execution diagram are in [`../SSA_REACT_NATIVE_CODEBASE.md`](../SSA_REACT_NATIVE_CODEBASE.md). The dashboard wireframe specification is [`../SSA_DASHBOARD_WIREFRAME_SPEC.md`](../SSA_DASHBOARD_WIREFRAME_SPEC.md).

## Alert and message flow

A structured alert contains a schema version, type, priority, title, description, village, optional ward/location, creation time, expiry time, and alert ID. The provider serializes the complete structure into the encrypted message body. Libsodium seals that body to the recipient’s public encryption key and signs the ciphertext together with the authenticated metadata. A relay therefore forwards opaque bytes and cannot modify an alert without causing recipient signature verification to fail.

The local UI uses honest delivery vocabulary. `queued` means the encrypted packet is durably stored for another attempt; `relaying` means a next hop was selected; `delivered` requires recipient-side processing evidence; `expired` means the packet’s deadline passed; and `failed` means retry policy ended. A native API accepting a byte payload is not itself treated as delivery confirmation.

## Native transport and emergency persistence

On Android, SSA uses Google Nearby Connections with `P2P_CLUSTER` as the primary transport. Bluetooth, nearby Wi-Fi, notification, and legacy location permissions are requested according to Android version. The foreground service uses a persistent notification, sticky restart, task-removal recovery, boot-time recovery configuration, and a JavaScript event buffer.

This is **best effort**, not an uninterrupted-service guarantee. Android force-stop, revoked permissions, battery exhaustion, radio failure, and OEM power-management policies can still stop or restrict the app. Operators should review the battery settings CTA and keep radios enabled during a pilot.

## Three-device acceptance test

Use Android devices A, B, and C. Keep A and C outside direct radio range while B remains within range of both. Start discovery on all three devices and approve only expected nearby requests. Verify that A learns C’s signed announcement through B, then send an encrypted alert from A to C. B should report a forwarding event without showing the alert plaintext, and C should display the structured alert after signature verification and decryption. Disconnect B and confirm that queued packets remain durable, retry with backoff, and expire rather than being reported as delivered.

The same test should be repeated after backgrounding, screen lock, task removal, process recreation, reboot, permission revocation, and battery-saver changes on each target Android OEM.

## Persistence roadmap

The current Expo-compatible prototype uses AsyncStorage for outbox, relay queue, alert records, and relay events, with SecureStore for private identity material. This keeps the JavaScript validation path light but is not the final high-volume emergency datastore. Before field deployment, migrate these repositories to an encrypted SQLite/Room-compatible implementation with schema migrations, crash-safe transactions, bounded event retention, and explicit recovery tests.

## Android test APK build

The current Android release configuration targets **minSdk 26** because the included experimental raw-BLE fallback module declares Android 26 as its minimum. The primary Nearby module remains the SSA pilot transport. After installing Android SDK Platform-Tools, Android SDK Platform 35 or newer as required by the generated project, and a full JDK, regenerate and build the APK with:

```bash
cd mobile
pnpm exec expo prebuild --clean
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"
bash ./android/gradlew -p android assembleRelease --no-daemon
```

The installable artifact is written to `mobile/android/app/build/outputs/apk/release/app-release.apk`. The repository also includes `scripts/install-ssa-apk-3-devices.sh` for concurrent installation on explicitly selected ADB serials. The release APK produced from the current test checkpoint is signed with the generated debug keystore for development testing only; create and protect a production upload/release keystore before distribution outside the test team.
