package in.sanketsetu.nearby

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SsaNearbyModule : Module() {
  companion object {
    private val STRATEGY = Strategy.P2P_CLUSTER
    private const val MAX_BYTES_PAYLOAD = 32 * 1024
  }

  private var connectionsClient: ConnectionsClient? = null
  private var running = false
  private var serviceId = ""
  private var localName = "SSA device"
  private val discoveredEndpoints = mutableSetOf<String>()
  private val connectedEndpoints = mutableSetOf<String>()

  override fun definition() = ModuleDefinition {
    Name("SsaNearby")
    Events("SsaNearbyEvent")

    AsyncFunction("start") { requestedServiceId: String, requestedLocalName: String ->
      require(requestedServiceId.isNotBlank()) { "Nearby service ID is required" }
      require(requestedLocalName.isNotBlank()) { "Nearby local name is required" }
      startNearby(requestedServiceId, requestedLocalName)
    }

    AsyncFunction("acceptConnection") { endpointId: String ->
      require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
      val client = requireNotNull(connectionsClient) { "Nearby transport is not started" }
      client.acceptConnection(endpointId, payloadCallback)
        .addOnFailureListener { emitStatus("error", "Unable to accept nearby connection: ${it.message ?: "unknown error"}") }
    }

    AsyncFunction("rejectConnection") { endpointId: String ->
      require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
      connectionsClient?.rejectConnection(endpointId)
    }

    AsyncFunction("sendPayload") { endpointId: String, bytes: List<Int> ->
      require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
      require(bytes.isNotEmpty()) { "Nearby payload cannot be empty" }
      require(bytes.size <= MAX_BYTES_PAYLOAD) { "Nearby bytes payload exceeds 32 KB" }
      val client = requireNotNull(connectionsClient) { "Nearby transport is not started" }
      val payload = Payload.fromBytes(bytes.map { it.coerceIn(0, 255).toByte() }.toByteArray())
      client.sendPayload(endpointId, payload)
        .addOnFailureListener { emitStatus("error", "Nearby payload delivery failed: ${it.message ?: "unknown error"}") }
    }

    AsyncFunction("stop") {
      stopNearby()
    }
  }

  private fun context(): Context = requireNotNull(appContext.reactContext) { "React context unavailable" }

  private fun startNearby(requestedServiceId: String, requestedLocalName: String) {
    if (running) stopNearby()
    val ctx = context()
    serviceId = requestedServiceId
    localName = requestedLocalName

    val bluetoothManager = ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    val bluetoothAdapter = bluetoothManager.adapter
    if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
      emitStatus("error", "Bluetooth is disabled. Please turn on Bluetooth and try again.")
      return
    }
    if (!hasRequiredPermissions(ctx)) {
      emitStatus("error", "Nearby permissions are required for SSA discovery.")
      return
    }
    val wifiManager = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    if (wifiManager != null && !wifiManager.isWifiEnabled) {
      emitStatus("error", "Wi-Fi is disabled. Please turn on Wi-Fi and try again.")
      return
    }

    connectionsClient = Nearby.getConnectionsClient(ctx)
    running = true
    discoveredEndpoints.clear()
    connectedEndpoints.clear()
    emitStatus("starting", "Starting SSA Nearby discovery and advertising")

    val advertisingOptions = com.google.android.gms.nearby.connection.AdvertisingOptions.Builder()
      .setStrategy(STRATEGY)
      .build()
    val discoveryOptions = DiscoveryOptions.Builder()
      .setStrategy(STRATEGY)
      .build()

    val client = connectionsClient ?: return
    client.startAdvertising(localName, serviceId, connectionLifecycleCallback, advertisingOptions)
      .addOnFailureListener { emitStatus("error", "SSA advertising failed: ${it.message ?: "unknown error"}") }
    client.startDiscovery(serviceId, endpointDiscoveryCallback, discoveryOptions)
      .addOnFailureListener { emitStatus("error", "SSA discovery failed: ${it.message ?: "unknown error"}") }
      .addOnSuccessListener { emitStatus("ready", "SSA Nearby discovery is active") }
  }

  private fun stopNearby() {
    connectionsClient?.stopAdvertising()
    connectionsClient?.stopDiscovery()
    connectionsClient?.stopAllEndpoints()
    connectionsClient = null
    discoveredEndpoints.clear()
    connectedEndpoints.clear()
    running = false
    emitStatus("stopped", "SSA Nearby transport stopped")
  }

  private fun hasRequiredPermissions(ctx: Context): Boolean {
    val required = mutableListOf<String>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      required += Manifest.permission.BLUETOOTH_SCAN
      required += Manifest.permission.BLUETOOTH_CONNECT
      required += Manifest.permission.BLUETOOTH_ADVERTISE
    } else {
      required += Manifest.permission.ACCESS_FINE_LOCATION
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      required += Manifest.permission.NEARBY_WIFI_DEVICES
    }
    return required.all { ContextCompat.checkSelfPermission(ctx, it) == PackageManager.PERMISSION_GRANTED }
  }

  private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: com.google.android.gms.nearby.connection.DiscoveredEndpointInfo) {
      if (!running || !discoveredEndpoints.add(endpointId)) return
      emitPeer(endpointId, info.endpointName, "discovered")
      connectionsClient?.requestConnection(localName, endpointId, connectionLifecycleCallback)
        ?.addOnSuccessListener { emitPeer(endpointId, info.endpointName, "connecting") }
        ?.addOnFailureListener { emitPeer(endpointId, info.endpointName, "rejected"); emitStatus("error", "Nearby connection request failed: ${it.message ?: "unknown error"}") }
    }

    override fun onEndpointLost(endpointId: String) {
      discoveredEndpoints.remove(endpointId)
      connectedEndpoints.remove(endpointId)
      emitPeer(endpointId, endpointId, "disconnected")
    }
  }

  private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, connectionInfo: com.google.android.gms.nearby.connection.ConnectionInfo) {
      emit("connection-request", mapOf(
        "endpointId" to endpointId,
        "name" to connectionInfo.endpointName,
        "authenticationToken" to connectionInfo.authenticationToken,
      ))
    }

    override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
      val name = discoveredEndpoints.firstOrNull { it == endpointId } ?: endpointId
      if (resolution.status.isSuccess) {
        connectedEndpoints.add(endpointId)
        emitPeer(endpointId, name, "connected")
        emitStatus("ready", "SSA Nearby connection established")
      } else {
        connectedEndpoints.remove(endpointId)
        emitPeer(endpointId, name, "rejected")
        emitStatus("error", "Nearby connection rejected: ${resolution.status.statusCode}")
      }
    }

    override fun onDisconnected(endpointId: String) {
      connectedEndpoints.remove(endpointId)
      emitPeer(endpointId, endpointId, "disconnected")
    }
  }

  private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      val bytes = payload.asBytes() ?: return
      if (bytes.size > MAX_BYTES_PAYLOAD) return
      emit("payload", mapOf("endpointId" to endpointId, "bytes" to bytes.map { it.toInt() and 0xff }))
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
      // Bytes payloads are small and are delivered atomically to the JS protocol layer.
    }
  }

  private fun emitPeer(endpointId: String, name: String, state: String) {
    emit("peer", mapOf(
      "peer" to mapOf(
        "endpointId" to endpointId,
        "name" to name,
        "state" to state,
        "discoveredAt" to System.currentTimeMillis(),
        "lastSeenAt" to System.currentTimeMillis(),
      ),
    ))
  }

  private fun emitStatus(state: String, detail: String) {
    emit("status", mapOf("state" to state, "detail" to detail))
  }

  private fun emit(type: String, payload: Map<String, Any?>) {
    sendEvent("SsaNearbyEvent", mapOf("type" to type) + payload)
  }
}
