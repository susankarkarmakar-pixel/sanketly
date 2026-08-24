# Sanket Setu Alert (SSA) React Native Codebase

## Platform decision

SSA uses **React Native with Expo SDK 54 and TypeScript** as the application layer because the repository already contains an Expo mobile shell, Expo Router screens, shared TypeScript packages, an Android Nearby Connections module, and an Android foreground-service boundary. Flutter is not introduced as a second client because duplicating the client would create two protocol implementations and two native transport stacks to maintain. The shared packet and cryptographic contracts remain platform-neutral and can be reused by a future Flutter client if that becomes a product requirement.

## Repository structure

```text
sanketly/
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx                 # Root navigation and SSA provider
│   │   ├── index.tsx                   # Bengali-first dashboard and emergency mode
│   │   └── chat/[peerId].tsx           # Encrypted peer conversation
│   ├── components/
│   │   └── screen-container.tsx        # Safe-area screen wrapper
│   ├── lib/
│   │   ├── sanketly-provider.tsx       # UI state, identity, native events, routing
│   │   ├── storage.ts                   # Secure identity, outbox, relay queue
│   │   └── mesh/
│   │       ├── mesh-engine.ts           # Reusable packet ingress, routing, relay
│   │       └── mesh-engine.test.ts      # Routing and queue tests
│   ├── modules/
│   │   ├── ssa-nearby/
│   │   │   ├── src/index.ts             # Nearby JS bridge
│   │   │   ├── android/
│   │   │   │   ├── build.gradle
│   │   │   │   ├── src/main/AndroidManifest.xml
│   │   │   │   └── src/main/java/in/sanketsetu/nearby/
│   │   │   │       ├── SsaNearbyModule.kt
│   │   │   │       ├── SsaNearbyRuntime.kt
│   │   │   │       ├── SsaNearbyForegroundService.kt
│   │   │   │       └── SsaNearbyBootReceiver.kt
│   │   │   ├── expo-module.config.json
│   │   │   ├── package.json
│   │   │   └── README.md
│   │   └── sanketly-mesh/               # Experimental raw BLE fallback
│   │       ├── src/index.ts
│   │       ├── ios/SanketlyMeshModule.swift
│   │       └── android/
│   ├── app.config.ts                    # SSA branding and Android permissions
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── packages/
│   ├── protocol/
│   │   └── src/index.ts                 # Frames, TTL, hops, routes, deduplication
│   ├── mesh-crypto/
│   │   └── src/index.ts                 # Libsodium sealed boxes and signatures
│   ├── domain/
│   │   └── src/index.ts                 # Outbox, relay, conversation contracts
│   └── crypto/                           # Existing web-compatible crypto package
├── client/                               # Existing internet/socket client
├── server/                               # Existing internet fallback and queue
├── SSA_FINAL_PLAN.md
└── SSA_REACT_NATIVE_CODEBASE.md
```

## Runtime layers

| Layer | Responsibility | Main files |
|---|---|---|
| Presentation | Dashboard, chat, emergency controls, status feedback | `mobile/app/*` |
| Application state | Identity lifecycle, peer state, native events, message state | `mobile/lib/sanketly-provider.tsx` |
| Mesh engine | Packet decoding, destination delivery, relay selection, queueing, retry drain | `mobile/lib/mesh/mesh-engine.ts` |
| Persistence | Secure identity, encrypted outbox, durable relay queue | `mobile/lib/storage.ts` |
| Protocol | Stable packet schema, framing, TTL/hop rules, route scoring, deduplication | `packages/protocol` |
| Cryptography | Recipient-only sealed encryption and sender signatures | `packages/mesh-crypto` |
| Native transport | Nearby Connections, foreground service, boot recovery | `mobile/modules/ssa-nearby` |
| Fallback transport | Experimental CoreBluetooth/raw BLE path | `mobile/modules/sanketly-mesh` |
| Internet fallback | Existing Socket.IO server and Redis-style offline queue | `server`, `client` |

## Core message lifecycle

```text
User creates alert/message
        │
        ▼
Provider encrypts with recipient public key
        │
        ▼
MeshPacket carries ciphertext + authenticated metadata
        │
        ▼
MeshEngine selects destination or verified relay
        │
        ├── direct connected peer → native Nearby/BLE send
        ├── connected relay peer   → forward with incremented hop count
        └── no usable route         → durable relay queue + backoff
        │
        ▼
Intermediate phone deduplicates, validates TTL, and forwards opaque ciphertext
        │
        ▼
Recipient verifies signature, decrypts, and displays the message
```

Relay nodes never need the plaintext or private keys of the sender/recipient. Only the original recipient can decrypt a message packet. Relay metadata consists of hop count and immediate previous-hop identity; the signed encrypted envelope remains unchanged.

## Protocol rules

A packet has a stable `packetId`, a creation and expiry time, a `hopLimit`, a current `hopCount`, and an optional `lastHopId`. The route selector filters to connected peers with a usable link. Encrypted messages require authenticated peers; announce packets may use an unverified link to bootstrap identity discovery. A direct verified destination is preferred over a relay. A relay does not immediately return a packet to the previous link or previous hop.

The relay queue is capped at 512 records. Each record is retried with exponential backoff for no more than eight attempts and is removed on expiry or exhausted retry budget. Duplicate packet IDs are suppressed in memory by the protocol deduplication cache. The current delivery model is best-effort; end-to-end acknowledgements, route discovery, congestion control, and cryptographic ratcheting remain future protocol work.

## Android Nearby and emergency mode

The Android module advertises and discovers with Google Nearby Connections using `P2P_CLUSTER`. A user-visible foreground service stores the active service configuration, posts a persistent notification, restores the transport after process recreation, re-issues itself after task removal, and attempts boot-time recovery when emergency mode was previously enabled. Native events are buffered while JavaScript is unavailable and drained after reattachment.

The application requests Bluetooth, nearby Wi-Fi, notification, and legacy location permissions according to Android version. It does not silently toggle radios or silently disable battery optimization. Operators receive a battery-settings action and must decide whether the phone’s power-management policy is appropriate for emergency mode.

## Development commands

Run these commands from the repository root:

```bash
pnpm install
pnpm --filter @sanketly/mobile run typecheck
pnpm --filter @sanketly/mobile test
pnpm --filter @sanketly/protocol test
pnpm test
pnpm build
```

Native development requires a physical Android device and a machine with Android SDK/Gradle. The JavaScript and shared-package checks can run in the repository environment, but radio behavior, foreground-service behavior, OEM power restrictions, and Nearby Connections cannot be proven without a real device.

## Physical acceptance matrix

| Test | Expected result |
|---|---|
| Two-device discovery | Both phones discover and approve each other with mobile data disabled |
| Encrypted direct message | Recipient decrypts; sender sees a queued/sent state; relay sees no plaintext |
| Three-device relay | A-to-C packet reaches C through B while A and C are outside direct range |
| Duplicate injection | Repeated packet ID is ignored after the first copy |
| Hop exhaustion | Packet is not forwarded after its configured hop limit |
| Relay outage | Packet remains durable and retries with backoff |
| Backgrounding | Foreground notification remains and Nearby state can recover |
| Task removal | Service remains or restarts according to device policy |
| Process kill | Service and persisted relay state recover when permitted |
| Reboot | Previously enabled emergency configuration attempts recovery |
| Battery saver/OEM policy | UI clearly reports any loss of guarantee and provides corrective settings |
| Permission revocation | Transport reports attention rather than claiming readiness |

## Security and operational boundaries

The client must not label a packet as delivered merely because it entered the local outbox or because a native API accepted a send request. The user-facing status vocabulary should distinguish `queued`, `relaying`, `sent to next hop`, `delivered`, `expired`, and `failed`. Before production emergency use, SSA needs formal threat modeling, secure key rotation or ratcheting, end-to-end acknowledgements, abuse/rate limiting, telemetry that does not expose message content, and field trials across the target Android OEMs.
