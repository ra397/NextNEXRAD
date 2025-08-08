class BaseRadarLayer {
    constructor(map, markerOptions) {
        this.map = map;
        this.markers = new markerCollection(map);
        this.overlays = {}; // siteId -> overlay
        this.markerOptions = markerOptions;
    }

    async initMarkers() {
        await this.markers.init({ marker_options: this.markerOptions });
        this.markers.reactClick = this.onMarkerClick.bind(this);
    }

    toggleOverlay(siteId) {
        const overlay = this.overlays[siteId];
        if (!overlay) return;
        overlay.setMap(overlay.getMap() ? null : this.map);
    }

    addOverlay(siteId, overlay) {
        this.overlays[siteId] = overlay;
    }

    removeOverlay(siteId) {
        // Base just removes overlay; Custom will override to also remove marker
        if (this.overlays[siteId]) {
            this.overlays[siteId].setMap(null);
            delete this.overlays[siteId];
        }
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