package com.anchor.veglia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.pm.ServiceInfo
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class CaptureService : Service() {

    companion object {
        var logCallback: ((String) -> Unit)? = null
        private fun log(msg: String) { logCallback?.invoke(msg) }
    }

    private var projection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    private var serverUrl = ""
    private var token = ""
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
        serverUrl = intent?.getStringExtra("url") ?: ""
        token = intent?.getStringExtra("token") ?: ""
        val resultCode = intent?.getIntExtra("resultCode", 0) ?: 0
        @Suppress("DEPRECATION")
        val data = intent?.getParcelableExtra<Intent>("data") ?: run {
            log("缺少 MediaProjection data")
            stopSelf()
            return START_NOT_STICKY
        }

        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projection = mpm.getMediaProjection(resultCode, data)

        val notification = Notification.Builder(this, "veglia_ch")
            .setContentTitle("Veglia 守望中")
            .setContentText("等待 Anchor 的指令")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .build()
        try {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } catch (e: Exception) {
            log("startForeground 失敗: ${e.message}")
            projection?.stop()
            stopSelf()
            return START_NOT_STICKY
        }

        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        wm.defaultDisplay.getRealMetrics(metrics)

        val scale = 0.5f
        val w = (metrics.widthPixels * scale).toInt()
        val h = (metrics.heightPixels * scale).toInt()

        imageReader = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2)
        virtualDisplay = projection?.createVirtualDisplay(
            "veglia", w, h, metrics.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader!!.surface, null, handler
        )

        polling = true
        handler.post(pollRunnable)
        log("MediaProjection 準備完成 (${w}x${h})")

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        polling = false
        handler.removeCallbacks(pollRunnable)
        virtualDisplay?.release()
        imageReader?.close()
        projection?.stop()
        executor.shutdown()
        super.onDestroy()
    }

    private fun pollServer() {
        try {
            val conn = URL("$serverUrl/phone/poll?token=$token").openConnection() as HttpURLConnection
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            if (body.contains("\"peek\"")) {
                log("收到 peek 指令 → 截圖中...")
                handler.post { captureAndUpload() }
            }
        } catch (e: Exception) {
            log("poll 失敗: ${e.message}")
        }
    }

    private fun captureAndUpload() {
        val reader = imageReader ?: return
        var image: Image? = null
        try {
            image = reader.acquireLatestImage()
            if (image == null) {
                log("截圖失敗：acquireLatestImage 返回 null")
                return
            }

            val plane = image.planes[0]
            val buffer = plane.buffer
            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * image.width

            val bmp = Bitmap.createBitmap(
                image.width + rowPadding / pixelStride,
                image.height,
                Bitmap.Config.ARGB_8888
            )
            bmp.copyPixelsFromBuffer(buffer)

            val cropped = if (rowPadding > 0) {
                Bitmap.createBitmap(bmp, 0, 0, image.width, image.height)
            } else bmp

            val baos = ByteArrayOutputStream()
            cropped.compress(Bitmap.CompressFormat.JPEG, 70, baos)
            val bytes = baos.toByteArray()
            if (cropped !== bmp) cropped.recycle()
            bmp.recycle()

            log("截圖完成 (${bytes.size / 1024}KB) → 上傳中...")
            executor.execute { uploadImage(bytes) }
        } catch (e: Exception) {
            log("截圖錯誤: ${e.message}")
        } finally {
            image?.close()
        }
    }

    private fun uploadImage(jpeg: ByteArray) {
        try {
            val conn = URL("$serverUrl/phone/screenshot?token=$token")
                .openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "image/jpeg")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.outputStream.write(jpeg)
            val code = conn.responseCode
            val body = try { conn.inputStream.bufferedReader().readText() } catch (_: Exception) { "" }
            conn.disconnect()
            if (code in 200..299) {
                log("上傳成功 ✓")
            } else {
                log("上傳失敗 ($code): $body")
            }
        } catch (e: Exception) {
            log("上傳錯誤: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        val ch = NotificationChannel("veglia_ch", "Veglia 守望", NotificationManager.IMPORTANCE_LOW)
        ch.description = "Veglia 螢幕守望服務"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(ch)
    }
}
