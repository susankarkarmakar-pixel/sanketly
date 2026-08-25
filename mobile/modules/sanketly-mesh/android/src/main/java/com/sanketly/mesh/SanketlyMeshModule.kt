package com.sanketly.mesh

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.ParcelUuid
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.util.UUID
import kotlin.math.min

class SanketlyMeshModule : Module() {
  companion object {
    private val SERVICE_UUID = UUID.fromString("9E1A0001-6C1B-4D0B-9B0A-53414E4B4554")
    private val RX_UUID = UUID.fromString("9E1A0002-6C1B-4D0B-9B0A-53414E4B4554")
    private val TX_UUID = UUID.fromString("9E1A0003-6C1B-4D0B-9B0A-53414E4B4554")
    private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB")
    private const val CHUNK_PAYLOAD_BYTES = 160
    private const val CHUNK_HEADER_BYTES = 13
    private const val MAX_FRAME_BYTES = 4096
  }

  private val handler = Handler(Looper.getMainLooper())
  private var adapter: BluetoothAdapter? = null
  private var scanner: BluetoothLeScanner? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var gattServer: BluetoothGattServer? = null
  private var rxCharacteristic: BluetoothGattCharacteristic? = null
  private var txCharacteristic: BluetoothGattCharacteristic? = null
  private var localAnnouncement = ByteArray(0)
  private var frameCounter = 0
  private val gattByLink = mutableMapOf<String, BluetoothGatt>()
  private val txByLink = mutableMapOf<String, BluetoothGattCharacteristic>()
  private val subscribedCentrals = mutableSetOf<String>()
  private val assemblies = mutableMapOf<String, FrameAssembly>()

  override fun definition() = ModuleDefinition {
    Name("SanketlyMesh")
    Events("SanketlyMeshEvent")

    AsyncFunction("start") { announceBytes: List<Int> ->
      if (announceBytes.isEmpty()) throw IllegalArgumentException("A local announce frame is required")
      localAnnouncement = announceBytes.map { it.coerceIn(0, 255).toByte() }.toByteArray()
      startBle()
    }

    AsyncFunction("sendFrame") { linkId: String, bytes: List<Int> ->
      if (linkId.isBlank() || bytes.isEmpty()) throw IllegalArgumentException("Link ID and frame are required")
      val frame = bytes.map { it.coerceIn(0, 255).toByte() }.toByteArray()
      if (frame.size > MAX_FRAME_BYTES) throw IllegalArgumentException("Frame exceeds maximum size")
      sendFrame(linkId, frame)
    }

    AsyncFunction("stop") {
      stopBle()
    }
  }

  private fun context(): Context = requireNotNull(appContext.reactContext) { "React context unavailable" }

  private fun startBle() {
    val bluetoothManager = context().getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    adapter = bluetoothManager.adapter
    val bluetoothAdapter = adapter
    if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
      emitStatus("error", "Bluetooth is unavailable or disabled")
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasNearbyPermissions()) {
      emitStatus("error", "Nearby Bluetooth permissions are required")
      return
    }

    emitStatus("starting", "Starting Android BLE scanner, advertiser, and GATT server")
    startGattServer(bluetoothManager)
    scanner = bluetoothAdapter.bluetoothLeScanner
    val scanFilter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
    scanner?.startScan(listOf(scanFilter), ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback)
    advertiser = bluetoothAdapter.bluetoothLeAdvertiser
    advertiser?.startAdvertising(
      AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY).setConnectable(true).setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM).build(),
      AdvertiseData.Builder().setIncludeDeviceName(false).addServiceUuid(android.os.ParcelUuid(SERVICE_UUID)).build(),
      advertiseCallback,
    )
    emitStatus("ready", "Android BLE discovery and GATT delivery are active")
  }

  private fun stopBle() {
    scanner?.stopScan(scanCallback)
    advertiser?.stopAdvertising(advertiseCallback)
    gattByLink.values.forEach { it.close() }
    gattByLink.clear()
    txByLink.clear()
    subscribedCentrals.clear()
    gattServer?.close()
    gattServer = null
    assemblies.clear()
    emitStatus("stopped", "Android BLE mesh stopped")
  }

  private fun hasNearbyPermissions(): Boolean {
    val ctx = context()
    return ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED
  }

  private fun startGattServer(bluetoothManager: BluetoothManager) {
    gattServer = bluetoothManager.openGattServer(context(), gattServerCallback)
    val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    rxCharacteristic = BluetoothGattCharacteristic(RX_UUID, BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE, BluetoothGattCharacteristic.PERMISSION_WRITE)
    txCharacteristic = BluetoothGattCharacteristic(TX_UUID, BluetoothGattCharacteristic.PROPERTY_NOTIFY, BluetoothGattCharacteristic.PERMISSION_READ)
    txCharacteristic?.addDescriptor(BluetoothGattDescriptor(CCCD_UUID, BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
    service.addCharacteristic(rxCharacteristic)
    service.addCharacteristic(txCharacteristic)
    gattServer?.addService(service)
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val device = result.device
      val linkId = device.address
      if (gattByLink.containsKey(linkId)) return
      emitPeer(linkId, linkId, "connecting", false)
      if (!gattByLink.containsKey(linkId)) {
        val gatt = device.connectGatt(context(), false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        gattByLink[linkId] = gatt
      }
    }

    override fun onScanFailed(errorCode: Int) {
      emitStatus("error", "BLE scan failed: $errorCode")
    }
  }

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartFailure(errorCode: Int) {
      emitStatus("error", "BLE advertising failed: $errorCode")
    }
  }

  private val gattCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
      val linkId = gatt.device.address
      if (newState == BluetoothGatt.STATE_CONNECTED) {
        emitPeer(linkId, linkId, "connected", false)
        gatt.discoverServices()
      } else if (newState == BluetoothGatt.STATE_DISCONNECTED) {
        txByLink.remove(linkId)
        gattByLink.remove(linkId)
        gatt.close()
        emitPeer(linkId, linkId, "unavailable", false)
      }
    }

    override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS) {
        emitStatus("error", "GATT service discovery failed: $status")
        return
      }
      val service = gatt.getService(SERVICE_UUID)
      val rx = service?.getCharacteristic(RX_UUID)
      val tx = service?.getCharacteristic(TX_UUID)
      if (rx == null || tx == null) {
        emitStatus("error", "Sanketly GATT characteristics are missing")
        return
      }
      txByLink[gatt.device.address] = rx
      gatt.setCharacteristicNotification(tx, true)
      sendFrame(gatt.device.address, localAnnouncement)
    }

    override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      val bytes = characteristic.value ?: return
      consumeChunk(gatt.device.address, bytes)
    }
  }

  private val gattServerCallback = object : BluetoothGattServerCallback() {
    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      val linkId = device.address
      if (newState == BluetoothGatt.STATE_CONNECTED) emitPeer(linkId, linkId, "connected", false)
      if (newState == BluetoothGatt.STATE_DISCONNECTED) {
        subscribedCentrals.remove(linkId)
        emitPeer(linkId, linkId, "unavailable", false)
      }
    }

    override fun onDescriptorWriteRequest(device: BluetoothDevice, requestId: Int, descriptor: BluetoothGattDescriptor, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
      if (descriptor.uuid == CCCD_UUID && value.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)) subscribedCentrals.add(device.address)
      if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
      if (descriptor.uuid == CCCD_UUID) sendFrame(device.address, localAnnouncement)
    }

    override fun onCharacteristicWriteRequest(device: BluetoothDevice, requestId: Int, characteristic: BluetoothGattCharacteristic, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
      if (characteristic.uuid != RX_UUID || offset != 0) {
        if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED, 0, null)
        return
      }
      consumeChunk(device.address, value)
      if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
    }
  }

  private fun sendFrame(linkId: String, frame: ByteArray) {
    if (frame.isEmpty()) return
    val chunks = makeChunks(nextFrameId(), frame)
    val gatt = gattByLink[linkId]
    val clientCharacteristic = txByLink[linkId]
    if (gatt != null && clientCharacteristic != null) {
      for (chunk in chunks) {
        clientCharacteristic.value = chunk
        clientCharacteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        gatt.writeCharacteristic(clientCharacteristic)
      }
      return
    }
    val device = adapter?.getRemoteDevice(linkId)
    val serverCharacteristic = txCharacteristic
    if (device != null && serverCharacteristic != null && subscribedCentrals.contains(linkId)) {
      for (chunk in chunks) {
        serverCharacteristic.value = chunk
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          gattServer?.notifyCharacteristicChanged(device, serverCharacteristic, false, chunk)
        } else {
          serverCharacteristic.value = chunk
          @Suppress("DEPRECATION")
          gattServer?.notifyCharacteristicChanged(device, serverCharacteristic, false)
        }
      }
    }
  }

  private fun makeChunks(frameId: Int, frame: ByteArray): List<ByteArray> {
    val totalChunks = (frame.size + CHUNK_PAYLOAD_BYTES - 1) / CHUNK_PAYLOAD_BYTES
    require(totalChunks in 1..255)
    return (0 until totalChunks).map { index ->
      val start = index * CHUNK_PAYLOAD_BYTES
      val end = min(start + CHUNK_PAYLOAD_BYTES, frame.size)
        val header = ByteBuffer.allocate(CHUNK_HEADER_BYTES).put(0x42.toByte()).put(0x43.toByte()).put(1.toByte()).putInt(frameId).put(totalChunks.toByte()).put(index.toByte()).putInt(frame.size).array()
      header + frame.copyOfRange(start, end)
    }
  }

  private fun consumeChunk(linkId: String, chunk: ByteArray) {
    if (chunk.size < CHUNK_HEADER_BYTES || chunk[0] != 0x42.toByte() || chunk[1] != 0x43.toByte() || chunk[2] != 1.toByte()) return
    val buffer = ByteBuffer.wrap(chunk)
    buffer.position(3)
    val frameId = buffer.int
    val totalChunks = buffer.get().toInt() and 0xff
    val index = buffer.get().toInt() and 0xff
    val totalLength = buffer.int
    if (totalChunks <= 0 || index >= totalChunks || totalLength <= 0 || totalLength > MAX_FRAME_BYTES) return
    val key = "$linkId:$frameId"
    val assembly = assemblies.getOrPut(key) { FrameAssembly(totalChunks, totalLength) }
    assembly.chunks[index] = chunk.copyOfRange(CHUNK_HEADER_BYTES, chunk.size)
    if (assembly.chunks.size != totalChunks) return
    val frame = ByteArray(totalLength)
    var offset = 0
    for (chunkIndex in 0 until totalChunks) {
      val part = assembly.chunks[chunkIndex] ?: return
      if (offset + part.size > frame.size) return
      part.copyInto(frame, offset)
      offset += part.size
    }
    assemblies.remove(key)
    if (offset != totalLength) return
    sendEvent("SanketlyMeshEvent", mapOf("type" to "frame", "linkId" to linkId, "bytes" to frame.map { it.toInt() and 0xff }))
  }

  private fun nextFrameId(): Int {
    frameCounter += 1
    return frameCounter
  }

  private fun emitStatus(state: String, detail: String) {
    sendEvent("SanketlyMeshEvent", mapOf("type" to "status", "state" to state, "detail" to detail))
  }

  private fun emitPeer(linkId: String, peerId: String, connectionState: String, verified: Boolean) {
    sendEvent("SanketlyMeshEvent", mapOf("type" to "peer", "peer" to mapOf("linkId" to linkId, "peerId" to peerId, "lastSeenAt" to System.currentTimeMillis(), "verified" to verified, "connectionState" to connectionState)))
  }

  private data class FrameAssembly(val totalChunks: Int, val totalLength: Int, val chunks: MutableMap<Int, ByteArray> = mutableMapOf())
}
