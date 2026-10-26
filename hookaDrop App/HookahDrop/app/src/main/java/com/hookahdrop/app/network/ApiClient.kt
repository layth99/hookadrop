package com.hookahdrop.app.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Centralized HTTP client for HookaDrop backend communication.
 *
 * BASE_URL resolution priority:
 *  1. BASE_URL_OVERRIDE (set in BuildConfig for CI/CD)
 *  2. Hard-coded production URL below
 *
 * Change PRODUCTION_URL to your deployed backend URL (Render, Railway, etc.)
 * For local dev with Android emulator, use: http://10.0.2.2:8000
 * For local dev with a real device on the same Wi-Fi: http://192.168.x.x:8000
 */
object ApiClient {

    // ── CONFIGURATION — change this to your production server URL ──────────
    const val PRODUCTION_URL   = "https://hookadrop-api.onrender.com"
    const val DEV_EMULATOR_URL = "http://10.0.2.2:8000"       // Android Studio emulator
    const val DEV_DEVICE_URL   = "http://192.168.1.26:8000"   // real device on same Wi-Fi

    // Switch here depending on how you're testing:
    //   true  + emulator  → use DEV_EMULATOR_URL (http://10.0.2.2:8000)
    //   true  + real phone → change BASE_URL to DEV_DEVICE_URL
    //   false             → use PRODUCTION_URL
    private const val USE_LOCAL = true

    val BASE_URL: String
        get() = if (USE_LOCAL) DEV_EMULATOR_URL else PRODUCTION_URL
        // ↑ Real device: change DEV_EMULATOR_URL → DEV_DEVICE_URL

    private const val CONNECT_TIMEOUT_MS = 25_000  // 25s connect timeout
    private const val READ_TIMEOUT_MS    = 30_000  // 30s read timeout

    // ── GET ────────────────────────────────────────────────────────────────

    suspend fun get(path: String, token: String? = null): ApiResponse =
        withContext(Dispatchers.IO) {
            request("GET", path, null, token)
        }

    // ── POST ───────────────────────────────────────────────────────────────

    suspend fun post(path: String, body: JSONObject, token: String? = null): ApiResponse =
        withContext(Dispatchers.IO) {
            request("POST", path, body.toString(), token)
        }

    // ── PUT ────────────────────────────────────────────────────────────────

    suspend fun put(path: String, body: JSONObject, token: String? = null): ApiResponse =
        withContext(Dispatchers.IO) {
            request("PUT", path, body.toString(), token)
        }

    // ── PATCH ──────────────────────────────────────────────────────────────

    suspend fun patch(path: String, body: JSONObject, token: String? = null): ApiResponse =
        withContext(Dispatchers.IO) {
            request("PATCH", path, body.toString(), token)
        }

    // ── DELETE ─────────────────────────────────────────────────────────────

    suspend fun delete(path: String, token: String? = null): ApiResponse =
        withContext(Dispatchers.IO) {
            request("DELETE", path, null, token)
        }

    // ── Multipart POST (for image upload) ──────────────────────────────────

    suspend fun postMultipart(
        path: String,
        fieldName: String,
        fileBytes: ByteArray,
        mimeType: String,
        fileName: String,
        token: String? = null
    ): ApiResponse = withContext(Dispatchers.IO) {
        try {
            val boundary = "HookaDrop_${System.currentTimeMillis()}"
            val url  = URL("$BASE_URL$path")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod  = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout    = READ_TIMEOUT_MS
                doOutput       = true
                setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                setRequestProperty("Accept", "application/json")
                if (token != null) setRequestProperty("Authorization", "Bearer $token")
            }
            conn.outputStream.use { os ->
                val partHeader = "--$boundary\r\nContent-Disposition: form-data; " +
                    "name=\"$fieldName\"; filename=\"$fileName\"\r\n" +
                    "Content-Type: $mimeType\r\n\r\n"
                os.write(partHeader.toByteArray(Charsets.UTF_8))
                os.write(fileBytes)
                os.write("\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8))
            }
            val code = conn.responseCode
            val body = try {
                if (code in 200..299) conn.inputStream.bufferedReader(Charsets.UTF_8).readText()
                else conn.errorStream?.bufferedReader(Charsets.UTF_8)?.readText() ?: ""
            } catch (e: Exception) { "" }
            conn.disconnect()
            ApiResponse(code, body)
        } catch (e: Exception) {
            Log.e("ApiClient", "Multipart failed: $BASE_URL$path", e)
            val detail = e.message?.replace("\"", "'") ?: e.javaClass.simpleName
            ApiResponse(-1, """{"error":"$detail","network":true}""")
        }
    }

    // ── Core request ───────────────────────────────────────────────────────

    private fun request(
        method: String,
        path: String,
        body: String?,
        token: String?,
        isRetry: Boolean = false
    ): ApiResponse {
        return try {
            val url  = URL("$BASE_URL$path")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod  = method
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout    = READ_TIMEOUT_MS
                setRequestProperty("Content-Type",  "application/json")
                setRequestProperty("Accept",        "application/json")
                if (token != null) {
                    setRequestProperty("Authorization", "Bearer $token")
                }
                if (body != null) {
                    doOutput = true
                    OutputStreamWriter(outputStream, Charsets.UTF_8).use { it.write(body) }
                }
            }

            val code = conn.responseCode
            val responseBody = try {
                if (code in 200..299) conn.inputStream.bufferedReader(Charsets.UTF_8).readText()
                else                  conn.errorStream?.bufferedReader(Charsets.UTF_8)?.readText() ?: ""
            } catch (e: Exception) { "" }
            conn.disconnect()

            ApiResponse(code, responseBody)
        } catch (e: Exception) {
            Log.e("ApiClient", "Request failed: $method $BASE_URL$path", e)
            if (!isRetry && !USE_LOCAL) {
                // Auto-retry once after 1.5s delay to handle Render cloud cold start
                Log.i("ApiClient", "Retrying $method $path for Render cold start...")
                try { Thread.sleep(1500) } catch (_: Exception) {}
                return request(method, path, body, token, isRetry = true)
            }
            val detail = e.message?.replace("\"", "'") ?: e.javaClass.simpleName
            ApiResponse(-1, """{"error":"$detail","network":true}""")
        }
    }
}

// ── Simple response wrapper ────────────────────────────────────────────────────

data class ApiResponse(
    val code: Int,
    val raw:  String
) {
    val isSuccess: Boolean get() = code in 200..299
    val isUnauthorized: Boolean get() = code == 401
    val isNetworkError: Boolean get() = code == -1

    fun json(): JSONObject = try {
        JSONObject(raw)
    } catch (e: Exception) {
        JSONObject()
    }

    fun jsonArray(key: String): JSONArray = try {
        val obj = json()
        when {
            obj.has(key)  -> obj.getJSONArray(key)
            raw.trimStart().startsWith("[") -> JSONArray(raw)
            else          -> JSONArray()
        }
    } catch (e: Exception) {
        JSONArray()
    }

    fun userFriendlyError(): String {
        val err = json().optString("error")
        if (isNetworkError) {
            val isLocal = ApiClient.BASE_URL.contains("10.0.2.2") || ApiClient.BASE_URL.contains("192.168")
            return if (isLocal) {
                "Unable to connect to local server (${ApiClient.BASE_URL}). Please ensure your Node.js backend server (node server.js) is running."
            } else {
                if (err.isNotEmpty())
                    "Unable to connect to server ($err). Please check your internet connection."
                else
                    "Unable to connect to server. Please check your internet connection.\n\nIf using Render free tier, the server may take ~30 seconds to wake up."
            }
        }
        return try {
            val msg = json().optString("message").ifEmpty { err }
            when {
                msg.isNotEmpty() -> msg
                code == 401 -> "Session expired. Please sign in again."
                code == 403 -> "Access denied."
                code == 404 -> "Not found."
                code in 500..599 -> "Server error. Please try again."
                else -> "Something went wrong (code $code)."
            }
        } catch (e: Exception) {
            "Something went wrong."
        }
    }
}
