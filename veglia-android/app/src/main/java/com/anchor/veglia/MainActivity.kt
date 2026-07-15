package com.anchor.veglia

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
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

    private val notifPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) appendLog("通知權限未授予（服務仍可運行）")
        startCompanion()
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
                stopService(Intent(this, CompanionService::class.java))
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
                prefs.edit().putString("url", url.trimEnd('/')).putString("token", token).apply()

                if (!isAccessibilityEnabled()) {
                    appendLog("請先啟用 Veglia 無障礙服務")
                    startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    return@setOnClickListener
                }

                requestBatteryOptimization()
                requestNotifThenStart()
            }
        }

        ScreenshotService.logCallback = { msg -> runOnUiThread { appendLog(msg) } }
        CompanionService.logCallback = { msg -> runOnUiThread { appendLog(msg) } }
    }

    override fun onResume() {
        super.onResume()
        if (isAccessibilityEnabled()) {
            txtStatus.text = if (running) "運行中 — 等待 Anchor 的指令" else "無障礙服務已啟用"
        } else {
            txtStatus.text = "無障礙服務未啟用"
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        ScreenshotService.logCallback = null
        CompanionService.logCallback = null
    }

    private fun isAccessibilityEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.contains("$packageName/")
    }

    private fun requestBatteryOptimization() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            try {
                startActivity(
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                )
            } catch (e: Exception) {
                appendLog("無法請求忽略電池最佳化: ${e.message}")
            }
        }
    }

    private fun requestNotifThenStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            startCompanion()
        }
    }

    private fun startCompanion() {
        ContextCompat.startForegroundService(this, Intent(this, CompanionService::class.java))
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
