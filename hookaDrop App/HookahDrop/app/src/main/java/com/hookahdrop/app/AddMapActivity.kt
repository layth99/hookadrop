package com.hookahdrop.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.PointF
import android.location.Geocoder
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.hookahdrop.app.data.Address
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityAddMapBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.annotations.IconFactory
import java.util.Locale
import java.util.UUID

/**
 * Add Address Activity using MapLibre + OpenFreeMap
 * 
 * Map Provider: OpenFreeMap (Liberty style)
 * - Tile Server: https://tiles.openfreemap.org/styles/liberty
 * - No API key required
 * - Free and open source tile server
 * - Based on OpenStreetMap data
 * 
 * Geocoding: Android Geocoder
 * - Uses device's built-in geocoding service
 * - Works offline if device has geocoding data cached
 * - Free, no API key needed
 * - May use Google services on devices with Google Play Services
 * 
 * Location: Google Play Services FusedLocationProviderClient
 * - Requires location permission
 * - Uses GPS, Wi-Fi, and cellular networks for accuracy
 */
class AddMapActivity : AppCompatActivity() {

    private lateinit var b: ActivityAddMapBinding
    private var mapView: MapView? = null
    private var map: MapLibreMap? = null
    private lateinit var sessionManager: SessionManager

    // Currently selected location data
    private var selectedLat    = 0.0
    private var selectedLng    = 0.0
    private var selectedStreet = ""
    private var selectedCity   = ""
    private var selectedPostal = ""
    private var selectedCountry = ""

    // Center marker (pin that stays in center of screen)
    private var centerMarkerView: View? = null

    companion object {
        private const val REQ_LOCATION = 1001
        // Default: Tunis, Tunisia
        private val DEFAULT_LOCATION = LatLng(36.8065, 10.1815)
        private const val DEFAULT_ZOOM = 14.0
        private const val OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize MapLibre
        MapLibre.getInstance(this)
        
        b = ActivityAddMapBinding.inflate(layoutInflater)
        setContentView(b.root)

        ProfileDataManager.init(this)
        sessionManager = SessionManager(this)

        setupHeader()
        setupSearch()
        setupLabelChips()
        setupSaveButton()
        setupMap(savedInstanceState)
    }

    // ── Map setup ─────────────────────────────────────────────────────────────

    private fun setupMap(savedInstanceState: Bundle?) {
        mapView = b.mapView
        mapView?.onCreate(savedInstanceState)
        
        mapView?.getMapAsync { mapLibreMap ->
            map = mapLibreMap
            
            // Load OpenFreeMap Liberty style
            mapLibreMap.setStyle(OPENFREEMAP_STYLE_URL) { style ->
                onMapStyleLoaded(style)
            }
            
            // Handle map camera idle (when user stops moving map)
            mapLibreMap.addOnCameraIdleListener {
                onMapCameraIdle()
            }
            
            // Disable rotation and tilt for simpler UX
            mapLibreMap.uiSettings.isRotateGesturesEnabled = false
            mapLibreMap.uiSettings.isTiltGesturesEnabled = false
            
            // Hide MapLibre attribution (we'll add it properly later if needed)
            mapLibreMap.uiSettings.isAttributionEnabled = false
            mapLibreMap.uiSettings.isLogoEnabled = false
        }
    }

    private fun onMapStyleLoaded(style: Style) {
        android.util.Log.d("AddMapActivity", "✓ MapLibre style loaded: OpenFreeMap Liberty")
        
        // Create center marker overlay (floating pin in center of screen)
        createCenterMarker()
        
        // Try to center on user location
        requestLocationPermission()
    }

    private fun createCenterMarker() {
        // Create a floating pin view that stays in the center of the map
        centerMarkerView = layoutInflater.inflate(R.layout.view_map_center_marker, null)
        
        // Add to root layout, positioned in center
        val rootView = findViewById<android.view.ViewGroup>(android.R.id.content)
        val params = android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = android.view.Gravity.CENTER
        }
        rootView.addView(centerMarkerView, params)
    }

    private fun onMapCameraIdle() {
        // When map stops moving, geocode the center position
        val center = map?.cameraPosition?.target ?: return
        
        selectedLat = center.latitude
        selectedLng = center.longitude
        
        // Show loading
        b.loadingOverlay.visibility = View.VISIBLE
        
        // Reverse geocode on background thread
        CoroutineScope(Dispatchers.IO).launch {
            val result = reverseGeocode(center.latitude, center.longitude)
            withContext(Dispatchers.Main) {
                b.loadingOverlay.visibility = View.GONE
                applyGeoResult(result)
            }
        }
    }

    // ── Location permission ───────────────────────────────────────────────────

    private fun requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED) {
            moveToCurrentLocation()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                REQ_LOCATION
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_LOCATION &&
            grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            moveToCurrentLocation()
        } else {
            // Permission denied — fall back to default location
            map?.cameraPosition = CameraPosition.Builder()
                .target(DEFAULT_LOCATION)
                .zoom(DEFAULT_ZOOM)
                .build()
            Toast.makeText(this,
                "Location permission denied. You can still search or manually select a location.",
                Toast.LENGTH_LONG).show()
        }
    }

    private fun moveToCurrentLocation() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) return

        try {
            val fusedClient = LocationServices.getFusedLocationProviderClient(this)
            fusedClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    val userLatLng = LatLng(location.latitude, location.longitude)
                    map?.cameraPosition = CameraPosition.Builder()
                        .target(userLatLng)
                        .zoom(DEFAULT_ZOOM)
                        .build()
                } else {
                    // No last known location, use default
                    map?.cameraPosition = CameraPosition.Builder()
                        .target(DEFAULT_LOCATION)
                        .zoom(DEFAULT_ZOOM)
                        .build()
                    Toast.makeText(this,
                        "Could not get your location. Using default location.",
                        Toast.LENGTH_SHORT).show()
                }
            }.addOnFailureListener {
                map?.cameraPosition = CameraPosition.Builder()
                    .target(DEFAULT_LOCATION)
                    .zoom(DEFAULT_ZOOM)
                    .build()
            }
        } catch (e: SecurityException) {
            map?.cameraPosition = CameraPosition.Builder()
                .target(DEFAULT_LOCATION)
                .zoom(DEFAULT_ZOOM)
                .build()
        }
    }

    // ── Geocoding ─────────────────────────────────────────────────────────────

    private fun reverseGeocode(lat: Double, lng: Double): GeoResult {
        return try {
            val geocoder = Geocoder(this, Locale.getDefault())
            @Suppress("DEPRECATION")
            val list = geocoder.getFromLocation(lat, lng, 1)
            if (!list.isNullOrEmpty()) {
                val addr = list[0]
                val street = buildString {
                    if (!addr.thoroughfare.isNullOrEmpty()) append(addr.thoroughfare)
                    if (!addr.subThoroughfare.isNullOrEmpty()) {
                        if (isNotEmpty()) append(" "); append(addr.subThoroughfare)
                    }
                }.ifEmpty { addr.getAddressLine(0)?.split(",")?.firstOrNull()?.trim() ?: "" }

                GeoResult(
                    street  = street,
                    city    = addr.locality ?: addr.adminArea ?: "",
                    postal  = addr.postalCode ?: "",
                    country = addr.countryName ?: "",
                    full    = addr.getAddressLine(0) ?: "$lat, $lng"
                )
            } else {
                GeoResult(full = "${"%.5f".format(lat)}, ${"%.5f".format(lng)}")
            }
        } catch (e: Exception) {
            android.util.Log.w("AddMapActivity", "Geocoding failed: ${e.message}")
            GeoResult(full = "${"%.5f".format(lat)}, ${"%.5f".format(lng)}")
        }
    }

    private fun applyGeoResult(result: GeoResult) {
        selectedStreet  = result.street.ifEmpty { result.full }
        selectedCity    = result.city
        selectedPostal  = result.postal
        selectedCountry = result.country

        b.tvFullAddress.text = result.full
        b.tvCity.text        = result.city
        b.tvPostal.text      = if (result.postal.isNotEmpty()) "• ${result.postal}" else ""

        // Show panel with slide-up animation
        if (b.addressPanel.visibility != View.VISIBLE) {
            b.addressPanel.visibility = View.VISIBLE
            b.addressPanel.translationY = 300f
            b.addressPanel.animate().translationY(0f).setDuration(280).start()
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────

    private fun setupSearch() {
        b.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                b.btnClearSearch.visibility =
                    if (s?.isNotEmpty() == true) View.VISIBLE else View.GONE
            }
        })

        b.btnClearSearch.setOnClickListener {
            b.etSearch.setText("")
            b.etSearch.clearFocus()
            hideKeyboard()
        }

        // Search on keyboard "Search" action
        b.etSearch.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                searchAddress(b.etSearch.text.toString().trim())
                hideKeyboard()
                true
            } else false
        }
    }

    private fun searchAddress(query: String) {
        if (query.isEmpty()) return
        b.loadingOverlay.visibility = View.VISIBLE

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val geocoder = Geocoder(this@AddMapActivity, Locale.getDefault())
                @Suppress("DEPRECATION")
                val results = geocoder.getFromLocationName(query, 5)
                withContext(Dispatchers.Main) {
                    b.loadingOverlay.visibility = View.GONE
                    if (!results.isNullOrEmpty()) {
                        val r = results[0]
                        val latLng = LatLng(r.latitude, r.longitude)
                        map?.cameraPosition = CameraPosition.Builder()
                            .target(latLng)
                            .zoom(DEFAULT_ZOOM)
                            .build()
                        // onMapCameraIdle will handle geocoding automatically
                    } else {
                        Toast.makeText(this@AddMapActivity,
                            "Location not found. Try a different search.",
                            Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    b.loadingOverlay.visibility = View.GONE
                    Toast.makeText(this@AddMapActivity,
                        "Search failed: ${e.message}",
                        Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private fun setupHeader() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }
        b.btnMyLocation.setOnClickListener {
            requestLocationPermission()
        }
    }

    // ── Label chips ───────────────────────────────────────────────────────────

    private fun setupLabelChips() {
        // RadioGroup handles mutual exclusion automatically
        b.radioLabel.setOnCheckedChangeListener { _, _ -> /* handled by RadioButton background selector */ }
    }

    private fun getSelectedLabel(): String {
        return when (b.radioLabel.checkedRadioButtonId) {
            R.id.rbHome  -> "Home"
            R.id.rbWork  -> "Work"
            else         -> "Other"
        }
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    private fun setupSaveButton() {
        b.btnSaveAddress.setOnClickListener {
            if (selectedLat == 0.0 && selectedLng == 0.0) {
                Toast.makeText(this,
                    "Please select a location on the map first.",
                    Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val address = Address(
                id          = "",  // Backend will assign MongoDB _id
                label       = getSelectedLabel(),
                fullName    = "",
                phone       = "",
                street      = selectedStreet,
                city        = selectedCity,
                postalCode  = selectedPostal,
                country     = selectedCountry,
                isDefault   = ProfileDataManager.getAddresses().isEmpty(),
                latitude    = selectedLat,
                longitude   = selectedLng
            )

            b.btnSaveAddress.isEnabled = false
            val token = sessionManager.getJwtToken()

            if (token != null) {
                CoroutineScope(Dispatchers.Main).launch {
                    val result = withContext(Dispatchers.IO) {
                        RemoteDataProvider.createAddress(token, address)
                    }
                    b.btnSaveAddress.isEnabled = true
                    if (result != null) {
                        ProfileDataManager.addAddress(result)
                        Toast.makeText(this@AddMapActivity, "Address saved!", Toast.LENGTH_SHORT).show()
                        navigateToAddressesActivity()
                    } else {
                        Toast.makeText(this@AddMapActivity,
                            "Failed to save address. Check your connection.",
                            Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                // No token — fall back to local-only with UUID
                val localAddress = address.copy(id = UUID.randomUUID().toString())
                ProfileDataManager.addAddress(localAddress)
                b.btnSaveAddress.isEnabled = true
                Toast.makeText(this, "Address saved locally only", Toast.LENGTH_SHORT).show()
                navigateToAddressesActivity()
            }
        }
    }

    private fun navigateToAddressesActivity() {
        val intent = Intent(this, AddressesActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
        overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
        finish()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(b.etSearch.windowToken, 0)
    }

    // ── MapView lifecycle methods ─────────────────────────────────────────────

    override fun onStart() {
        super.onStart()
        mapView?.onStart()
    }

    override fun onResume() {
        super.onResume()
        mapView?.onResume()
    }

    override fun onPause() {
        super.onPause()
        mapView?.onPause()
    }

    override fun onStop() {
        super.onStop()
        mapView?.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        mapView?.onSaveInstanceState(outState)
    }

    override fun onLowMemory() {
        super.onLowMemory()
        mapView?.onLowMemory()
    }

    override fun onDestroy() {
        super.onDestroy()
        mapView?.onDestroy()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── Data class for geocode result ─────────────────────────────────────────

    private data class GeoResult(
        val street:  String = "",
        val city:    String = "",
        val postal:  String = "",
        val country: String = "",
        val full:    String = ""
    )
}
