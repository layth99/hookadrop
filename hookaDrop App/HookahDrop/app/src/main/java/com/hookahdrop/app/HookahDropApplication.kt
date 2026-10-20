package com.hookahdrop.app

import android.app.Application
import com.hookahdrop.app.data.ProductSyncManager

/**
 * Custom Application class for HookahDrop.
 * Handles one-time initialization of singletons and managers.
 */
class HookahDropApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialize ProductSyncManager with cache version tracking
        ProductSyncManager.init(this)
    }
}
