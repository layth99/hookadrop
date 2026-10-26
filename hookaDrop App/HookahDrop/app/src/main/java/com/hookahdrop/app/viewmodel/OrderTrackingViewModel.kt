package com.hookahdrop.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.hookahdrop.app.data.OrderTracking
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toOrderTracking
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * ViewModel for Order Tracking screen
 * Manages tracking data state and API interactions
 */
class OrderTrackingViewModel(application: Application) : AndroidViewModel(application) {

    private val sessionManager = SessionManager(application)
    private val _trackingState = MutableLiveData<TrackingState>()
    val trackingState: LiveData<TrackingState> = _trackingState

    fun loadTracking(orderId: String) {
        android.util.Log.d("OrderTrackingVM", "════════════════════════════════")
        android.util.Log.d("OrderTrackingVM", "loadTracking called")
        android.util.Log.d("OrderTrackingVM", "orderId: '$orderId'")
        
        _trackingState.value = TrackingState.Loading

        viewModelScope.launch {
            try {
                // Simulate network delay for intro animation
                delay(300)
                
                val token = sessionManager.getJwtToken()
                android.util.Log.d("OrderTrackingVM", "token: ${if (token.isNullOrEmpty()) "EMPTY" else token.take(20) + "..."}")
                
                if (token.isNullOrEmpty()) {
                    android.util.Log.e("OrderTrackingVM", "ERROR: No JWT token")
                    _trackingState.value = TrackingState.Error("Please sign in to view tracking")
                    return@launch
                }
                
                val endpoint = "/api/orders/$orderId/tracking"
                android.util.Log.d("OrderTrackingVM", "API endpoint: $endpoint")
                android.util.Log.d("OrderTrackingVM", "BASE_URL: ${ApiClient.BASE_URL}")
                
                val response = ApiClient.get(endpoint, token)
                
                android.util.Log.d("OrderTrackingVM", "Response isSuccess: ${response.isSuccess}")
                android.util.Log.d("OrderTrackingVM", "Response JSON: ${response.json()}")
                
                if (response.isSuccess) {
                    val trackingJson = response.json().optJSONObject("data") ?: response.json()
                    android.util.Log.d("OrderTrackingVM", "Tracking JSON: $trackingJson")
                    
                    val tracking = trackingJson.toOrderTracking()
                    android.util.Log.d("OrderTrackingVM", "SUCCESS: Parsed tracking data")
                    _trackingState.value = TrackingState.Success(tracking)
                } else {
                    val error = response.userFriendlyError()
                    android.util.Log.e("OrderTrackingVM", "API ERROR: $error")
                    _trackingState.value = TrackingState.Error(error)
                }
            } catch (e: Exception) {
                android.util.Log.e("OrderTrackingVM", "EXCEPTION: ${e.message}", e)
                _trackingState.value = TrackingState.Error(
                    e.message ?: "Network error occurred"
                )
            }
            android.util.Log.d("OrderTrackingVM", "════════════════════════════════")
        }
    }

    fun refresh(orderId: String) {
        // Don't show loading overlay for refresh
        viewModelScope.launch {
            try {
                val token = sessionManager.getJwtToken() ?: return@launch
                val response = ApiClient.get("/api/orders/$orderId/tracking", token)
                
                if (response.isSuccess) {
                    val trackingJson = response.json().optJSONObject("data") ?: response.json()
                    val tracking = trackingJson.toOrderTracking()
                    _trackingState.value = TrackingState.Success(tracking)
                }
                // Silently fail on refresh errors
            } catch (e: Exception) {
                // Log but don't show error
            }
        }
    }
}

/**
 * Sealed class representing different states of tracking data
 */
sealed class TrackingState {
    object Loading : TrackingState()
    data class Success(val tracking: OrderTracking) : TrackingState()
    data class Error(val message: String) : TrackingState()
}
