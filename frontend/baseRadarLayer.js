class BaseRadarLayer {
    constructor(map, markerOptions) {
        this.map = map;
        this.markers = new markerCollection(map);
        this.overlays = {}; // siteId -> overlay
        this.rings = {}; // siteId -> array of circle overlays
        this.markerOptions = markerOptions;
        this.initRangeRingControls();
    }

    async initMarkers() {
        await this.markers.init({ marker_options: this.markerOptions });
        this.markers.reactClick = this.onMarkerClick.bind(this);
    }

    initRangeRingControls() {
        const masterCheckbox = document.getElementById('radar-range-checkbox');
        const rangeCheckboxes = document.querySelectorAll('.range-checkbox');

        if (masterCheckbox) {
            masterCheckbox.addEventListener('change', () => {
                this.updateAllRangeRings();
            });
        }

        rangeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateAllRangeRings();
            });
        });

    }

    updateAllRangeRings() {
        for (const siteId in this.overlays) {
            const overlay = this.overlays[siteId];
            if (overlay && overlay.getMap()) {
                this.updateRangeRings(siteId);
            }
        }
    }

    updateAllRangeRings() {
        // Update rings for all sites that have visible overlays
        for (const siteId in this.overlays) {
            const overlay = this.overlays[siteId];
            if (overlay && overlay.getMap()) {
                this.updateRangeRings(siteId);
            }
        }
    }

    updateRangeRings(siteId) {
        // Remove existing rings
        this.removeRangeRings(siteId);

        // Check if master checkbox is enabled
        const masterCheckbox = document.getElementById('radar-range-checkbox');
        if (!masterCheckbox || !masterCheckbox.checked) {
            return;
        }

        // Check if overlay is visible
        const overlay = this.overlays[siteId];
        if (!overlay || !overlay.getMap()) {
            return;
        }

        // Get marker position
        const marker = this.markers.getMarker(siteId);
        if (!marker) {
            return;
        }

        // Create rings for checked distances
        const rangeCheckboxes = document.querySelectorAll('.range-checkbox:checked');
        const rings = [];

        rangeCheckboxes.forEach(checkbox => {
            const distance = parseInt(checkbox.dataset.distance, 10);
            const circle = new google.maps.Circle({
                strokeColor: '#000000ff',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillOpacity: 0.0,
                map: this.map,
                center: marker.getPosition(),
                radius: distance,
                clickable: false,
            });
            rings.push(circle);
        });

        this.rings[siteId] = rings;
    }

    showRangeRings(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(this.map);
            });
        } else {
            this.updateRangeRings(siteId);
        }
    }

    hideRangeRings(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(null);
            });
        }
    }

    removeRangeRings(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(null);
            });
            delete this.rings[siteId];
        }
    }

    toggleOverlay(siteId) {
        const overlay = this.overlays[siteId];
        if (!overlay) return;

        const isVisible = overlay.getMap();
        overlay.setMap(isVisible ? null : this.map);

        if (isVisible) {
            this.hideRangeRings(siteId);
        } else {
            this.showRangeRings(siteId);
        }
    }

    addOverlay(siteId, overlay) {
        this.overlays[siteId] = overlay;
        if (overlay.getMap()) {
            this.showRangeRings(siteId);
        }
    }

    removeOverlay(siteId) {
        // Base just removes overlay; Custom will override to also remove marker
        if (this.overlays[siteId]) {
            this.overlays[siteId].setMap(null);
            delete this.overlays[siteId];
        }
        this.removeRangeRings(siteId);
    }

    // Subclasses implement how to get overlay for a given marker/site
    createOverlayForSite(marker) {
        throw new Error("Not implemented");
    }

    onMarkerClick(event, marker) {
        throw new Error("Not implemented");
    }
};

window.BaseRadarLayer = BaseRadarLayer;