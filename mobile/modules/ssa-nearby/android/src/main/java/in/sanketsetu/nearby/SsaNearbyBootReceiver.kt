package in.sanketsetu.nearby

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class SsaNearbyBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED && intent?.action != Intent.ACTION_LOCKED_BOOT_COMPLETED) return
    val prefs = context.getSharedPreferences("ssa_nearby_runtime", Context.MODE_PRIVATE)
    val serviceId = prefs.getString("serviceId", null) ?: return
    val localName = prefs.getString("localName", "SSA device") ?: "SSA device"
    val serviceIntent = Intent(context, SsaNearbyForegroundService::class.java)
      .setAction("in.sanketsetu.nearby.START")
      .putExtra("serviceId", serviceId)
      .putExtra("localName", localName)
    ContextCompat.startForegroundService(context, serviceIntent)
  }
}
