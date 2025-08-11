class BaseRadarLayer {
    constructor(map, markerOptions) {
        this.map = map;
        this.markers = new markerCollection(map);
        this.overlays = {}; // siteId -> overlay
        this.rings = {}; // siteId -> array of circle overlays
        this.markerOptions = markerOptions;
        this.currentSiteId = null; // track which site's panel is currently open
        this.rangeRingStates = {}; // siteId -> {masterChecked: boolean, distances: []}
    }

    async initMarkers() {
        await this.markers.init({ marker_options: this.markerOptions });
        this.markers.reactClick = this.onMarkerClick.bind(this);
    }

    // Initialize range ring controls for a specific site's panel
    initSiteRangeRingControls(siteId, masterCheckboxId, rangeCheckboxClass) {
        this.currentSiteId = siteId;
        
        // Get or create state for this site
        if (!this.rangeRingStates[siteId]) {
            this.rangeRingStates[siteId] = {
                masterChecked: false,
                distances: [50000, 100000, 150000, 200000, 230000] // default checked distances
            };
        }
        
        const state = this.rangeRingStates[siteId];
        
        const masterCheckbox = document.getElementById(masterCheckboxId);
        const rangeCheckboxes = document.querySelectorAll(`.${rangeCheckboxClass}`);

        // Set master checkbox based on saved state
        if (masterCheckbox) {
            masterCheckbox.checked = state.masterChecked;
            // Remove old event listeners by cloning the element
            const newMasterCheckbox = masterCheckbox.cloneNode(true);
            masterCheckbox.parentNode.replaceChild(newMasterCheckbox, masterCheckbox);
            
            newMasterCheckbox.addEventListener('change', () => {
                this.updateSiteRangeRings(siteId, masterCheckboxId, rangeCheckboxClass);
            });
        }

        // Set distance checkboxes based on saved state
        rangeCheckboxes.forEach(checkbox => {
            const distance = parseInt(checkbox.dataset.distance, 10);
            checkbox.checked = state.distances.includes(distance);
            // Remove old event listeners by cloning the element
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            
            newCheckbox.addEventListener('change', () => {
                this.updateSiteRangeRings(siteId, masterCheckboxId, rangeCheckboxClass);
            });
        });
    }

    updateSiteRangeRings(siteId, masterCheckboxId, rangeCheckboxClass) {
        // Remove existing rings for this site (but don't update state yet)
        this.removeRangeRings(siteId, false);

        // Save current state first
        const masterCheckbox = document.getElementById(masterCheckboxId);
        const rangeCheckboxes = document.querySelectorAll(`.${rangeCheckboxClass}:checked`);
        
        this.rangeRingStates[siteId] = {
            masterChecked: masterCheckbox ? masterCheckbox.checked : false,
            distances: Array.from(rangeCheckboxes).map(cb => parseInt(cb.dataset.distance, 10))
        };

        // Check if master checkbox is enabled
        if (!masterCheckbox || !masterCheckbox.checked) {
            return;
        }

        // Get marker position (don't require overlay to be visible)
        const marker = this.markers.getMarker(siteId);
        if (!marker) {
            return;
        }

        // Create rings for checked distances
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
            this.rangeRingStates[siteId].masterChecked = false;
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
        // Don't automatically show rings - wait for user to enable them in the panel
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

    // Subclasses implement how to get overlay for a given marker/site
    createOverlayForSite(marker) {
        throw new Error("Not implemented");
    }

    onMarkerClick(event, marker) {
        throw new Error("Not implemented");
    }
}

window.BaseRadarLayer = BaseRadarLayer;