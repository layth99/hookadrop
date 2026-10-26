package com.hookahdrop.app.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hookahdrop.app.data.OrderTracking
import com.hookahdrop.app.data.UserSession
import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toOrderTracking
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * ViewModel for Order Tracking screen
 * Manages tracking data state and API interactions
 */
class OrderTrackingViewModel : ViewModel() {

    private val _trackingState = MutableLiveData<TrackingState>()
    val trackingState: LiveData<TrackingState> = _trackingState

    fun loadTracking(orderId: String) {
        _trackingState.value = TrackingState.Loading

        viewModelScope.launch {
            try {
                // Simulate network delay for intro animation
                delay(300)
                
                val token = UserSession.token
                val response = ApiClient.get("/orders/$orderId/tracking", token)
                
                if (response.isSuccess) {
                    val tracking = response.json().toOrderTracking()
                    _trackingState.value = TrackingState.Success(tracking)
                } else {
                    _trackingState.value = TrackingState.Error(
                        response.userFriendlyError()
                    )
                }
            } catch (e: Exception) {
                _trackingState.value = TrackingState.Error(
                    e.message ?: "Network error occurred"
                )
            }
        }
    }

    fun refresh(orderId: String) {
        // Don't show loading overlay for refresh
        viewModelScope.launch {
            try {
                val token = UserSession.token
                val response = ApiClient.get("/orders/$orderId/tracking", token)
                
                if (response.isSuccess) {
                    val tracking = response.json().toOrderTracking()
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
