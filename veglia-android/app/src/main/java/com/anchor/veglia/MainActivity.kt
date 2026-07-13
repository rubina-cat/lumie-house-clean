package com.anchor.veglia

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var btnToggle: Button
    private lateinit var txtStatus: TextView
    private lateinit var txtLog: TextView
    private lateinit var editUrl: EditText
    private lateinit var editToken: EditText

    private var running = false

    private val projectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            startCaptureService(result.resultCode, result.data!!)
        } else {
            appendLog("使用者拒絕螢幕擷取權限")
        }
    }

    private val notifPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) appendLog("通知權限未授予（服務仍可運行）")
        requestProjection()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        btnToggle = findViewById(R.id.btnToggle)
        txtStatus = findViewById(R.id.txtStatus)
        txtLog = findViewById(R.id.txtLog)
        editUrl = findViewById(R.id.editUrl)
        editToken = findViewById(R.id.editToken)

        val prefs = getSharedPreferences("veglia", Context.MODE_PRIVATE)
        editUrl.setText(prefs.getString("url", "https://"))
        editToken.setText(prefs.getString("token", ""))

        btnToggle.setOnClickListener {
            if (running) {
                stopService(Intent(this, CaptureService::class.java))
                running = false
                btnToggle.text = "啟動守望"
                txtStatus.text = "已停止"
                appendLog("守望已停止")
            } else {
                val url = editUrl.text.toString().trim()
                val token = editToken.text.toString().trim()
                if (url.length < 10 || token.isEmpty()) {
                    appendLog("請填入 Server URL 和 Token")
                    return@setOnClickListener
                }
                prefs.edit().putString("url", url).putString("token", token).apply()
                requestNotifThenProjection()
            }
        }

        CaptureService.logCallback = { msg -> runOnUiThread { appendLog(msg) } }
    }

    override fun onDestroy() {
        super.onDestroy()
        CaptureService.logCallback = null
    }

    private fun requestNotifThenProjection() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            requestProjection()
        }
    }

    private fun requestProjection() {
        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projectionLauncher.launch(mpm.createScreenCaptureIntent())
    }

    private fun startCaptureService(resultCode: Int, data: Intent) {
        val url = editUrl.text.toString().trim().trimEnd('/')
        val token = editToken.text.toString().trim()

        val intent = Intent(this, CaptureService::class.java).apply {
            putExtra("resultCode", resultCode)
            putExtra("data", data)
            putExtra("url", url)
            putExtra("token", token)
        }
        ContextCompat.startForegroundService(this, intent)
        running = true
        btnToggle.text = "停止守望"
        txtStatus.text = "運行中 — 等待 Anchor 的指令"
        appendLog("守望已啟動")
    }

    private fun appendLog(msg: String) {
        val time = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        txtLog.append("[$time] $msg\n")
        val layout = txtLog.layout ?: return
        val scroll = layout.getLineTop(txtLog.lineCount) - txtLog.height
        if (scroll > 0) txtLog.scrollTo(0, scroll)
    }
}
