# Sanketly Mobile Mesh Transformation Plan

**Prepared by Manus AI**  
**Repository reviewed:** `susankarkarmakar-pixel/sanketly`  
**Recommended target:** Android and iOS mobile application with nearby encrypted messaging, store-and-forward relaying, and optional internet fallback.

## Executive recommendation

Sanketly should evolve into a **hybrid transport messaging application** rather than attempting to replace the current server immediately. The mobile client should prefer a nearby peer-to-peer mesh when devices are in radio range, use the existing internet server as a fallback when mesh delivery is unavailable, and keep messages in a durable local outbox until one of those transports succeeds.

This is the most practical path because Sanketly already has useful foundations: passwordless identity, Ed25519/X25519 key material, Proteus-based encryption, Socket.IO transport, group-message routing, and a Redis-backed TTL queue. The current client is a React/Vite web application, however, so its UI and browser persistence are not a sufficient foundation for reliable native Bluetooth discovery, advertising, background restoration, and radio lifecycle management. The mobile version should therefore preserve the existing protocol and security intent while introducing a native-capable React Native client and a dedicated native mesh module.

The first release should target **encrypted text messages between nearby devices**, with a small multi-hop relay limit and an optional server fallback. Attachments, voice, location channels, anonymous rotating identities, Wi-Fi Direct bridging, and large groups should be staged after the core mesh is reliable. BitChat’s public architecture is a useful reference because it combines BLE mesh, multi-hop delivery, compact packets, Noise-based live sessions, and internet relay fallback, but Sanketly should define its own wire format and threat model rather than copying an app-specific private-envelope protocol.[1]

## What exists today and what it means for the migration

The repository is a TypeScript monorepo with a Vite/React browser client and a Node/Express server. The server authenticates users through a challenge signed by an Ed25519 key, stores user public keys and prekeys, supports group records, and routes Socket.IO messages. Offline messages are stored in Redis with a default seven-day expiry. The client already has identity, transport, queue, IndexedDB, Socket.IO, TweetNaCl, and Proteus-related code available for reuse.[6]

The migration should not turn the browser client into a pseudo-mobile application. Instead, shared protocol contracts should be extracted into packages that can be consumed by the web client, mobile client, and server. UI state, device persistence, Bluetooth operations, app lifecycle, secure key storage, notifications, and background behavior should remain platform-aware.

| Existing capability | Reuse decision | Required mobile work |
|---|---|---|
| Identity and public-key registration | Preserve the wire-level meaning and test vectors | Move private-key storage to iOS Keychain and Android Keystore-backed storage; add recovery and rotation rules |
| Proteus/E2E encryption | Preserve only after an interoperability audit | Provide a mobile-compatible implementation and cross-platform test vectors; do not change algorithms casually |
| Socket.IO server transport | Reuse as the internet fallback | Wrap it behind a common `Transport` interface and make it optional rather than mandatory |
| Redis offline queue | Reuse during hybrid rollout | Add delivery acknowledgements, idempotency, retry state, and server-side authentication checks |
| IndexedDB queue | Do not port directly | Replace with mobile SQLite or an equivalent durable local store, encrypted where appropriate |
| Group messaging | Defer from mesh MVP | First prove 1:1 text over mesh, then design group-key distribution and relay behavior |
| React/Vite UI | Use as a product reference | Rebuild the mobile UI in React Native/Expo Router; share types and domain logic, not DOM components |

## Target architecture

### Application layers

The mobile application should have four major layers. The **presentation layer** contains React Native screens, navigation, accessibility, permission education, chat rendering, and delivery indicators. The **application layer** owns conversations, outbox state, retries, deduplication results, and transport selection. The **protocol layer** defines packet schemas, serialization, message identifiers, hop limits, TTL rules, acknowledgements, and version negotiation. The **native transport layer** implements BLE scanning, advertising, connections, background restoration, and platform-specific permissions through Swift and Kotlin modules exposed to TypeScript.

Expo’s native-module model supports this split: a native module can expose a TypeScript API while implementing platform-specific functionality in Swift and Kotlin.[5] Sanketly should use a custom development build or bare-capable Expo workflow, not Expo Go as the production target, because the mesh engine needs native Bluetooth behavior and lifecycle integration.

```text
React Native / Expo UI
        |
Application services: conversations, outbox, delivery state
        |
Transport selector: MeshTransport | InternetTransport
        |
Protocol engine: packet codec, dedup, TTL, routing, acknowledgements
        |
Native mesh bridge: Swift CoreBluetooth / Kotlin BLE
        |
Nearby devices

Optional parallel path:
Protocol engine -> Socket.IO client -> existing Sanketly server -> Redis queue
```

### Recommended technology choices

| Area | Recommendation | Reason |
|---|---|---|
| Mobile UI | React Native with Expo Router and TypeScript | Reuses the team’s TypeScript skills and provides a coherent Android/iOS UI layer |
| Native boundary | Expo Modules API or a local React Native native module | Keeps BLE-specific code isolated while allowing shared application code |
| iOS radio layer | Swift and CoreBluetooth central/peripheral roles | Needed for BLE scanning, advertising, connections, state restoration, and background behavior |
| Android radio layer | Kotlin BLE scanner, advertiser, GATT client/server, and lifecycle services | Needed for Android permissions, discovery, connections, and reliable lifecycle handling |
| Local persistence | SQLite with a small repository abstraction | Durable messages, peers, sessions, seen-message cache, and outbox survive relaunch |
| Secret storage | Keychain on iOS and Keystore-backed storage on Android | Prevents private identity material from being stored as ordinary preferences |
| Shared protocol | Versioned binary packet format with generated TypeScript types | BLE has limited payload capacity; explicit versioning prevents silent incompatibility |
| Internet fallback | Existing Socket.IO server behind the same transport interface | Enables gradual rollout and delivery outside mesh range |
| Testing | Unit tests, protocol vectors, native integration tests, and real-device mesh tests | A simulator cannot validate radio discovery, background behavior, or battery impact |

## Mesh MVP definition

The MVP should answer one question: **Can two or more real phones exchange authenticated, encrypted text messages without internet access, while messages survive temporary disconnection and do not duplicate?** The MVP is complete only when this works on Android-to-Android, iPhone-to-iPhone, and at least one Android-to-iPhone path.

| MVP capability | Included behavior | Acceptance criterion |
|---|---|---|
| Nearby discovery | Devices advertise a Sanketly service and discover peers | Two phones show each other as nearby without accounts being required for the radio handshake |
| Secure session | Peers authenticate their long-term identity and establish an encrypted session | A tampered, replayed, or mismatched handshake is rejected in automated tests |
| 1:1 text | A user sends a short encrypted message to a selected peer | The recipient decrypts it; the relay never receives plaintext |
| Multi-hop relay | An intermediate device forwards a message within a bounded hop and TTL budget | A three-device line topology delivers the message end to end without internet |
| Store and forward | A relay temporarily retains an encrypted packet when the destination is absent | The message is delivered after the destination reconnects and expires after its TTL |
| Deduplication | Every node keeps a bounded seen-message cache | Repeated packets result in one visible message and bounded radio traffic |
| Internet fallback | The app uses Socket.IO when mesh delivery is unavailable | User sees a transport status and the same conversation model works online |
| Local outbox | Messages remain in a durable sending state until acknowledged or expired | Kill/relaunch and reconnect tests do not lose a valid unsent message |
| Permission education | The app explains nearby-device access before requesting it | Users can understand why Bluetooth, notifications, and any legacy location permission are needed |

The first MVP should exclude voice, images, files, geolocation channels, public broadcast channels, Wi-Fi Direct bridging, app sharing, anonymous rotating identities, and large-scale group fan-out. Those features multiply the protocol, privacy, battery, and moderation surface before the fundamental delivery guarantees are proven.

## Protocol design to implement before UI polish

Sanketly should write a short protocol specification before implementing the mesh. Every packet should carry a protocol version, packet type, message identifier, sender identity reference, creation time, expiry or TTL information, hop count, ciphertext, and integrity/authentication material. The message identifier must be globally unique enough for deduplication and must not be reused across retries.

The initial routing strategy should be deliberately conservative. Use a bounded gossip approach: relay only packets that are new to the node, decrement the hop budget, apply the expiry time, and avoid relaying packets that the node originated or has already acknowledged. Add per-peer and per-message rate limits, a maximum packet size, a maximum relay count, and a bounded cache. More efficient source routing or social-graph-aware forwarding can be evaluated after real-device measurements.

The security design must distinguish **identity authentication**, **session confidentiality**, **message confidentiality**, **replay resistance**, and **metadata privacy**. A signed identity announcement is not by itself proof that a packet belongs to the current connection; the handshake must bind the authenticated identity to the live session. Stored-and-forward packets should remain encrypted to the intended recipient or group, and relays should see only the metadata required for routing. Security review should explicitly cover key theft, malicious relays, packet replay, identity spoofing, denial-of-service flooding, and compromised intermediate devices.

The existing Proteus implementation should first be treated as a compatibility target, not automatically as the complete mesh-session design. The team should generate shared test vectors for key creation, prekey use, session establishment, message encryption, decryption, failure, and rotation. Any move to a Noise-style session for live BLE links must document how it interoperates with or differs from the existing Proteus message layer.

## User experience and mobile screens

The mobile UX should make the transport state understandable without exposing protocol complexity. The home screen should show conversations and a small status indicator such as **Nearby**, **Internet**, **Queued**, or **Expired**. A peer-discovery screen should show nearby devices, signal freshness, verification status, and whether the peer is reachable directly or through relays. A diagnostics screen should be available for testers, showing node identifier, protocol version, hop count, queue size, last handshake, and radio permission state.

The primary screens should be implemented in this order: onboarding and local identity creation; permission education; nearby peers; conversation list; 1:1 chat; message delivery details; settings and privacy controls; mesh diagnostics. The UI should never imply that a message is delivered merely because it entered the local queue. Delivery states should be explicit: composing, encrypted, queued, relaying, sent to server, delivered, read, expired, or failed.

## Delivery roadmap

### Phase 0: Protocol and security baseline, approximately 1–2 weeks

Freeze the threat model, choose the minimum supported Android and iOS versions, document the packet schema, define delivery states, and extract shared types from the current repository. Build cross-platform crypto test vectors before adding Bluetooth. Audit the current challenge/session model because the server currently stores sessions and user state in memory, which is not a production-ready identity service.

**Exit condition:** a written protocol specification, threat model, compatibility matrix, and passing crypto/serialization vectors shared by web, server, and the future mobile client.

### Phase 1: Mobile shell and shared domain, approximately 1–2 weeks

Create a separate mobile application package in the repository using React Native/Expo Router with a custom development-build workflow. Add local persistence, secure identity storage, navigation, theme, onboarding, chat data models, and the common transport interface. Keep the current web client working while shared protocol types are extracted.

**Exit condition:** the mobile app can create or load a local identity, display conversations, persist messages, and use a mocked transport without dead-end screens.

### Phase 2: Native BLE proof of concept, approximately 2–3 weeks

Implement the smallest native module that can advertise a Sanketly service, scan for peers, connect, exchange a framed payload, and report lifecycle events to TypeScript. Build Android and iOS test screens before integrating real chat. Do not begin with multi-hop routing; first prove a stable two-device link and reconnection behavior.

On iOS, Core Bluetooth background execution is constrained and may suspend or terminate the application, so the implementation must include state preservation/restoration and bounded work rather than promising an always-on relay.[4] On Android, the app must handle runtime nearby-device permissions and version-specific legacy behavior.[3]

**Exit condition:** two physical phones can discover, connect, exchange a test frame, disconnect, reconnect, and report permission or radio failures clearly.

### Phase 3: Secure session and 1:1 mesh messaging, approximately 2–3 weeks

Connect the native link to the protocol engine. Add authenticated handshakes, encrypted text packets, acknowledgements, packet framing, malformed-packet rejection, replay protection, and a durable local outbox. Integrate the current server as a second transport behind the same interface.

**Exit condition:** encrypted 1:1 text works direct over BLE and through the existing Socket.IO server, with the same conversation model and correct delivery-state transitions.

### Phase 4: Relay, deduplication, and store-and-forward, approximately 2–3 weeks

Add a three-node simulated mesh first, then test on real devices. Implement hop budgets, TTL, seen-message caches, relay limits, queue limits, retry backoff, acknowledgements, and expiration. Verify that a relay cannot decrypt message content and that duplicate packets do not create duplicate messages.

**Exit condition:** an offline three-device line topology delivers a message across one relay, survives temporary destination absence, and remains bounded under duplicate or flood tests.

### Phase 5: Reliability, privacy, and battery hardening, approximately 2–4 weeks

Measure discovery latency, delivery latency, radio duty cycle, memory, queue growth, CPU use, and battery impact. Add privacy controls, block lists, peer verification UX, local data deletion, crash recovery, notification behavior, and diagnostic export. Test background and screen-locked states separately on both platforms.

**Exit condition:** a defined device matrix passes reliability, privacy, and power budgets under documented test scenarios.

### Phase 6: Pilot release and internet/mesh convergence, approximately 2 weeks

Release an internal pilot to a small group of devices. Keep internet fallback enabled, collect only privacy-preserving operational metrics, document known platform limitations, and add a feature flag for mesh mode. Use feedback to prioritize groups, media, channels, or stronger anonymity rather than adding all of them at once.

**Exit condition:** pilot users can install, understand permissions, exchange messages, recover from failures, and report a problem using in-app diagnostics.

## Testing strategy

A mesh application cannot be validated through browser tests alone. The repository should contain deterministic protocol tests, property tests for serialization and deduplication, crypto interoperability tests, native unit tests, and device-lab scenarios. The minimum manual matrix should include two Android phones, two iPhones, and mixed Android/iOS pairs. Each scenario should be repeated with the app foregrounded, backgrounded, screen locked, permissions denied, Bluetooth toggled, Wi-Fi and cellular disabled, the destination temporarily absent, and the app force-terminated.

| Test area | Required scenarios |
|---|---|
| Protocol | Version mismatch, malformed packet, oversized packet, invalid signature, invalid ciphertext, expired TTL |
| Routing | Direct delivery, one relay, duplicate flood, loop prevention, hop exhaustion, relay rate limit |
| Persistence | Process death, device reboot, queue restore, corrupted record, duplicate acknowledgement |
| Security | Wrong recipient, replayed handshake, spoofed identity, compromised relay, key rotation, block list |
| Mobile lifecycle | Background discovery, restoration, permission revocation, Bluetooth off/on, app relaunch |
| UX | Permission denial, queued status, expiry, delivery failure, peer verification, local deletion |
| Performance | Discovery latency, delivery latency, queue size, CPU, memory, battery, radio airtime |

## Major risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| iOS background limits | Mesh participation may be intermittent | Treat background relaying as best effort; implement restoration, bounded tasks, and visible status; do not promise always-on service |
| Native BLE complexity | Cross-platform bugs can block the product | Build a two-device proof of concept before routing, and isolate the native module behind a narrow API |
| Crypto incompatibility | Messages may be lost or falsely appear secure | Freeze formats, generate test vectors, and obtain an independent security review before public release |
| Flooding and battery drain | A malicious or busy mesh can exhaust resources | Enforce packet size, hop, TTL, queue, rate, and deduplication limits from the first relay build |
| Identity spoofing and metadata leakage | Users may be deanonymized or impersonated | Bind identities to sessions, protect private keys, minimize broadcast metadata, and document limits clearly |
| Current server state model | Sessions and prekeys may not survive production scaling | Move identity/session/prekey state to a durable database and add authentication, authorization, rotation, and abuse controls |
| Scope expansion | Media, groups, and channels can delay core reliability | Maintain a strict text-only mesh MVP and add features only after real-device acceptance tests pass |

## Immediate repository work plan

The first implementation branch should introduce a `mobile/` application and shared packages without deleting the current client. A reasonable structure is `packages/protocol` for packet schemas and codecs, `packages/crypto` for shared interfaces and test vectors, `packages/domain` for message/conversation types, `mobile/` for the React Native application, and `native/mesh` for the Swift/Kotlin module source. The current web client can consume the shared protocol and continue serving as a regression harness.

The first concrete engineering tasks should be to extract the existing message and identity contracts, add a transport abstraction, add a durable mobile outbox interface, write protocol vectors, scaffold the mobile shell, and prototype the smallest native BLE frame exchange. Only after those tasks pass should the team implement multi-hop routing. This sequence minimizes the chance of building a polished chat UI around an untestable radio layer.

## Definition of success

Sanketly will have a credible BitChat-style foundation when a user can install the app on supported Android and iOS devices, create a local identity, grant nearby-device permissions, discover a peer, verify or trust that peer, send an encrypted text message without internet, relay it through another phone, kill and reopen the app without losing valid queued state, and fall back to the existing server when the mesh cannot deliver. The app should communicate honestly when delivery is best effort, when iOS background constraints limit participation, and when a message is queued rather than delivered.

> **Recommended first milestone:** do not build the full product yet. Build a two-device native BLE proof of concept plus the shared packet and crypto test vectors. If that milestone succeeds, proceed to three-device relay; if it fails, the failure will be discovered before expensive UI and feature work.

## References

[1]: https://github.com/permissionlesstech/bitchat "BitChat iOS repository and protocol overview"

[2]: https://github.com/permissionlesstech/bitchat-android "BitChat Android repository"

[3]: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions "Android Bluetooth permissions"

[4]: https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html "Apple Core Bluetooth background processing"

[5]: https://docs.expo.dev/modules/native-module-tutorial/ "Expo native-module tutorial"

[6]: https://github.com/susankarkarmakar-pixel/sanketly "Sanketly repository"
