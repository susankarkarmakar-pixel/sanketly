import CoreBluetooth
import ExpoModulesCore

public final class SanketlyMeshModule: Module, CBCentralManagerDelegate, CBPeripheralManagerDelegate {
  private var centralManager: CBCentralManager?
  private var peripheralManager: CBPeripheralManager?
  private let serviceUUID = CBUUID(string: "9E1A0001-6C1B-4D0B-9B0A-53414E4B4554")

  public func definition() -> ModuleDefinition {
    Name("SanketlyMesh")
    Events("SanketlyMeshEvent")

    AsyncFunction("start") { () in
      await MainActor.run {
        self.centralManager = CBCentralManager(delegate: self, queue: nil,
                                               options: [CBCentralManagerOptionShowPowerAlertKey: true])
        self.peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
        self.sendEvent("SanketlyMeshEvent", [
          "type": "status",
          "state": "starting"
        ])
      }
    }

    AsyncFunction("sendFrame") { (peerId: String, bytes: [Int]) in
      guard !peerId.isEmpty, !bytes.isEmpty else {
        throw NSError(domain: "SanketlyMesh", code: 1, userInfo: [NSLocalizedDescriptionKey: "Peer ID and frame are required"])
      }
      // GATT connection and MTU-aware fragmentation are implemented in the next native milestone.
      self.sendEvent("SanketlyMeshEvent", [
        "type": "status",
        "state": "error",
        "detail": "BLE frame transport is not connected to a peer yet"
      ])
    }

    AsyncFunction("stop") { () in
      await MainActor.run {
        self.centralManager?.stopScan()
        self.centralManager = nil
        self.peripheralManager = nil
        self.sendEvent("SanketlyMeshEvent", [
          "type": "status",
          "state": "stopped"
        ])
      }
    }
  }

  public func centralManagerDidUpdateState(_ central: CBCentralManager) {
    let ready = central.state == .poweredOn
    if ready {
      central.scanForPeripherals(withServices: [serviceUUID], options: [
        CBCentralScanOptionAllowDuplicatesKey: false
      ])
    }
    sendEvent("SanketlyMeshEvent", [
      "type": "status",
      "state": ready ? "ready" : "error",
      "detail": ready ? "Bluetooth mesh radio ready" : "Bluetooth is unavailable or disabled"
    ])
  }

  public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard peripheral.state == .poweredOn else { return }
    sendEvent("SanketlyMeshEvent", [
      "type": "status",
      "state": "ready",
      "detail": "Bluetooth peripheral advertising can start"
    ])
  }
}
