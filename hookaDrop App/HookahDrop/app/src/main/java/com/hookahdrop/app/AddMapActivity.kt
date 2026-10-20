package com.hookahdrop.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.hookahdrop.app.data.Address
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.databinding.ActivityAddMapBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale
import java.util.UUID

class AddMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var b: ActivityAddMapBinding
    private var map: GoogleMap? = null
    private var marker: Marker? = null

    // Currently selected location data
    private var selectedLat    = 0.0
    private var selectedLng    = 0.0
    private var selectedStreet = ""
    private var selectedCity   = ""
    private var selectedPostal = ""
    private var selectedCountry = ""

    companion object {
        private const val REQ_LOCATION = 1001
        // Default: Tunis, Tunisia
        private val DEFAULT_LOCATION = LatLng(36.8065, 10.1815)
        private const val DEFAULT_ZOOM = 14f
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityAddMapBinding.inflate(layoutInflater)
        setContentView(b.root)

        ProfileDataManager.init(this)

        setupHeader()
        setupSearch()
        setupLabelChips()
        setupSaveButton()

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    // ── Map ready ─────────────────────────────────────────────────────────────

    override fun onMapReady(googleMap: GoogleMap) {
        map = googleMap

        // Apply dark map style
        try {
            googleMap.setMapStyle(
                MapStyleOptions.loadRawResourceStyle(this, R.raw.map_style_dark)
            )
        } catch (e: Exception) {
            // Raw resource may not exist — map still works with default style
        }

        googleMap.uiSettings.apply {
            isZoomControlsEnabled     = false
            isCompassEnabled          = false
            isMyLocationButtonEnabled = false
            isMapToolbarEnabled       = false
        }

        // Tap on map → place marker
        googleMap.setOnMapClickListener { latLng ->
            placeMarkerAndGeocode(latLng)
        }

        // Try to center on user location
        requestLocationPermission()
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
            map?.moveCamera(CameraUpdateFactory.newLatLngZoom(DEFAULT_LOCATION, DEFAULT_ZOOM))
            Toast.makeText(this,
                "Location permission denied. Tap anywhere on the map to choose an address.",
                Toast.LENGTH_LONG).show()
        }
    }

    private fun moveToCurrentLocation() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) return

        try {
            map?.isMyLocationEnabled = true
            val fusedClient = LocationServices.getFusedLocationProviderClient(this)
            fusedClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    val userLatLng = LatLng(location.latitude, location.longitude)
                    map?.animateCamera(CameraUpdateFactory.newLatLngZoom(userLatLng, DEFAULT_ZOOM))
                } else {
                    map?.moveCamera(CameraUpdateFactory.newLatLngZoom(DEFAULT_LOCATION, DEFAULT_ZOOM))
                }
            }.addOnFailureListener {
                map?.moveCamera(CameraUpdateFactory.newLatLngZoom(DEFAULT_LOCATION, DEFAULT_ZOOM))
            }
        } catch (e: SecurityException) {
            map?.moveCamera(CameraUpdateFactory.newLatLngZoom(DEFAULT_LOCATION, DEFAULT_ZOOM))
        }
    }

    // ── Marker + Geocode ──────────────────────────────────────────────────────

    private fun placeMarkerAndGeocode(latLng: LatLng) {
        selectedLat = latLng.latitude
        selectedLng = latLng.longitude

        // Place / move marker
        marker?.remove()
        marker = map?.addMarker(
            MarkerOptions()
                .position(latLng)
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_CYAN))
                .title("Selected location")
        )

        // Show loading
        b.loadingOverlay.visibility = View.VISIBLE

        // Reverse geocode on background thread
        CoroutineScope(Dispatchers.IO).launch {
            val result = reverseGeocode(latLng.latitude, latLng.longitude)
            withContext(Dispatchers.Main) {
                b.loadingOverlay.visibility = View.GONE
                applyGeoResult(result)
            }
        }
    }

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

        // Show panel with slide-up feel
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
                val results = geocoder.getFromLocationName(query, 1)
                withContext(Dispatchers.Main) {
                    b.loadingOverlay.visibility = View.GONE
                    if (!results.isNullOrEmpty()) {
                        val r = results[0]
                        val latLng = LatLng(r.latitude, r.longitude)
                        map?.animateCamera(
                            CameraUpdateFactory.newLatLngZoom(latLng, DEFAULT_ZOOM)
                        )
                        placeMarkerAndGeocode(latLng)
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
                        "Search failed. Check your connection.",
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
        // RadioGroup handles mutual exclusion automatically.
        // Text colors update on selection to white (active) / muted (inactive).
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
                    "Please tap on the map or search to select a location.",
                    Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val address = Address(
                id          = UUID.randomUUID().toString(),
                label       = getSelectedLabel(),
                fullName    = "",           // user can edit from Saved Addresses
                phone       = "",
                street      = selectedStreet,
                city        = selectedCity,
                postalCode  = selectedPostal,
                country     = selectedCountry,
                isDefault   = ProfileDataManager.getAddresses().isEmpty(), // first = default
                latitude    = selectedLat,
                longitude   = selectedLng
            )

            ProfileDataManager.addAddress(address)

            Toast.makeText(this, "Address saved!", Toast.LENGTH_SHORT).show()

            // Return to Saved Addresses
            val intent = Intent(this, AddressesActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
            overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
            finish()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(b.etSearch.windowToken, 0)
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
