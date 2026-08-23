# Sanketly

**Tagline:** The Future of Communication, Built in India. Designed for the World.

A privacy-first, end-to-end encrypted messaging app. Currently implemented: passwordless identity/auth, real-time transport, E2E encryption via `@wireapp/proteus`, group messaging, TTL-based offline queueing, and the first React Native mobile foundation for nearby mesh delivery.

## Mobile foundation

The `mobile/` package contains the Expo/React Native shell, secure local peer identity storage, durable local outbox, mesh status UI, and a native Swift/Kotlin module boundary. Shared packet framing, TTL/hop rules, deduplication, delivery states, and transport contracts live in `packages/protocol` and `packages/domain`. The `@sanketly/mesh-crypto` package seals mesh messages with libsodium, signs authenticated metadata with Ed25519, and verifies envelopes before decryption.

The native module now implements the first direct offline transport: BLE scanning, advertising, GATT service discovery, peer lifecycle events, 13-byte chunk framing, frame reassembly, and encrypted packet delivery to the JavaScript layer. The remaining offline-network work is physical two-device validation, reconnection/backpressure handling, ACK/retry scheduling, bounded multi-hop relay, and background behavior hardening.

## Build Approach

Solo dev + Google, developed on GitHub.
