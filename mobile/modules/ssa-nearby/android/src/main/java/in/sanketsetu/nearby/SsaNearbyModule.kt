package in.sanketsetu.nearby

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SsaNearbyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SsaNearby")
    Events("SsaNearbyEvent")

    OnCreate {
      attachRuntime()
    }

    OnDestroy {
      SsaNearbyRuntime.detach()
    }

    AsyncFunction("attach") {
      attachRuntime()
    }

    AsyncFunction("start") { serviceId: String, localName: String ->
      val context = requireContext()
      attachRuntime()
      SsaNearbyRuntime.start(context, serviceId, localName, requestForeground = true)
    }

    AsyncFunction("acceptConnection") { endpointId: String ->
      val context = requireContext()
      SsaNearbyRuntime.acceptConnection(context, endpointId)
    }

    AsyncFunction("rejectConnection") { endpointId: String ->
      val context = requireContext()
      SsaNearbyRuntime.rejectConnection(context, endpointId)
    }

    AsyncFunction("sendPayload") { endpointId: String, bytes: List<Int> ->
      val context = requireContext()
      SsaNearbyRuntime.sendPayload(context, endpointId, bytes)
    }

    AsyncFunction("stop") {
      SsaNearbyRuntime.stop(requireContext())
    }

    AsyncFunction("openBatterySettings") {
      val context = requireContext()
      context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  private fun requireContext(): Context = requireNotNull(appContext.reactContext) { "React context unavailable" }

  private fun attachRuntime() {
    val context = appContext.reactContext ?: return
    SsaNearbyRuntime.attach(context) { event ->
      try {
        sendEvent("SsaNearbyEvent", event)
      } catch {
        // The runtime persists events whenever the JavaScript listener is unavailable.
      }
    }
  }
}
