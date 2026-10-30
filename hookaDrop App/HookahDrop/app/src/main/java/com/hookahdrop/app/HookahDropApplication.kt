package com.hookahdrop.app

import android.app.Application
import android.content.Context
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.data.ProductSyncManager

/**
 * Custom Application class for HookahDrop.
 * Handles one-time initialization of singletons and managers.
 */
class HookahDropApplication : Application() {

    override fun attachBaseContext(base: Context) {
        super.attachBaseContext(LocaleManager.wrap(base))
    }

    override fun onCreate() {
        super.onCreate()
        
        // Initialize ProductSyncManager with cache version tracking
        ProductSyncManager.init(this)
    }
}
