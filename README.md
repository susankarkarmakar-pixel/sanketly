# Sanketly

**Tagline:** The Future of Communication, Built in India. Designed for the World.

A privacy-first, end-to-end encrypted messaging app. Currently implemented: passwordless identity/auth, real-time transport, E2E encryption via `@wireapp/proteus`, group messaging, TTL-based offline queueing, and the first React Native mobile foundation for nearby mesh delivery.

## Mobile foundation

The `mobile/` package contains the Expo/React Native shell, secure local peer identity storage, durable local outbox, mesh status UI, and a native Swift/Kotlin module boundary. Shared packet framing, TTL/hop rules, deduplication, delivery states, and transport contracts live in `packages/protocol` and `packages/domain`.

The current native module is a foundation rather than a finished offline network: it exposes lifecycle and framed-packet send hooks, while production BLE scanning, advertising, GATT connections, MTU-aware fragmentation, background restoration, and secure session integration remain the next milestone. The UI labels local development messages as queued and does not falsely report BLE delivery.

## Build Approach

Solo dev + Google, developed on GitHub.
