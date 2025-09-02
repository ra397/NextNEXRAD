class MapLocationSelector {
    constructor(map) {
        this.map = map;
        this.isSelectModeActive = false;
        this.originalCursor = null;
        this.clickListener = null;
        this.selectedLocation = null;

        this.tempMarker = new markerCollection(this.map);
        this.initializeTempMarker();
    }

    initializeTempMarker = async () => {
        await this.tempMarker.init({
            map: this.map, 
            use_advanced: false,
            marker_options: { markerFill: '#0000FF', markerStroke: '#0000FF', markerSize: 4.5 }
        });
    }

    addTempMarker(lat, lng) {
        const marker = this.tempMarker.makeMarker(lat, lng, { properties: {id: "temp"} }, { clickable: true });
        return marker;
    }

    deleteTempMarker() {
        return this.tempMarker.deleteMarker("temp");
    }

    start() {
        if (this.isSelectModeActive) return;
        this.originalCursor = this.map.get('draggableCursor');
        this.map.set('draggableCursor', 'crosshair');
        this.isSelectModeActive = true;
        this.clickListener = this.map.addListener('click', (event) => {
            this.handleClick(event);
        });
    }

    handleClick(event) {
        if (!this.isSelectModeActive) return;
        this.deleteTempMarker("temp");
        // Record the latitude and longitude
        this.selectedLocation = {
            lat: event.latLng.lat().toFixed(4),
            lng: event.latLng.lng().toFixed(4)
        };
        if (this.onLocationSelected) {
            this.onLocationSelected(this.selectedLocation);
        }
    }

    cancel() {
        if (!this.isSelectModeActive) return;
        
        if (this.originalCursor !== null) {
            this.map.set('draggableCursor', this.originalCursor);
            this.originalCursor = null;
        }
        if (this.clickListener) {
            google.maps.event.removeListener(this.clickListener);
            this.clickListener = null;
        }
        this.isSelectModeActive = false;
    }

    // Getter method to retrieve the selected location
    getSelectedLocation() {
        return this.selectedLocation;
    }

    // Method to set a callback for when a location is selected
    setOnLocationSelected(callback) {
        this.onLocationSelected = callback;
    }

    // Method to check if selector is active
    isActive() {
        return this.isSelectModeActive;
    }
}
window.MapLocationSelector = MapLocationSelector;