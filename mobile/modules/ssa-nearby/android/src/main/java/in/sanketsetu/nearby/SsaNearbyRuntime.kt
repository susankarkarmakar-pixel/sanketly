package in.sanketsetu.nearby

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import org.json.JSONArray
import org.json.JSONObject

internal object SsaNearbyRuntime {
  private const val PREFS = "ssa_nearby_runtime"
  private const val SERVICE_ID_KEY = "serviceId"
  private const val LOCAL_NAME_KEY = "localName"
  private const val PENDING_EVENTS_KEY = "pendingEvents"
  private const val MAX_BYTES_PAYLOAD = 32 * 1024
  private val STRATEGY = Strategy.P2P_CLUSTER

  private var connectionsClient: ConnectionsClient? = null
  private var running = false
  private var currentServiceId = ""
  private var currentLocalName = "SSA device"
  private var eventSink: ((Map<String, Any?>) -> Unit)? = null
  private val discoveredEndpoints = mutableSetOf<String>()
  private val connectedEndpoints = mutableSetOf<String>()

  fun attach(context: Context, sink: (Map<String, Any?>) -> Unit) {
    eventSink = sink
    drainPendingEvents(context, sink)
    if (running) emitStatus(context, "ready", "SSA Nearby foreground transport is active")
  }

  fun detach() {
    eventSink = null
  }

  fun start(context: Context, serviceId: String, localName: String, requestForeground: Boolean) {
    require(serviceId.isNotBlank()) { "Nearby service ID is required" }
    require(localName.isNotBlank()) { "Nearby local name is required" }
    persistConfig(context, serviceId, localName)
    if (requestForeground) SsaNearbyForegroundService.start(context, serviceId, localName)
    startTransport(context, serviceId, localName)
  }

  fun restartFromService(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val serviceId = prefs.getString(SERVICE_ID_KEY, null) ?: return
    val localName = prefs.getString(LOCAL_NAME_KEY, "SSA device") ?: "SSA device"
    startTransport(context, serviceId, localName)
  }

  fun stop(context: Context, stopService: Boolean = true) {
    connectionsClient?.stopAdvertising()
    connectionsClient?.stopDiscovery()
    connectionsClient?.stopAllEndpoints()
    connectionsClient = null
    discoveredEndpoints.clear()
    connectedEndpoints.clear()
    running = false
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    emitStatus(context, "stopped", "SSA Nearby foreground transport stopped")
    if (stopService) SsaNearbyForegroundService.stop(context)
  }

  fun acceptConnection(context: Context, endpointId: String) {
    require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
    requireClient().acceptConnection(endpointId, payloadCallback)
      .addOnFailureListener { emitStatus(context, "error", "Unable to accept nearby connection: ${it.message ?: "unknown error"}") }
  }

  fun rejectConnection(context: Context, endpointId: String) {
    require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
    connectionsClient?.rejectConnection(endpointId)
  }

  fun sendPayload(context: Context, endpointId: String, bytes: List<Int>) {
    require(endpointId.isNotBlank()) { "Nearby endpoint ID is required" }
    require(bytes.isNotEmpty()) { "Nearby payload cannot be empty" }
    require(bytes.size <= MAX_BYTES_PAYLOAD) { "Nearby bytes payload exceeds 32 KB" }
    requireClient().sendPayload(endpointId, Payload.fromBytes(bytes.map { it.coerceIn(0, 255).toByte() }.toByteArray()))
      .addOnFailureListener { emitStatus(context, "error", "Nearby payload delivery failed: ${it.message ?: "unknown error"}") }
  }

  private fun requireClient(): ConnectionsClient = requireNotNull(connectionsClient) { "Nearby transport is not started" }

  private fun startTransport(context: Context, serviceId: String, localName: String) {
    if (running && currentServiceId == serviceId && currentLocalName == localName) return
    stopTransportOnly()
    currentServiceId = serviceId
    currentLocalName = localName

    val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    val bluetoothAdapter = bluetoothManager.adapter
    if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
      emitStatus(context, "error", "Bluetooth is disabled. Turn on Bluetooth and retry SSA.")
      return
    }
    if (!hasRequiredPermissions(context)) {
      emitStatus(context, "error", "Nearby permissions are required for SSA emergency mode.")
      return
    }
    val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    if (wifiManager != null && !wifiManager.isWifiEnabled) {
      emitStatus(context, "error", "Wi-Fi is disabled. Turn on Wi-Fi and retry SSA.")
      return
    }

    emitStatus(context, "starting", "Starting persistent SSA Nearby service")
    connectionsClient = Nearby.getConnectionsClient(context.applicationContext)
    running = true
    discoveredEndpoints.clear()
    connectedEndpoints.clear()

    val advertisingOptions = AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
    val discoveryOptions = DiscoveryOptions.Builder().setStrategy(STRATEGY).build()
    val client = connectionsClient ?: return
    client.startAdvertising(localName, serviceId, connectionLifecycleCallback, advertisingOptions)
      .addOnFailureListener { emitStatus(context, "error", "SSA advertising failed: ${it.message ?: "unknown error"}") }
    client.startDiscovery(serviceId, endpointDiscoveryCallback, discoveryOptions)
      .addOnFailureListener { emitStatus(context, "error", "SSA discovery failed: ${it.message ?: "unknown error"}") }
      .addOnSuccessListener { emitStatus(context, "ready", "SSA Nearby discovery is persistent in emergency mode") }
  }

  private fun stopTransportOnly() {
    connectionsClient?.stopAdvertising()
    connectionsClient?.stopDiscovery()
    connectionsClient?.stopAllEndpoints()
    connectionsClient = null
    discoveredEndpoints.clear()
    connectedEndpoints.clear()
    running = false
  }

  private fun hasRequiredPermissions(context: Context): Boolean {
    val required = mutableListOf<String>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      required += Manifest.permission.BLUETOOTH_SCAN
      required += Manifest.permission.BLUETOOTH_CONNECT
      required += Manifest.permission.BLUETOOTH_ADVERTISE
    } else {
      required += if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) Manifest.permission.ACCESS_FINE_LOCATION else Manifest.permission.ACCESS_COARSE_LOCATION
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) required += Manifest.permission.NEARBY_WIFI_DEVICES
    return required.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
  }

  private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
      if (!running || !discoveredEndpoints.add(endpointId)) return
      emitPeer(endpointId, info.endpointName, "discovered")
      connectionsClient?.requestConnection(currentLocalName, endpointId, connectionLifecycleCallback)
        ?.addOnSuccessListener { emitPeer(endpointId, info.endpointName, "connecting") }
        ?.addOnFailureListener { emitPeer(endpointId, info.endpointName, "rejected"); emitStatus(null, "error", "Nearby connection request failed: ${it.message ?: "unknown error"}") }
    }

    override fun onEndpointLost(endpointId: String) {
      discoveredEndpoints.remove(endpointId)
      connectedEndpoints.remove(endpointId)
      emitPeer(endpointId, endpointId, "disconnected")
    }
  }

  private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, connectionInfo: ConnectionInfo) {
      emit("connection-request", mapOf("endpointId" to endpointId, "name" to connectionInfo.endpointName, "authenticationToken" to connectionInfo.authenticationToken))
    }

    override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
      if (resolution.status.isSuccess) {
        connectedEndpoints.add(endpointId)
        emitPeer(endpointId, endpointId, "connected")
        emitStatus(null, "ready", "SSA Nearby connection established")
      } else {
        connectedEndpoints.remove(endpointId)
        emitPeer(endpointId, endpointId, "rejected")
        emitStatus(null, "error", "Nearby connection rejected: ${resolution.status.statusCode}")
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
      if (bytes.size <= MAX_BYTES_PAYLOAD) emit("payload", mapOf("endpointId" to endpointId, "bytes" to bytes.map { it.toInt() and 0xff }))
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
  }

  private fun emitPeer(endpointId: String, name: String, state: String) {
    emit("peer", mapOf("peer" to mapOf("endpointId" to endpointId, "name" to name, "state" to state, "discoveredAt" to System.currentTimeMillis(), "lastSeenAt" to System.currentTimeMillis())))
  }

  private fun emitStatus(context: Context?, state: String, detail: String) {
    val notificationContext = context ?: SsaNearbyForegroundService.lastContext
    if (notificationContext != null && state != "stopped") SsaNearbyForegroundService.updateStatus(notificationContext, detail)
    emit("status", mapOf("state" to state, "detail" to detail))
  }

  private fun emit(type: String, payload: Map<String, Any?>) {
    val event = mapOf("type" to type) + payload
    val sink = eventSink
    if (sink != null) {
      try {
        sink.invoke(event)
        return
      } catch {
        eventSink = null
      }
    }
    persistEvent(event)
  }

  private fun persistConfig(context: Context, serviceId: String, localName: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(SERVICE_ID_KEY, serviceId).putString(LOCAL_NAME_KEY, localName).apply()
  }

  private fun persistEvent(event: Map<String, Any?>) {
    val context = SsaNearbyForegroundService.lastContext ?: return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val current = JSONArray(prefs.getString(PENDING_EVENTS_KEY, "[]"))
    if (current.length() >= 100) current.remove(0)
    current.put(JSONObject(event))
    prefs.edit().putString(PENDING_EVENTS_KEY, current.toString()).apply()
  }

  private fun drainPendingEvents(context: Context, sink: (Map<String, Any?>) -> Unit) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val current = JSONArray(prefs.getString(PENDING_EVENTS_KEY, "[]"))
    prefs.edit().remove(PENDING_EVENTS_KEY).apply()
    for (index in 0 until current.length()) {
      val event = current.optJSONObject(index) ?: continue
      sink(jsonObjectToMap(event))
    }
  }

  private fun jsonObjectToMap(value: JSONObject): Map<String, Any?> {
    val result = mutableMapOf<String, Any?>()
    val keys = value.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val item = value.get(key)
      result[key] = when (item) {
        is JSONObject -> jsonObjectToMap(item)
        is JSONArray -> (0 until item.length()).map { item.get(it) }
        JSONObject.NULL -> null
        else -> item
      }
    }
    return result
  }
}
