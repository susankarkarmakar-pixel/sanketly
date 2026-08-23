import CoreBluetooth
import ExpoModulesCore

public final class SanketlyMeshModule: Module, CBCentralManagerDelegate, CBPeripheralManagerDelegate, CBPeripheralDelegate {
  private let serviceUUID = CBUUID(string: "9E1A0001-6C1B-4D0B-9B0A-53414E4B4554")
  private let rxUUID = CBUUID(string: "9E1A0002-6C1B-4D0B-9B0A-53414E4B4554")
  private let txUUID = CBUUID(string: "9E1A0003-6C1B-4D0B-9B0A-53414E4B4554")
  private let chunkPayloadBytes = 160
  private let maxFrameBytes = 4096

  private var centralManager: CBCentralManager?
  private var peripheralManager: CBPeripheralManager?
  private var localRXCharacteristic: CBMutableCharacteristic?
  private var localTXCharacteristic: CBMutableCharacteristic?
  private var localAnnouncement = Data()
  private var peripheralsByLink = [String: CBPeripheral]()
  private var rxCharacteristicsByLink = [String: CBCharacteristic]()
  private var txCharacteristicsByLink = [String: CBCharacteristic]()
  private var centralByLink = [String: CBCentral]()
  private var subscribedCentralByLink = [String: CBCentral]()
  private var assemblies = [String: FrameAssembly]()
  private var frameCounter: UInt32 = 0

  public func definition() -> ModuleDefinition {
    Name("SanketlyMesh")
    Events("SanketlyMeshEvent")

    AsyncFunction("start") { (announceBytes: [Int]) in
      guard !announceBytes.isEmpty else {
        throw NSError(domain: "SanketlyMesh", code: 1, userInfo: [NSLocalizedDescriptionKey: "A local announce frame is required"])
      }
      self.localAnnouncement = Data(announceBytes.map { UInt8(clamping: $0) })
      await MainActor.run {
        self.centralManager = CBCentralManager(
          delegate: self,
          queue: nil,
          options: [CBCentralManagerOptionRestoreIdentifierKey: "sanketly.central"]
        )
        self.peripheralManager = CBPeripheralManager(
          delegate: self,
          queue: nil,
          options: [CBPeripheralManagerOptionRestoreIdentifierKey: "sanketly.peripheral"]
        )
        self.emitStatus("starting", detail: "Starting CoreBluetooth discovery and advertising")
      }
    }

    AsyncFunction("sendFrame") { (linkId: String, bytes: [Int]) in
      guard !linkId.isEmpty, !bytes.isEmpty else {
        throw NSError(domain: "SanketlyMesh", code: 2, userInfo: [NSLocalizedDescriptionKey: "Link ID and frame are required"])
      }
      guard bytes.count <= self.maxFrameBytes else {
        throw NSError(domain: "SanketlyMesh", code: 3, userInfo: [NSLocalizedDescriptionKey: "Frame exceeds maximum size"])
      }
      self.sendFrame(linkId: linkId, data: Data(bytes.map { UInt8(clamping: $0) }))
    }

    AsyncFunction("stop") { () in
      await MainActor.run {
        self.centralManager?.stopScan()
        self.peripheralsByLink.values.forEach { self.centralManager?.cancelPeripheralConnection($0) }
        self.peripheralManager?.stopAdvertising()
        self.peripheralManager?.removeAllServices()
        self.peripheralsByLink.removeAll()
        self.rxCharacteristicsByLink.removeAll()
        self.txCharacteristicsByLink.removeAll()
        self.centralByLink.removeAll()
        self.subscribedCentralByLink.removeAll()
        self.assemblies.removeAll()
        self.emitStatus("stopped", detail: "CoreBluetooth mesh stopped")
      }
    }
  }

  public func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard central.state == .poweredOn else {
      emitStatus("error", detail: "Bluetooth central is unavailable or disabled")
      return
    }
    central.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    emitStatus("ready", detail: "Bluetooth central scanning")
  }

  public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard peripheral.state == .poweredOn else {
      emitStatus("error", detail: "Bluetooth peripheral is unavailable or disabled")
      return
    }
    let rx = CBMutableCharacteristic(
      type: rxUUID,
      properties: [.write, .writeWithoutResponse],
      value: nil,
      permissions: [.writeable]
    )
    let tx = CBMutableCharacteristic(
      type: txUUID,
      properties: [.notify],
      value: nil,
      permissions: [.readable]
    )
    localRXCharacteristic = rx
    localTXCharacteristic = tx
    let service = CBMutableService(type: serviceUUID, primary: true)
    service.characteristics = [rx, tx]
    peripheralManager?.add(service)
    peripheralManager?.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataLocalNameKey: "Sanketly"
    ])
    emitStatus("ready", detail: "Bluetooth peripheral advertising")
  }

  public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    let linkId = peripheral.identifier.uuidString
    peripheralsByLink[linkId] = peripheral
    peripheral.delegate = self
    emitPeer(linkId: linkId, peerId: linkId, connectionState: "connecting", verified: false)
    central.connect(peripheral, options: [CBConnectPeripheralOptionNotifyOnDisconnectionKey: true])
  }

  public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    let linkId = peripheral.identifier.uuidString
    centralByLink[linkId] = central
    emitPeer(linkId: linkId, peerId: linkId, connectionState: "connected", verified: false)
    peripheral.discoverServices([serviceUUID])
  }

  public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    let linkId = peripheral.identifier.uuidString
    rxCharacteristicsByLink.removeValue(forKey: linkId)
    txCharacteristicsByLink.removeValue(forKey: linkId)
    emitPeer(linkId: linkId, peerId: linkId, connectionState: "unavailable", verified: false)
  }

  public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard error == nil, let service = peripheral.services?.first(where: { $0.uuid == serviceUUID }) else {
      emitStatus("error", detail: "Sanketly GATT service discovery failed")
      return
    }
    peripheral.discoverCharacteristics([rxUUID, txUUID], for: service)
  }

  public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard error == nil else {
      emitStatus("error", detail: "Sanketly GATT characteristic discovery failed")
      return
    }
    let linkId = peripheral.identifier.uuidString
    for characteristic in service.characteristics ?? [] {
      if characteristic.uuid == rxUUID { rxCharacteristicsByLink[linkId] = characteristic }
      if characteristic.uuid == txUUID {
        txCharacteristicsByLink[linkId] = characteristic
        peripheral.setNotifyValue(true, for: characteristic)
      }
    }
    sendFrame(linkId: linkId, data: localAnnouncement)
  }

  public func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
    if let error {
      emitStatus("error", detail: "BLE notifications failed: \(error.localizedDescription)")
    }
  }

  public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard error == nil, let value = characteristic.value else { return }
    consumeChunk(linkId: peripheral.identifier.uuidString, data: value)
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
    guard characteristic.uuid == txUUID else { return }
    let linkId = central.identifier.uuidString
    subscribedCentralByLink[linkId] = central
    emitPeer(linkId: linkId, peerId: linkId, connectionState: "connected", verified: false)
    sendFrameToSubscribedCentral(linkId: linkId, data: localAnnouncement)
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
    subscribedCentralByLink.removeValue(forKey: central.identifier.uuidString)
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      guard request.characteristic.uuid == rxUUID, let value = request.value else {
        peripheral.respond(to: request, withResult: .requestNotSupported)
        continue
      }
      consumeChunk(linkId: request.central.identifier.uuidString, data: value)
      peripheral.respond(to: request, withResult: .success)
    }
  }

  public func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
    emitStatus("starting", detail: "CoreBluetooth central state restored")
  }

  public func peripheralManager(_ peripheral: CBPeripheralManager, willRestoreState dict: [String: Any]) {
    emitStatus("starting", detail: "CoreBluetooth peripheral state restored")
  }

  private func sendFrame(linkId: String, data: Data) {
    guard !data.isEmpty else { return }
    let frameId = nextFrameId()
    let chunks = makeChunks(frameId: frameId, data: data)
    if let peripheral = peripheralsByLink[linkId], let characteristic = rxCharacteristicsByLink[linkId] {
      for chunk in chunks {
        peripheral.writeValue(chunk, for: characteristic, type: .withoutResponse)
      }
      return
    }
    for chunk in chunks { sendChunkToSubscribedCentral(linkId: linkId, chunk: chunk) }
  }

  private func sendChunkToSubscribedCentral(linkId: String, chunk: Data) {
    guard let peripheralManager, let characteristic = localTXCharacteristic, let central = subscribedCentralByLink[linkId] else { return }
    _ = peripheralManager.updateValue(chunk, for: characteristic, onSubscribedCentrals: [central])
  }

  private func sendFrameToSubscribedCentral(linkId: String, data: Data) {
    let frameId = nextFrameId()
    for chunk in makeChunks(frameId: frameId, data: data) { sendChunkToSubscribedCentral(linkId: linkId, chunk: chunk) }
  }

  private func makeChunks(frameId: UInt32, data: Data) -> [Data] {
    let totalChunks = UInt8((data.count + chunkPayloadBytes - 1) / chunkPayloadBytes)
    var chunks = [Data]()
    for index in 0..<Int(totalChunks) {
      let start = index * chunkPayloadBytes
      let end = min(start + chunkPayloadBytes, data.count)
      let payload = data.subdata(in: start..<end)
      var header = Data([0x42, 0x43, 1, UInt8((frameId >> 24) & 0xff), UInt8((frameId >> 16) & 0xff), UInt8((frameId >> 8) & 0xff), UInt8(frameId & 0xff), totalChunks, UInt8(index), UInt8((data.count >> 24) & 0xff), UInt8((data.count >> 16) & 0xff), UInt8((data.count >> 8) & 0xff), UInt8(data.count & 0xff)])
      header.append(payload)
      chunks.append(header)
    }
    return chunks
  }

  private func consumeChunk(linkId: String, data: Data) {
    guard data.count >= 13, data[0] == 0x42, data[1] == 0x43, data[2] == 1 else { return }
    let frameId = UInt32(data[3]) << 24 | UInt32(data[4]) << 16 | UInt32(data[5]) << 8 | UInt32(data[6])
    let totalChunks = Int(data[7])
    let index = Int(data[8])
    let totalLength = Int(data[9]) << 24 | Int(data[10]) << 16 | Int(data[11]) << 8 | Int(data[12])
    guard totalChunks > 0, index < totalChunks, totalLength > 0, totalLength <= maxFrameBytes else { return }
    let key = "\(linkId):\(frameId)"
    var assembly = assemblies[key] ?? FrameAssembly(totalChunks: totalChunks, totalLength: totalLength)
    assembly.chunks[index] = data.subdata(in: 13..<data.count)
    assemblies[key] = assembly
    guard assembly.chunks.count == totalChunks else { return }
    var frame = Data()
    for chunkIndex in 0..<totalChunks {
      guard let chunk = assembly.chunks[chunkIndex] else { return }
      frame.append(chunk)
    }
    assemblies.removeValue(forKey: key)
    guard frame.count >= totalLength else { return }
    sendEvent("SanketlyMeshEvent", ["type": "frame", "linkId": linkId, "bytes": Array(frame.prefix(totalLength))])
  }

  private func emitPeer(linkId: String, peerId: String, connectionState: String, verified: Bool) {
    sendEvent("SanketlyMeshEvent", [
      "type": "peer",
      "peer": [
        "linkId": linkId,
        "peerId": peerId,
        "lastSeenAt": Int(Date().timeIntervalSince1970 * 1000),
        "verified": verified,
        "connectionState": connectionState
      ]
    ])
  }

  private func emitStatus(_ state: String, detail: String) {
    sendEvent("SanketlyMeshEvent", ["type": "status", "state": state, "detail": detail])
  }

  private func nextFrameId() -> UInt32 {
    frameCounter &+= 1
    return frameCounter
  }

  private struct FrameAssembly {
    let totalChunks: Int
    let totalLength: Int
    var chunks = [Int: Data]()
  }
}
