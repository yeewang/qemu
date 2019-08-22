// Googleplex!
var lastLatLng = { lat: 37.4220919, lng: -122.0826088 };
var gMap;
var gSearchBox;
var gGeocoder;
var gCurrentMarker; // The blue dot
var gPendingMarker; // The red "pin"
var gSearchResultMarkers = [];
var gPointOverlay = new LocationPointOverlay();

document.addEventListener('DOMContentLoaded', function () {

}, false);

function savePoint() {
    // The emulator should have the point of interest already, from the
    // sendAddress() call.
    channel.objects.emulocationserver.map_savePoint();
}

function resetPointsMap() {
    gPointOverlay.hide();
}

// Callback function for Maps API
function initMap() {
    // Create a map object and specify the DOM element for display.
    gMap = new google.maps.Map(document.getElementById('map'), {
        center: lastLatLng,
        zoom: 10,
        zoomControl: true,
        disableDefaultUI: true,
        controlSize: 24
    });
    gGeocoder = new google.maps.Geocoder;

    gSearchBox = new LocationSearchBox();
    gSearchBox.init(gMap);

    // Register a listener that sets a new marker wherever the
    // user clicks on the map.
    google.maps.event.addListener(gMap, 'click', function (event) {
        // TODO: add spinner here
        gSearchBox.showSpinner();

        showPin(event.latLng);

        // Send the location coordinates to the emulator
        lastLatLng = event.latLng;
        sendAddress(lastLatLng);
    });
}

function showPendingLocation(lat, lng, addr) {
    // Called from Qt code to show a pending location on the UI map.
    // This point has NOT been sent to the AVD.
    var latLng = new google.maps.LatLng(lat, lng);
    showPin(latLng);
    // TODO: no support for elevation yet.
    gPointOverlay.show(addr, latLng, null, true);
}

function setDeviceLocation(lat, lng) {
    // Called from Qt code to show the blue marker to display the emulator location on the map.
    // Code to set location marker on the map. Move this to a signal event handler.

    // Clear any existing blue dot and red pin
    if (gCurrentMarker != null) {
        gCurrentMarker.setMap(null);
    }
    if (gPendingMarker != null) {
        gPendingMarker.setMap(null);
    }

    var latLng = new google.maps.LatLng(lat, lng);
    gCurrentMarker = new google.maps.Marker({ map: gMap, position: latLng });

    var blueDot = 'data:image/svg+xml, \
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" \
                    viewBox="0 0 24 24" fill="%23000000"> \
                <circle cx="12" cy="12" r="10" fill="black" opacity=".1" /> \
                <circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" \
                    fill="%234286f5" /> \
            </svg>';
    var image = {
        url: blueDot,
        size: new google.maps.Size(24, 24),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(12, 12),
        scaledSize: new google.maps.Size(25, 25)
    };
    var bounds = gMap.getBounds();
    if (bounds == null || !bounds.contains(latLng)) {
        gMap.setCenter(latLng);
    }
    gCurrentMarker.setIcon(image);
}

function markerListener(event) {
    lastLatLng = event.latLng;
    showPin(lastLatLng);
    sendAddress(lastLatLng);
}

function showPin(latLng) {
    // Clear current pin
    if (gPendingMarker != null) {
        gPendingMarker.setMap(null);
    }
    // Clear all current search markers
    for (marker in gSearchResultMarkers) {
        marker.setMap(null);
    }
    gSearchResultMarkers = [];

    // Create a new pin at this location
    gPendingMarker = new google.maps.Marker({
        map: gMap,
        position: latLng
    });
    var bounds = gMap.getBounds();
    if (bounds == null || !bounds.contains(latLng)) {
        gMap.setCenter(latLng);
    }
}

function sendAddress(latLng) {
    gGeocoder.geocode({ 'location': latLng }, function (results, status) {
        var address = "";
        var elevation = 0.0;
        if (status === 'OK' && results[0]) {
            address = results[0].formatted_address;
            elevation = results[0].elevation;
        }
        gPointOverlay.show(address, latLng, elevation);
        channel.objects.emulocationserver
            .sendLocation(latLng.lat(), latLng.lng(), address);
        console.log("addr=" + address);
        gSearchBox.update(address)
    });
}