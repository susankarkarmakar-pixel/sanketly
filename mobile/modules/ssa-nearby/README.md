# SSA Nearby Native Module

This local Expo module is the Android Phase 1 transport boundary for Sanket Setu Alert. It wraps Google Play Services Nearby Connections with `Strategy.P2P_CLUSTER`, allowing an SSA device to advertise and discover at the same time.

## Native API

The JavaScript bridge exposes `start(serviceId, localName)`, `stop()`, `acceptConnection(endpointId)`, `rejectConnection(endpointId)`, `sendPayload(endpointId, bytes)`, and an event subscription for `SsaNearbyEvent`.

Events include `status`, `peer`, `connection-request`, and `payload`. Payloads are byte arrays and must stay at or below 32 KB. The SSA provider sends the authenticated announce packet immediately after a connection is accepted, then sends encrypted protocol packets only after the recipient identity is verified.

## Permissions and radio state

The app requests Bluetooth scan/connect/advertise permissions on Android 12+, nearby Wi-Fi permission on Android 13+, and the appropriate location permission on older releases. Bluetooth and Wi-Fi must be enabled by the user; the module does not toggle radios automatically. A denied permission or disabled radio produces an actionable status event rather than a false ready state.

## Phase 1 device test

Install the development build on two physical Android phones. Turn off mobile data and Wi-Fi internet access while leaving the Wi-Fi and Bluetooth radios enabled. Start discovery on both devices, accept the connection request on both sides, confirm the peer appears as connected, and exchange the test announce/payload. Repeat after stopping and restarting the app. Record device model, Android version, discovery time, connection result, payload result, and battery impact.

The Linux development environment can type-check the bridge and run protocol tests, but it cannot compile the Android native module or validate radio behavior. A physical Android build is required before claiming Phase 1 connectivity.
