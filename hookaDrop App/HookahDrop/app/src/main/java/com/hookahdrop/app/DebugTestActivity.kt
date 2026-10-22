package com.hookahdrop.app

import android.graphics.Color
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Minimal test activity to verify navigation works.
 * If this activity loads successfully, we know the navigation system is OK.
 */
class DebugTestActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create a simple layout programmatically (no XML needed)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#111111"))
            setPadding(60, 60, 60, 60)
        }
        
        val title = TextView(this).apply {
            text = "✅ NAVIGATION TEST SUCCESS!"
            textSize = 24f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, 40)
        }
        
        val message = TextView(this).apply {
            text = """
                If you can see this screen, it means:
                
                ✅ Button click works
                ✅ Intent creation works
                ✅ Activity transition works
                ✅ OnboardingActivity cleanup works
                
                The crash is NOT in the navigation system.
                The crash is in SignInActivity.onCreate() or HomeActivity.onCreate().
                
                Press BACK to return to landing page.
            """.trimIndent()
            textSize = 16f
            setTextColor(Color.parseColor("#CCCCCC"))
            lineHeight = (textSize * 1.6).toInt()
        }
        
        layout.addView(title)
        layout.addView(message)
        setContentView(layout)
        
        android.util.Log.d("DebugTestActivity", "=== DEBUG TEST ACTIVITY LOADED SUCCESSFULLY ===")
    }
}
