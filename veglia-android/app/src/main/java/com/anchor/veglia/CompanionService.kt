package com.anchor.veglia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class CompanionService : Service() {

    companion object {
        var logCallback: ((String) -> Unit)? = null
        private fun log(msg: String) { logCallback?.invoke(msg) }
    }

    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()
    private var polling = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (!polling) return
            executor.execute { pollServer() }
            handler.postDelayed(this, 3000)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val notification = buildNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(1, notification)
            }
            log("CompanionService 已啟動")

            polling = true
            handler.post(pollRunnable)
            log("守望就緒，每 3 秒 poll 一次")
        } catch (e: Exception) {
            log("啟動失敗: ${e.javaClass.simpleName}: ${e.message}")
            try { stopSelf() } catch (_: Exception) {}
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        polling = false
        handler.removeCallbacks(pollRunnable)
        executor.shutdown()
        log("CompanionService 已停止")
        super.onDestroy()
    }

    private fun pollServer() {
        val prefs = getSharedPreferences("veglia", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("url", "") ?: ""
        val token = prefs.getString("token", "") ?: ""

        if (serverUrl.isEmpty() || token.isEmpty()) return

        try {
            val conn = URL("$serverUrl/phone/poll").openConnection() as HttpURLConnection
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.setRequestProperty("X-Auth-Token", token)
            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            if (body.contains("\"peek\"")) {
                log("收到 peek 指令 → 截圖中...")
                val svc = ScreenshotService.instance
                if (svc != null) {
                    svc.captureAndUpload()
                } else {
                    log("無障礙服務未啟用，無法截圖")
                }
            }
        } catch (e: Exception) {
            log("poll 失敗: ${e.message}")
        }
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, "veglia_ch")
            .setContentTitle("Veglia 守望中")
            .setContentText("等待 Anchor 的指令")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        val ch = NotificationChannel("veglia_ch", "Veglia 守望", NotificationManager.IMPORTANCE_LOW)
        ch.description = "Veglia 螢幕守望服務"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(ch)
    }
}
