# Sanket Setu Alert (SSA) Mobile Reference Shell

This package is the current React Native/Expo reference shell for Sanket Setu Alert’s offline-first mobile client. It contains the secure local identity store, durable encrypted outbox, shared protocol/domain package consumption, the experimental raw-BLE native boundary, and the initial SSA user-facing screens.

## Run the reference shell

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

## Current status

Messages are sealed with libsodium using the recipient’s public encryption key, authenticated with the sender’s Ed25519 signing key, and persisted as ciphertext plus signed metadata in the durable outbox. The experimental native module performs raw BLE scanning, advertising and GATT framing. For the SSA pilot, the next primary transport is a Kotlin + Jetpack Compose Android client using Google Nearby Connections with `P2P_CLUSTER`; raw BLE should remain isolated until the Nearby proof-of-connectivity is stable.

The user-facing app name is **Sanket Setu Alert (SSA)**. Internal `@sanketly/*` package names and the provider/module symbols remain temporarily unchanged to reduce migration risk.

## Package boundaries

- `@sanketly/protocol` defines versioned packet framing, TTL/hop rules, relay checks, message envelopes, BLE frame constants, and bounded deduplication.
- `@sanketly/domain` defines conversations, outbox records, transport adapters, and delivery-state transitions.
- `@sanketly/mesh-crypto` provides libsodium sealed-box encryption, Ed25519 signatures, metadata binding, and decrypt-time verification.
- `@sanketly/mesh-native` exposes the experimental Swift/Kotlin raw-BLE boundary to TypeScript.
- `mobile/lib/sanketly-provider.tsx` owns local identity, mesh status, conversations, and encrypted outbox actions.

## SSA implementation direction

Read [`../SSA_FINAL_PLAN.md`](../SSA_FINAL_PLAN.md) before adding production alert features. Phase 1 must prove two-device Android Nearby discovery, mutual connection acceptance and offline bytes exchange before structured alerts, multi-hop relay, Bridge Node uploads, or Block Office forwarding are enabled.
