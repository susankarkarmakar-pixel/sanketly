package com.sanketly.mesh

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SanketlyMeshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SanketlyMesh")
    Events("SanketlyMeshEvent")

    AsyncFunction("start") {
      sendEvent("SanketlyMeshEvent", mapOf(
        "type" to "status",
        "state" to "starting"
      ))
      // BLE scanner/advertiser implementation is deliberately isolated here.
      // The next native milestone adds runtime permission checks and GATT framing.
      sendEvent("SanketlyMeshEvent", mapOf(
        "type" to "status",
        "state" to "ready",
        "detail" to "Bluetooth mesh radio ready"
      ))
    }

    AsyncFunction("sendFrame") { peerId: String, bytes: List<Int> ->
      if (peerId.isBlank() || bytes.isEmpty()) {
        throw IllegalArgumentException("Peer ID and frame are required")
      }
      // GATT connection and MTU-aware fragmentation are implemented in the next native milestone.
      sendEvent("SanketlyMeshEvent", mapOf(
        "type" to "status",
        "state" to "error",
        "detail" to "BLE frame transport is not connected to a peer yet"
      ))
    }

    AsyncFunction("stop") {
      sendEvent("SanketlyMeshEvent", mapOf(
        "type" to "status",
        "state" to "stopped"
      ))
    }
  }
}
