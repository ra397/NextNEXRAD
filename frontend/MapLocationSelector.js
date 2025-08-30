class MapLocationSelector {
    constructor(map) {
        this.map = map;
        this.isSelectModeActive = false;
        this.originalCursor = null;
        this.clickListener = null;
        this.selectedLocation = null;
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
        // Record the latitude and longitude
        this.selectedLocation = {
            lat: event.latLng.lat().toFixed(4),
            lng: event.latLng.lng().toFixed(4)
        };
        if (this.onLocationSelected) {
            this.onLocationSelected(this.selectedLocation);
        }
        this.cancel();
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