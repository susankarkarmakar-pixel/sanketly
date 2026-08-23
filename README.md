# Sanket Setu Alert (SSA)

**Tagline:** *Jokhon Shob Bondho, Setu Khola Thake* — “When everything else is closed, the bridge stays open.”

An Android-first, offline-capable disaster alert and communication app for rural India, initially piloted in Gazole Development Block, Malda District, West Bengal. SSA is designed to let residents create structured emergency alerts and relay them phone-to-phone until an opportunistic bridge device can forward them to the Block Office.

The repository currently contains the initial Expo/React Native reference shell, shared alert/protocol/domain packages, authenticated libsodium message support, and an experimental native BLE transport. The approved next transport direction for the SSA pilot is a Kotlin + Jetpack Compose Android client using Google Nearby Connections with `P2P_CLUSTER`; the raw BLE module remains isolated as a research/fallback transport rather than the primary pilot path.

## Mobile foundation

The existing `mobile/` package provides secure local identity storage, a durable outbox, mesh status UI, signed/encrypted packet primitives, and native transport boundaries. The `@sanketly/mesh-crypto` package seals messages with libsodium, signs authenticated metadata with Ed25519, and verifies envelopes before decryption. Internal `@sanketly/*` package names are retained temporarily to avoid a risky all-at-once namespace migration.

## Product direction

SSA will be built in seven gates: two-device Nearby Connections proof of connectivity; structured alert categories and multi-hop relay; opportunistic Bridge Node uploads; Node.js/Express backend and Block Office forwarding; low-friction user verification; Bengali-first low-literacy UI and offline Gazole map; and a controlled 10–15-village pilot. The final roadmap is documented in [`SSA_FINAL_PLAN.md`](./SSA_FINAL_PLAN.md).

The phrase “India’s first” is not treated as a verified public claim yet. The pilot should use evidence-based wording until an independent landscape review and legal/communications approval support a stronger claim.

## Current technical checks

Run the existing repository checks from the root:

```bash
pnpm install
pnpm test
pnpm build
pnpm --filter @sanketly/mobile typecheck
```
