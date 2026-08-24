# Sanket Setu Alert (SSA)

**Tagline:** *Jokhon Shob Bondho, Setu Khola Thake* — “When everything else is closed, the bridge stays open.”

Sanket Setu Alert is an Android-first, offline-capable disaster alert and communication app for rural India, initially intended for a controlled pilot in Gazole Development Block, Malda District, West Bengal. SSA is designed to let residents create structured emergency alerts and relay them phone-to-phone when ordinary internet connectivity is unavailable.

## Current implementation

The active mobile client is **React Native/Expo**, not a parallel Flutter codebase. This decision avoids maintaining two native transport implementations while the repository already has an Expo Router shell, shared TypeScript packages, a Google Nearby Connections module, and an Android emergency foreground-service boundary. A future Flutter port can reuse the shared packet and cryptography contracts.

The mobile client now includes a Bengali-first dashboard, structured alert composer and history/detail routes, network diagnostics, settings and onboarding screens, a reusable `MeshEngine`, persistent outbox/relay/alert/event records, and shared protocol tests. The full source map and execution flow are documented in [`SSA_REACT_NATIVE_CODEBASE.md`](./SSA_REACT_NATIVE_CODEBASE.md), with visual UX guidance in [`SSA_DASHBOARD_WIREFRAME_SPEC.md`](./SSA_DASHBOARD_WIREFRAME_SPEC.md).

## Security and mesh behavior

The `@sanketly/mesh-crypto` package seals message bodies to the recipient’s public encryption key and signs authenticated metadata plus ciphertext with Ed25519. Structured alert fields are serialized into that encrypted body before transmission, so a relay can forward opaque packets but cannot alter alert content without invalidating recipient-side verification.

The primary Android transport is Google Nearby Connections `P2P_CLUSTER`, wrapped by `@sanketly/nearby-native`. The raw BLE module remains isolated as an experimental fallback. `@sanketly/protocol` provides framed packets, authenticated-peer route gating, direct-destination preference, duplicate suppression, TTL and hop limits, previous-hop avoidance, and bounded relay retry persistence. Packets at the relay limit can still reach a directly connected verified final recipient, but cannot be forwarded to another relay.

The user-facing state vocabulary distinguishes `queued`, `relaying`, `delivered`, `expired`, and `failed`. Native byte-send acceptance is not represented as delivery confirmation. Relay devices do not decrypt the recipient’s message body.

## Current checks

From the repository root:

```bash
pnpm install
pnpm test
pnpm build
pnpm --filter @sanketly/mobile run typecheck
pnpm --filter @sanketly/mobile test
pnpm --filter @sanketly/protocol test
```

The sandbox can validate TypeScript, shared protocol tests, and JavaScript unit tests. It does not contain Android SDK, Gradle, adb, an emulator, or a radio-capable device. Nearby discovery, foreground-service survival, OEM battery behavior, and three-device multi-hop range therefore require physical Android acceptance testing.

## Product and claims boundary

SSA is a best-effort emergency communication tool, not a guaranteed carrier replacement. Android force-stop, revoked permissions, battery exhaustion, radio failure, device shutdown, and OEM power-management policies can interrupt operation. The phrase “India’s first” is not treated as a verified public claim; any public positioning should follow independent landscape review and legal/communications approval. The final roadmap is documented in [`SSA_FINAL_PLAN.md`](./SSA_FINAL_PLAN.md).
