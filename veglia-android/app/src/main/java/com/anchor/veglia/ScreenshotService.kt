package com.anchor.veglia

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.graphics.Bitmap
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class ScreenshotService : AccessibilityService() {

    companion object {
        var instance: ScreenshotService? = null
        var logCallback: ((String) -> Unit)? = null
        private fun log(msg: String) { logCallback?.invoke(msg) }
    }

    private val executor = Executors.newSingleThreadExecutor()

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        log("無障礙服務已連接")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onDestroy() {
        instance = null
        executor.shutdown()
        log("無障礙服務已斷開")
        super.onDestroy()
    }

    fun captureAndUpload() {
        takeScreenshot(Display.DEFAULT_DISPLAY, executor, object : TakeScreenshotCallback {
            override fun onSuccess(screenshot: ScreenshotResult) {
                try {
                    val hardwareBuffer = screenshot.hardwareBuffer
                    val colorSpace = screenshot.colorSpace
                    val hwBitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, colorSpace)
                    hardwareBuffer.close()

                    if (hwBitmap == null) {
                        log("截圖失敗：Bitmap 轉換返回 null")
                        return
                    }

                    val swBitmap = hwBitmap.copy(Bitmap.Config.ARGB_8888, false)
                    hwBitmap.recycle()

                    if (swBitmap == null) {
                        log("截圖失敗：software bitmap 轉換返回 null")
                        return
                    }

                    val scaled = Bitmap.createScaledBitmap(
                        swBitmap, swBitmap.width / 2, swBitmap.height / 2, true
                    )
                    if (scaled !== swBitmap) swBitmap.recycle()

                    val baos = ByteArrayOutputStream()
                    scaled.compress(Bitmap.CompressFormat.JPEG, 70, baos)
                    val bytes = baos.toByteArray()
                    scaled.recycle()

                    log("截圖完成 (${bytes.size / 1024}KB) → 上傳中...")
                    executor.execute { uploadImage(bytes) }
                } catch (e: Exception) {
                    log("截圖處理錯誤: ${e.javaClass.simpleName}: ${e.message}")
                }
            }

            override fun onFailure(errorCode: Int) {
                log("截圖失敗 (errorCode=$errorCode)")
            }
        })
    }

    private fun uploadImage(jpeg: ByteArray) {
        val prefs = getSharedPreferences("veglia", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("url", "") ?: ""
        val token = prefs.getString("token", "") ?: ""

        if (serverUrl.isEmpty() || token.isEmpty()) {
            log("上傳失敗：未設定 Server URL 或 Token")
            return
        }

        try {
            val conn = URL("$serverUrl/phone/screenshot")
                .openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "image/jpeg")
            conn.setRequestProperty("X-Auth-Token", token)
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
            log("上傳錯誤: ${e.javaClass.simpleName}: ${e.message}")
        }
    }
}
