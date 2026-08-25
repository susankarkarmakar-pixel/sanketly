# Sanket Setu Alert (SSA) App — Final Implementation Plan

**প্রস্তাবিত নাম:** Sanket Setu Alert (SSA) App  
**Tagline:** *Jokhon Shob Bondho, Setu Khola Thake* — “When everything else is closed, the bridge stays open.”  
**প্রাথমিক pilot area:** Gazole Development Block, Malda District, West Bengal  
**প্রস্তাবিত delivery model:** Android-first native pilot, পরে প্রয়োজন অনুযায়ী iOS ও web-based Block Office dashboard

## 1. Executive decision

Sanketly-কে শুধু নাম বদলে প্রকাশ করা যথেষ্ট হবে না। SSA-এর মূল উদ্দেশ্য private chat নয়; এটি হবে rural India-এর জন্য **offline disaster alert, phone-to-phone relay এবং opportunistic government bridge system**। তাই বর্তমান custom raw-BLE implementation-কে production transport হিসেবে এগিয়ে না নিয়ে প্রথমে Android-native **Google Nearby Connections**-ভিত্তিক Phase 1 proof of connectivity তৈরি করা উচিত। Nearby Connections advertising, discovery, connection এবং data exchange-কে Bluetooth, BLE এবং Wi-Fi-র উপর নিজে পরিচালনা করে; API-টি internet ছাড়া peer-to-peer communication সমর্থন করে এবং established connections encrypted থাকে [1]।

> **প্রথম engineering rule:** Phase 1-এ দুইটি Android phone Nearby Connections দিয়ে discover করবে, connection accept করবে, একটি ছোট test payload পাঠাবে এবং receiver screen-এ দেখাবে। এই test স্থিতিশীল না হওয়া পর্যন্ত multi-hop, backend, WhatsApp/SMS forwarding বা বড় UI polish শুরু করা হবে না।

বর্তমান repository-তে ইতিমধ্যে mobile shell, shared packet/domain model, libsodium encryption এবং raw BLE native boundary আছে। এগুলি পুরোপুরি ফেলে দেওয়া হবে না; shared alert model, encryption, storage interfaces এবং UI ধারণা পুনর্ব্যবহার করা যাবে। তবে transport layer-এ **Nearby Connections adapter** আলাদা করে তৈরি করতে হবে, যাতে বর্তমান raw BLE code experimental fallback হিসেবে থাকে এবং SSA-এর primary Android transport Nearby হয়।

## 2. Product definition

SSA-এর প্রতিটি alert একটি structured emergency record হবে। ব্যবহারকারীকে লম্বা লেখা লিখতে বাধ্য করা হবে না; বড় icon ও Bengali label-সহ category button ব্যবহার করবে। Alert তৈরি হলে device-এর local database-এ তা সংরক্ষিত হবে, কাছের SSA devices-এ পাঠানো হবে, relay device-গুলি একই `alert_id` দ্বিতীয়বার relay করবে না, এবং যেকোনো device internet ফিরে পেলে সেটি সাময়িকভাবে **Bridge Node** হিসেবে backend-এ alert পাঠাবে।

প্রধান alert category হবে **Flood, Fire, Medical, Missing Person, Infrastructure Damage এবং SOS**। Priority হবে **Critical, High, Normal এবং Low**। Location পাওয়া গেলে latitude/longitude যুক্ত হবে; location না পাওয়া গেলে alert কখনও silently হারানো যাবে না—`location_unavailable` status দেখিয়ে পাঠানো হবে।

SSA-কে “India’s first” হিসেবে প্রচার করার আগে independent market scan, state/district-level programme review এবং legal/communications review করা দরকার। বর্তমান তথ্যের ভিত্তিতে এই দাবিটি আমি যাচাই করা হয়নি বলে final product copy-তে আপাতত **“India-focused offline disaster-alert pilot”** বা **“Gazole Block pilot for resilient emergency communication”** ব্যবহার করার পরামর্শ দিচ্ছি। যাচাই শেষ হলে “India’s first” claim আলাদাভাবে legal and evidence review-এর মাধ্যমে অনুমোদন করতে হবে।

## 3. Technology decision

| Approach | Trade-offs | আনুমানিক খরচ | Setup complexity |
|---|---|---:|---:|
| **A. Kotlin + Jetpack Compose + Nearby Connections** | Android background ও radio behaviour-এর উপর সবচেয়ে বেশি native control; Play Services নির্ভরতা থাকবে; iOS version আলাদা করে বানাতে হবে | Low software cost; testing devices ও SMS/WhatsApp provider cost আলাদা | Medium |
| **B. Flutter + native Nearby plugin** | এক codebase-এর সুবিধা; plugin maturity, background behaviour এবং native debugging-এর ঝুঁকি বেশি | Low-to-medium | Medium-high |
| **C. বর্তমান Expo + custom raw BLE** | বর্তমান UI পুনর্ব্যবহার করা সহজ; কিন্তু Android/iOS BLE lifecycle, GATT fragmentation, background execution ও physical-device reliability নিজেরা maintain করতে হবে | Low software cost; high engineering maintenance | High |

**Recommendation:** Approach A। Attachment-এ Android-first, low-literacy, reliable background access এবং Nearby Connections-এর সুপারিশ রয়েছে। Google-এর documentation অনুযায়ী Nearby Connections bytes payload 32 KB পর্যন্ত সমর্থন করে [1]; SSA-এর ছোট alert envelope এই সীমার অনেক নিচে থাকবে। `P2P_CLUSTER` strategy ব্যবহার করে device একই সঙ্গে advertise এবং discover করবে, তবে relay logic application layer-এ explicit থাকতে হবে।

### 3.1 কেন raw BLE primary করা হবে না

বর্তমান raw-BLE code direct GATT link ও custom chunk framing দেখাতে পারে, কিন্তু বাস্তব pilot-এ connection negotiation, radio selection, OS background limits, MTU variation, retry/backpressure এবং device-vendor differences সামলানো কঠিন। SSA-এর primary goal emergency delivery; transport abstraction-এ Nearby Connections এই low-level complexity কমাবে। Raw BLE code-কে পরে controlled fallback বা research transport হিসেবে রাখা যেতে পারে, কিন্তু Phase 1-এ দুইটি transport একসঙ্গে চালিয়ে debugging জটিল করা যাবে না।

### 3.2 Android permission এবং radio policy

Nearby Connections-এর জন্য manifest ও runtime permission দুটিই প্রয়োজন। Google-এর setup documentation Bluetooth, location, Wi-Fi এবং newer Android releases-এর nearby-device permissions উল্লেখ করেছে; user প্রয়োজনীয় permission না দিলে advertising বা discovery শুরু করা যাবে না [2]। Android 12+ এ `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE` ও `BLUETOOTH_CONNECT` runtime flow-এ রাখতে হবে; Android version অনুযায়ী legacy location/Wi-Fi permissions handle করতে হবে।

২০২৬ সালের শেষদিকে Nearby Connections প্রয়োজনীয় Bluetooth/Wi-Fi radio নিজে থেকে চালু না করে user-কে manual enable করতে বলবে—এমন platform change ঘোষণা হয়েছে [3]। তাই SSA-তে clear Bengali explanation screen, “Bluetooth চালু করুন”, “Wi-Fi চালু করুন”, “আবার চেষ্টা করুন” action এবং permission-denied recovery flow Phase 1-এই design করতে হবে।

## 4. Target architecture

```text
Android SSA App (Kotlin + Compose)
  ├── Alert UI: Bengali-first large category actions
  ├── Alert Coordinator: create, validate, deduplicate, relay, expire
  ├── NearbyTransport: advertise, discover, connect, send bytes
  ├── RelayEngine: max_hops, seen-message cache, bounded fan-out
  ├── BridgeWorker: ConnectivityManager + WorkManager retry
  ├── Room Database: alerts, seen IDs, mesh logs, bridge events
  ├── Identity/Crypto: device identity, signatures, optional E2E payload
  └── Offline Map: pre-bundled Gazole region data

                    opportunistic internet
                              │
                              ▼
Node.js + Express API ── SQLite initially ── PostgreSQL later
  ├── POST /alerts
  ├── GET /alerts?status=pending
  ├── idempotency by alert_id
  ├── audit / bridge events
  └── WhatsApp Business or SMS provider adapter
                              │
                              ▼
                  Block Office / BDO dashboard
```

The application must distinguish **transport encryption** from **application-level privacy**. Nearby Connections provides encrypted established connections [1], but SSA should also sign alert envelopes so that a relay cannot silently change category, priority, origin or location. For a public emergency-broadcast use case, the first pilot may avoid mandatory private-chat-style E2E for all text, as specified in the attachment; nevertheless, identity signatures, tamper detection, idempotency and audit logging should be present from the beginning. Existing libsodium code can support this without exposing private keys.

## 5. Data model

### User

`user_id`, `display_name`, `village_name`, `ward_number`, `voter_id_optional`, `phone_number_optional`, `registered_at`, `preferred_language`, `device_public_key`.

Aadhaar or voter ID must not be mandatory in v1. The pilot should minimize personal data, explain why each field is collected, and allow a user to send an emergency alert even when optional profile details are incomplete.

### Alert

`alert_id`, `origin_id`, `sender_id`, `category`, `priority`, `message_text_optional`, `latitude_optional`, `longitude_optional`, `location_accuracy_optional`, `created_at`, `expires_at`, `hop_count`, `max_hops`, `status`, `signature`, `payload_version`.

`status` should include `created`, `relaying`, `queued_bridge`, `bridged`, `delivered_to_block`, `expired`, `rejected` and `failed`. The relay identity must be logged separately from the original sender so the Block Office can understand how an alert reached the network.

### MeshLog

`log_id`, `alert_id`, `relayed_by_device_id`, `peer_link_id`, `relay_attempt`, `relayed_at`, `result`, `failure_reason_optional`.

### BridgeEvent

`event_id`, `alert_id`, `bridged_by_device_id`, `bridged_at`, `server_response_id`, `forwarded_to`, `forwarded_at_optional`, `forwarding_status`, `failure_reason_optional`.

### Relay rules

Every relay must check: the alert is not expired; `hop_count < max_hops`; the `alert_id` has not already been seen; the packet validates; the signature is valid; and the local device has not exceeded rate or storage limits. The default `max_hops` will be **7**, with a server-side and client-side maximum to prevent abuse. A relay must never create a new `alert_id` for the same alert.

## 6. Seven-phase build plan

### Phase 1 — Two-device Nearby Connections skeleton

Build a Kotlin Android prototype screen with Start Discovery, Start Advertising, nearby peer list, connection acceptance, and a small bytes payload. Use a fixed development service identifier and keep the payload below 32 KB. Add explicit connection result states: `discovered`, `requesting`, `accepting`, `connected`, `rejected`, `disconnected` and `failed`.

**Exit criteria:** Two physical Android phones, with internet disabled, discover one another, both users accept the connection, exchange a payload in both directions, and display the payload after app restart. A third device should also be able to connect without breaking the first connection if the chosen strategy supports it.

### Phase 2 — Structured alert and multi-hop relay

Replace the free-text prototype with six large category buttons. Add priority selection only where necessary; Critical SOS and Medical actions should be fast. Capture location if available, create the alert envelope, write it to Room, and relay it through connected peers using `P2P_CLUSTER`.

Implement a persistent seen-message table or bounded cache keyed by `alert_id`. The relay path must preserve `origin_id`, increment `hop_count`, enforce `max_hops`, reject expired records and avoid loops. Add pilot logging but avoid storing unnecessary message content in debug logs.

**Exit criteria:** Three or more physical devices can form a relay chain and deliver an alert from device A through B to C. Repeated discovery or reconnection does not create duplicate alerts. Battery and storage limits are recorded.

### Phase 3 — Bridge Node and offline queue

Register a `ConnectivityManager.NetworkCallback` and use WorkManager for retryable bridge uploads. When any device regains usable internet, it should select locally stored `queued_bridge` alerts, upload them with an idempotency key of `alert_id`, and mark them bridged only after server confirmation. Upload retries must be safe if the phone loses signal halfway through a request.

The bridge must be quiet and battery-aware. It should not scan continuously when no alert is pending, and it must use exponential backoff with a maximum retry interval. The UI should show the user that an alert is safely stored, queued, bridged or rejected, without requiring technical knowledge.

### Phase 4 — Backend and Block Office forwarding

Create a Node.js + Express service with SQLite for the pilot. Implement `POST /alerts` with schema validation, signature verification, idempotency and audit records. Implement `GET /alerts?status=pending` for the Block Office dashboard or operational tooling. Add authentication between bridge devices and the API; do not rely only on an unguessable URL.

Forward Critical and High alerts through a configured WhatsApp Business API or Indian SMS gateway. The notification adapter must be replaceable, because provider availability, sender registration, template approval, delivery receipts and cost differ by vendor. The server must record forwarding attempts, provider message IDs, rate limits and failure reasons.

### Phase 5 — User verification and trust controls

Add a low-friction profile: name, village and ward are the minimum pilot fields. Optional phone number can be used for follow-up only with consent. Add device key registration, signed alert envelopes and a basic “source not verified / volunteer verified / official acknowledgement” distinction.

The Block Office should see origin village, time, category, priority, last bridge time and relay path summary. It should not see sensitive identifiers that the pilot does not need. Add anti-spam controls, per-device quotas, duplicate detection and a manual “false alert” review path before punitive action.

### Phase 6 — Bengali-first low-literacy UI and offline map

Set Bengali as the default language, add Hindi and English toggles, and store all UI strings in Android resource files. Use large icons, high-contrast colors, short labels, voice-friendly descriptions and confirmation states. Avoid relying on color alone for Critical/High/Normal priority.

Bundle an offline map for Gazole Block based on an appropriate OpenStreetMap-derived dataset and verify licensing and tile redistribution terms before packaging. The map should show the device’s last known location and alert locations only when the data is locally available; it must not silently attempt live tile fetches.

### Phase 7 — Pilot packaging and evidence-based rollout

Generate a signed APK for controlled side-loading, not public Play Store release, until privacy, operational and safety review is complete. Pilot with volunteers across 10–15 villages, using at least three Android device classes and multiple Android versions. Measure discovery time, connection acceptance rate, delivery success, relay depth, bridge success, battery drain, false positives and user comprehension in Bengali.

Pilot release gates should include a rollback plan, support contact, incident log, lost-device procedure, data retention policy and emergency fallback instructions. SSA must never be presented as a replacement for official emergency numbers or government disaster-response channels.

## 7. Phase 1 repository work plan

The current repository should be migrated in this order:

1. Change user-facing branding from Sanketly to **Sanket Setu Alert (SSA)** while retaining internal package namespaces temporarily to avoid a risky all-at-once rename.
2. Add a new Android-native module or application boundary named `ssa-android`, using Kotlin, Jetpack Compose, Nearby Connections and Room.
3. Extract shared alert schemas, protocol versions, deduplication rules and crypto interfaces into reusable packages.
4. Implement `NearbyTransport` behind the existing transport abstraction; do not make the current raw BLE module the primary SSA transport.
5. Add Phase 1 feature flags so the pilot build exposes only discovery, connection approval and test payload exchange.
6. Keep the existing Expo mobile shell available as a temporary design/reference client until the native Android Phase 1 acceptance test passes.
7. Add physical-device test instructions and a test matrix to the repository before beginning Phase 2.

## 8. Branding and user-facing copy

The main title should be **Sanket Setu Alert** with the short mark **SSA**. The Bengali onboarding message should explain the bridge concept in simple language, for example: “ইন্টারনেট না থাকলেও কাছের ফোনের মাধ্যমে জরুরি বার্তা এগিয়ে যাবে।” The English fallback may say: “Your alert can travel phone-to-phone until it reaches a connected device.”

Avoid claiming that an alert has reached the Block Office unless the backend has returned a confirmed receipt. Use clear states such as **Saved on this phone**, **Waiting for a nearby phone**, **Relayed**, **Internet bridge found**, and **Received by Block Office**.

## 9. Main risks and controls

| Risk | Impact | Control |
|---|---|---|
| Nearby discovery does not work on a device/vendor | High | Test multiple Android versions and OEMs; show manual radio/permission recovery |
| User denies nearby permissions | High | Bengali explanation screen, retry settings action, clear degraded mode |
| Battery drain from continuous discovery | High | Duty cycle after Phase 1, WorkManager for bridge, stop scanning when no work exists |
| Duplicate or looping alerts | High | Persistent `alert_id` deduplication, max hops, expiry and relay logs |
| Spam or malicious false alerts | High | Device quotas, signed origin, rate limits, volunteer/official trust states, review queue |
| Government notification provider failure | High | Pluggable WhatsApp/SMS adapters, retry and dashboard visibility, manual fallback |
| Sensitive data exposure | High | Data minimization, local encryption, retention limits, access control and consent |
| “India’s first” claim cannot be evidenced | Medium | Use pilot wording until independent landscape and legal review are complete |
| Background execution changes across Android releases | High | Native Kotlin, physical-device matrix, foreground/WorkManager strategy, release gating |
| Map licensing or stale location data | Medium | Verify OSM-derived data licence, show last-updated time, permit map-free operation |

## 10. Definition of a successful pilot

SSA Phase 1 is successful when two physical Android phones can discover, mutually accept and exchange a test payload while offline; the app clearly explains permissions and radio state in Bengali; the same build does not falsely claim Block Office delivery; and logs allow the team to reproduce failed discovery or connection. The wider pilot is successful only when a three-device relay, a bridge upload and a Block Office acknowledgement are each demonstrated on physical devices under controlled field conditions.

## 11. Immediate next actions

The immediate implementation order is: first apply the visible SSA branding; second create the Android-native Nearby Connections skeleton; third test two-device discovery with internet disabled; fourth add Room-backed structured alerts and deduplication; and only then connect the bridge API. The raw BLE implementation should remain isolated until the Nearby-based path has been measured against the same acceptance criteria.

## References

[1]: https://developers.google.com/nearby/connections/overview "Google Developers — Nearby Connections Overview"

[2]: https://developers.google.com/nearby/connections/android/get-started "Google Developers — Nearby Connections for Android: Get started"

[3]: https://developer.android.com/blog/posts/upcoming-changes-to-the-nearby-connections-api "Android Developers Blog — Upcoming Changes to the Nearby Connections API"

## 12. Phase 1 implementation checkpoint

Phase 1 implementation has started in the repository. The current checkpoint adds an Android-only `@sanketly/nearby-native` Expo module backed by Google Play Services Nearby Connections and `Strategy.P2P_CLUSTER`. It exposes advertising, discovery, connection approval/rejection, byte payload sending, payload receipt, permission checks and user-visible radio-state errors. The existing mobile provider now routes Android through Nearby, sends the authenticated SSA announce packet after connection, verifies peer identity, and routes encrypted packets through the connected Nearby endpoint.

This checkpoint is **not yet a physical-device acceptance result**. The next required action is to generate an Android development build and test two real phones with internet connectivity disabled but Bluetooth and Wi-Fi radios enabled. Native Kotlin compilation and radio behavior remain release gates.

## 13. Current implementation handoff

The Android Phase 1 skeleton is now being implemented through a local Expo native module named `@sanketly/nearby-native`. It uses Google Play Services Nearby Connections with the `P2P_CLUSTER` strategy and exposes discovery, advertising, connection approval, byte payload send/receive, permission checks and disabled-radio recovery. The existing provider routes Android through this module and keeps the earlier raw-BLE transport as a separate fallback.

Before Phase 2 work begins, the team must create an Android development build and complete the physical two-device test. The sandbox can validate TypeScript, protocol tests, Expo metadata and repository builds, but it has no Android SDK, Gradle installation or attached physical device, so native compilation and radio performance remain explicit acceptance gates.

## 14. Multi-hop relay implementation checkpoint

The SSA mobile provider now implements bounded store-and-forward routing. Each packet retains its original authenticated message envelope; relay nodes update only `hopCount` and `lastHopId`. A node refuses expired or hop-exhausted packets, remembers packet IDs to suppress duplicates, avoids immediately returning a packet to the incoming link or previous hop, prefers a verified destination, and otherwise selects the freshest verified connected Nearby/BLE peer.

Packets without a usable next hop are persisted in `sanketly.relay-queue.v1`. The queue is capped at 512 records and retries with exponential backoff for at most eight attempts. The route layer intentionally does not claim guaranteed delivery: end-to-end acknowledgement, route discovery, congestion control, and cryptographic ratcheting remain later release gates.

The required acceptance test uses three physical Android devices: A and C must be outside direct range while B remains within range of both. A, B and C must approve Nearby connections, A must learn C’s authenticated announcement through B, and an encrypted A-to-C message must be relayed by B without B decrypting it. The test must also cover duplicate packet injection, a disconnected relay, retry backoff, expiry and app restart.

## 15. Android emergency background persistence checkpoint

SSA emergency mode now has an Android foreground-service foundation. When the operator starts nearby mode from the app, the service stores the Nearby service ID and local device name, posts an ongoing notification, keeps the Nearby transport independent from the UI task, uses sticky service restart behavior, re-issues the service after the launcher task is removed, and can restore the last explicit configuration after device boot. Native events are buffered when the JavaScript listener is unavailable and are drained after the app attaches again.

The app also exposes a battery-settings action so the operator can review device-specific power restrictions. The service does not silently toggle Bluetooth, Wi-Fi, permissions, or battery exemptions. Android and OEM policies can still stop or restrict work, so the feature is documented as best-effort persistence rather than an absolute guarantee. Physical acceptance must cover app backgrounding, task swipe, lock screen, radio interruption, process kill, reboot, revoked permissions, notification denial, battery saver, and OEM-specific autostart restrictions.
