# Sanketly Mobile

This package is the first React Native/Expo foundation for Sanketly’s offline-first mobile client. It contains a native-capable shell, secure local peer identity storage, a durable local outbox, shared protocol/domain package consumption, and a local Expo native-module boundary for future BLE scanning, advertising, GATT framing, and background restoration.

## Run the mobile shell

From the repository root:

```bash
pnpm install
pnpm --filter @sanketly/mobile start
```

For a native development build, use a machine with Android Studio or Xcode configured:

```bash
pnpm --filter @sanketly/mobile android
pnpm --filter @sanketly/mobile ios
```

The app is intentionally honest about its current stage. The mobile shell can persist local test messages as queued outbox records, but it does not yet claim that those records were encrypted or delivered over BLE. The native module currently starts the radio lifecycle boundary and exposes framed-packet send hooks; the next milestone must implement permission-aware scanning, advertising, GATT connections, MTU-aware fragmentation, and frame callbacks on physical devices.

## Package boundaries

- `@sanketly/protocol` defines versioned packet framing, TTL/hop rules, relay checks, message envelopes, and bounded deduplication.
- `@sanketly/domain` defines conversations, outbox records, transport adapters, and delivery-state transitions.
- `@sanketly/mesh-native` exposes the Swift/Kotlin native boundary to TypeScript.
- `mobile/lib/sanketly-provider.tsx` owns local identity, mesh status, conversations, and outbox actions.

## Next implementation milestone

Connect the native module to real CoreBluetooth and Android BLE scanning/advertising, then replace `pending-native-encryption` with the existing Sanketly crypto/session implementation after producing cross-platform test vectors. Only after two-device secure delivery passes should multi-hop relay be enabled.
