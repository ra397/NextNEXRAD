class BaseRadarLayer {
    constructor(map, markerOptions) {
        this.map = map;
        this.markers = new markerCollection(map);
        this.overlays = {}; // siteId -> overlay
        this.rings = {}; // siteId -> array of circle overlays
        this.markerOptions = markerOptions;
        this.currentSiteId = null; // track which site's panel is currently open
        this.rangeRingStates = {}; // siteId -> {sliderValue: number}
        this.rangeDistances = [0, 50000, 100000, 150000, 200000, 230000]; // slider index -> distance in meters
        this.rangeLabels = ['None', '50', '100', '150', '200', '230']; // slider index -> label
    }

    async initMarkers() {
        await this.markers.init({ marker_options: this.markerOptions });
        this.markers.reactClick = this.onMarkerClick.bind(this);
    }

    // Initialize range ring slider controls for a specific site's panel
    initSiteRangeRingControls(siteId, rangeSliderId) {
        this.currentSiteId = siteId;
        
        // Get or create state for this site
        if (!this.rangeRingStates[siteId]) {
            this.rangeRingStates[siteId] = {
                sliderValue: 0 // Default to "None"
            };
        }
        
        const state = this.rangeRingStates[siteId];
        
        const rangeSlider = document.getElementById(rangeSliderId);

        if (!rangeSlider) {
            console.warn(`Range slider element not found: ${rangeSliderId}`);
            return;
        }

        // Set slider based on saved state
        rangeSlider.value = state.sliderValue;

        // Remove old event listeners by cloning the element
        const newRangeSlider = rangeSlider.cloneNode(true);
        rangeSlider.parentNode.replaceChild(newRangeSlider, rangeSlider);
        
        // Add new event listener
        newRangeSlider.addEventListener('input', () => {
            this.updateSiteRangeRings(siteId, rangeSliderId);
        });
    }

    updateSiteRangeRings(siteId, rangeSliderId) {
        // Remove existing rings for this site
        this.removeRangeRings(siteId, false);

        // Get current slider value
        const rangeSlider = document.getElementById(rangeSliderId);
        
        if (!rangeSlider) {
            return;
        }

        const sliderValue = parseInt(rangeSlider.value, 10);
        
        // Save current state
        this.rangeRingStates[siteId] = {
            sliderValue: sliderValue
        };

        // If slider is at "None" (0), don't show any rings
        if (sliderValue === 0) {
            return;
        }

        // Get marker position
        const marker = this.markers.getMarker(siteId);
        if (!marker) {
            return;
        }

        // Create rings for all distances up to the selected value
        const rings = [];
        for (let i = 1; i <= sliderValue; i++) {
            const distance = this.rangeDistances[i];
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
        }

        this.rings[siteId] = rings;
    }

    showRangeRings(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(this.map);
            });
        }
    }

    hideRangeRings(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(null);
            });
        }
    }

    removeRangeRings(siteId, updateState = true) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(ring => {
                ring.setMap(null);
            });
            delete this.rings[siteId];
        }
        
        // Only update state if explicitly requested
        if (updateState && this.rangeRingStates[siteId]) {
            this.rangeRingStates[siteId].sliderValue = 0;
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
        // Don't automatically show rings - wait for user to enable them via slider
    }

    removeOverlay(siteId) {
        // Base just removes overlay; Custom will override to also remove marker
        if (this.overlays[siteId]) {
            this.overlays[siteId].setMap(null);
            delete this.overlays[siteId];
        }
        this.removeRangeRings(siteId);
    }

    // Clean up state when a site is completely removed
    cleanupSiteState(siteId) {
        delete this.rangeRingStates[siteId];
        this.removeRangeRings(siteId);
    }

    // Helper method to get the current range setting for a site (for debugging/status)
    getCurrentRangeSetting(siteId) {
        const state = this.rangeRingStates[siteId];
        if (!state) return 'None';
        return this.rangeLabels[state.sliderValue];
    }

    // Subclasses implement how to get overlay for a given marker/site
    createOverlayForSite(marker) {
        throw new Error("Not implemented");
    }

    onMarkerClick(event, marker) {
        this.markers.highlightMarker(marker);
        this.handleMarkerClick(event, marker);
    }

    handleMarkerClick(event, marker) {
        throw new Error("handleMarkerClick must be implemented by child classes");
    }
}

window.BaseRadarLayer = BaseRadarLayer;