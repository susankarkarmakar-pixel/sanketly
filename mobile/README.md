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

The app is intentionally honest about its current stage. Mobile messages are sealed with libsodium using the recipient’s public encryption key, authenticated with the sender’s Ed25519 signing key, and persisted as ciphertext plus signed metadata in the durable outbox. The native module now performs permission-aware BLE scanning and advertising, exposes the Sanketly GATT service, connects to nearby peers, exchanges authenticated announce frames, fragments packets into 160-byte payload chunks, and delivers reassembled frames back to JavaScript. Physical two-device testing remains required for platform-specific radio behavior and background execution.

## Package boundaries

- `@sanketly/protocol` defines versioned packet framing, TTL/hop rules, relay checks, message envelopes, and bounded deduplication.
- `@sanketly/domain` defines conversations, outbox records, transport adapters, and delivery-state transitions.
- `@sanketly/mesh-crypto` provides libsodium sealed-box encryption, Ed25519 signatures, metadata binding, and decrypt-time verification.
- `@sanketly/mesh-native` exposes the Swift/Kotlin native boundary to TypeScript, including BLE peer, status, and frame events.
- The BLE service uses UUIDs `9E1A0001-6C1B-4D0B-9B0A-53414E4B4554`, with RX `...0002` and TX `...0003`; frames use a 13-byte chunk header and 160-byte payloads.
- `mobile/lib/sanketly-provider.tsx` owns local identity, mesh status, conversations, and encrypted outbox actions.

## Next implementation milestone

Build and install native development clients on one iOS device and one Android device, verify scan/advertise/connect behavior, exchange announce frames, send encrypted packets in both directions, and test reconnection. After direct two-device delivery passes, add bounded multi-hop relay, ACK/retry scheduling, BLE backpressure queues, and stronger authenticated peer verification.
