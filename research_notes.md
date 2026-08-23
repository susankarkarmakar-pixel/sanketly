# Sanketly / BitChat Research Notes

## Sanketly repository baseline

- Repository: `susankarkarmakar-pixel/sanketly`.
- Current branch is a monorepo with a React/Vite web client and a Node/Express server.
- Root README describes a privacy-first, end-to-end encrypted messaging app.
- Existing implemented features named in the README and recent commits: passwordless identity/auth, real-time transport, Proteus E2E encryption, group messaging, TTL-based offline queueing.
- Client dependencies include React, Socket.IO client, IndexedDB via `idb-keyval`, `@wireapp/proteus`, TweetNaCl, UUID, and a workspace crypto package.
- Server dependencies include Express, Socket.IO, Redis via `ioredis`, TweetNaCl, UUID, and test tooling.
- Server routes/modules include auth, groups, prekeys, Redis, sockets, and in-memory state. Socket transport currently authenticates through a server session ID, routes 1:1 and group messages, and queues offline messages in Redis with a default seven-day TTL.
- The web client is not a direct mobile-native foundation. The mobile plan should preserve protocol/crypto semantics but separate shared domain code from platform-specific UI, persistence, and radio transport.

## BitChat public architecture findings

Source: https://github.com/permissionlesstech/bitchat

- The public README describes two complementary transports: a local Bluetooth Low Energy mesh for offline communication and Nostr relays for internet reach.
- The Bluetooth layer uses direct nearby communication, multi-hop relaying up to a documented maximum of seven hops, automatic discovery/connection management, compact binary packets, adaptive power behavior, and Noise Protocol encryption for live sessions.
- The internet layer uses Nostr relays, geographic channels based on geohash precision, and an app-specific encrypted private-envelope format. The private envelope is not NIP-17, NIP-44, or NIP-59 compatible; compatibility should not be assumed.
- Direct-message routing is described as Bluetooth first, Nostr fallback, and smart queuing when neither is available.
- The repository’s current structure and commit history indicate substantial native CoreBluetooth/iOS work, relay/gossip synchronization, store-and-forward behavior, identity rotation, packet deduplication, TTL/frame budgets, and deterministic multi-node mesh simulation. These are reference patterns, not features Sanketly should copy wholesale in its first release.

Source: https://github.com/permissionlesstech/bitchat-android

- The Android implementation is documented as protocol-compatible with the iOS implementation.
- It requires Android Studio and Android SDK API 26+.
- It requests Bluetooth, location for BLE scanning, and notification permissions at runtime.
- The repository also documents Wi-Fi hotspot/Wi-Fi Direct-based offline app sharing, showing that mesh products may need additional native networking and background-work handling beyond BLE.

## Planning implication

Recommended direction: build a focused Android+iOS native-capable client with a shared TypeScript domain/crypto layer only where safe, while implementing BLE discovery, advertising, connections, background behavior, and platform permissions through native modules. Keep the existing server as an optional internet relay/fallback during migration; do not claim fully serverless operation until the offline mesh protocol, abuse controls, identity lifecycle, and device interoperability are tested on real devices.

## Official mobile-platform constraints

Source: https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html

Apple documents separate Core Bluetooth background modes for central and peripheral roles. Background operation is constrained: the system may suspend or terminate apps, background events may be queued, and applications should use state preservation/restoration and responsible radio usage. Therefore, iOS should be treated as opportunistic mesh participation rather than guaranteed always-on relay service. The app needs a native CoreBluetooth implementation, restoration identifiers, bounded work, and a clear user-visible status for whether mesh service is active.

Source: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions

Android 12+ uses runtime `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, and `BLUETOOTH_CONNECT` permissions for nearby discovery, advertising, and communication. Older Android versions require legacy Bluetooth permissions, and BLE scanning may require location permission depending on OS level and whether scan results are used to derive location. The design must request only the permissions needed for the chosen feature set and explain them in plain language.

Planning implication: an Expo/React Native UI can be retained for product screens, but the mesh engine should be implemented as native Swift/Kotlin modules or a carefully maintained cross-platform native library. A custom development build/bare-capable workflow is required; a browser-only or Expo Go-only implementation is not sufficient for reliable BLE mesh behavior.

## Expo integration finding

Source: https://docs.expo.dev/modules/native-module-tutorial/

Expo documents a native-module path with Swift and Kotlin implementations exposed through a TypeScript interface. This supports using Expo/React Native for Sanketly’s UI and application state while placing BLE scanning, advertising, connections, background restoration, and platform permission behavior behind a small native module boundary.
