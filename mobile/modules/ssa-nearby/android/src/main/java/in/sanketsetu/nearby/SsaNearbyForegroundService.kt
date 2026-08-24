package `in`.sanketsetu.nearby

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class SsaNearbyForegroundService : Service() {
  companion object {
    private const val CHANNEL_ID = "ssa_emergency_network"
    private const val NOTIFICATION_ID = 2401
    private const val ACTION_START = "in.sanketsetu.nearby.START"
    private const val ACTION_STOP = "in.sanketsetu.nearby.STOP"
    private const val EXTRA_SERVICE_ID = "serviceId"
    private const val EXTRA_LOCAL_NAME = "localName"

    @Volatile
    var lastContext: Context? = null

    fun start(context: Context, serviceId: String, localName: String) {
      val intent = Intent(context, SsaNearbyForegroundService::class.java)
        .setAction(ACTION_START)
        .putExtra(EXTRA_SERVICE_ID, serviceId)
        .putExtra(EXTRA_LOCAL_NAME, localName)
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      context.startService(Intent(context, SsaNearbyForegroundService::class.java).setAction(ACTION_STOP))
    }

    fun updateStatus(context: Context, detail: String) {
      val manager = context.getSystemService(NotificationManager::class.java)
      manager?.notify(NOTIFICATION_ID, buildNotification(context, detail))
    }

    private fun buildNotification(context: Context, detail: String): Notification {
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val pendingIntent = launchIntent?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag())
      }
      return NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("Sanket Setu Alert active")
        .setContentText(detail)
        .setOngoing(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setContentIntent(pendingIntent)
        .build()
    }

    private fun immutableFlag(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
  }

  override fun onCreate() {
    super.onCreate()
    lastContext = applicationContext
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification("SSA emergency network is recovering"))
    SsaNearbyRuntime.restartFromService(applicationContext)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      SsaNearbyRuntime.stop(applicationContext, stopService = false)
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val serviceId = intent?.getStringExtra(EXTRA_SERVICE_ID)
    val localName = intent?.getStringExtra(EXTRA_LOCAL_NAME)
    if (!serviceId.isNullOrBlank() && !localName.isNullOrBlank()) {
      SsaNearbyRuntime.start(applicationContext, serviceId, localName, requestForeground = false)
    } else {
      SsaNearbyRuntime.restartFromService(applicationContext)
    }
    updateNotification(applicationContext, "SSA nearby relay remains active")
    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Re-issue the start intent if the launcher task is swiped away. OEM battery policies may still override this.
    val prefs = applicationContext.getSharedPreferences("ssa_nearby_runtime", Context.MODE_PRIVATE)
    val serviceId = prefs.getString("serviceId", null)
    val localName = prefs.getString("localName", null)
    if (!serviceId.isNullOrBlank() && !localName.isNullOrBlank()) start(applicationContext, serviceId, localName)
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    lastContext = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "SSA emergency network", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Persistent notification for nearby SSA relay mode"
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(detail: String): Notification = buildNotification(this, detail)

  private fun updateNotification(context: Context, detail: String) {
    getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, buildNotification(context, detail))
  }
}
