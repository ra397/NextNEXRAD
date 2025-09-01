class RadarLayer {
    constructor(map) {
        this.map = map;

        this.nexradMarkers = new markerCollection(this.map);
        this.customMarkers = new markerCollection(this.map);

        this.initializeNexrad();
        this.initializeCustomMarkers();

        this.nexradBounds = {};

        this.radars = [];

        this.currentRadarId = 0;
    }

    async loadNexradBounds() {
        const res_nexradBounds = await fetch('public/data/nexrad_coverages/radar_bounds.json');
        this.nexradBounds = await res_nexradBounds.json();
    }

    initializeNexrad = async () => {
        const res_nexradInfo = await fetch('public/data/nexrad_conus.json');
        const sites = await res_nexradInfo.json();

        await this.nexradMarkers.init({
            map: this.map, 
            use_advanced: false,
            marker_options: { markerFill: '#FF0000', markerStroke: '#FF0000', markerSize: 4.5 }
        });
        
        for (const site of sites) {
            this.nexradMarkers.makeMarker(site.lat, site.lng, {properties: {id: site.id}}, {clickable: true, mouseOver: true, mouseOut: true});

            this.radars.push({
                id: site.id,
                params: {
                    lat: site.lat,
                    lng: site.lng,
                    tower_height_m: parseFloat(ft2m(site.tower)),
                    agl_threshold_m: 914.4,
                    elevation_angles: {
                        min: 0.5,
                        max: 19.5,
                    }
                },
                overlay: null
            });
        }
    };

    initializeCustomMarkers = async () => {
        await this.customMarkers.init({
            map: this.map, 
            use_advanced: false,
            marker_options: { markerFill: '#0000FF', markerStroke: '#0000FF', markerSize: 4.5 }
        });
    }

    async newRadarRequest(params) {
        // Check for duplicates
        if (this.radars.some(radar => this.isEqual(params, radar.params))) {
            showError("Duplicate Radar.");
            return null;
        }
        
        // Fetch coverage and create radar
        const overlay = await this.fetchCoverage(params);
        if (!overlay) return null;
        
        const newRadar = {
            id: ++this.currentRadarId,
            params: params,
            overlay: overlay,
        };
        // make a marker 
        this.addMarker(newRadar.id, params.lat, params.lng);

        // Add to cache
        this.radars.push(newRadar);
        return newRadar;
    }

    async updateRadar(id, params) {
        // Check if params are duplicate
        if (this.radars.some(radar => this.isEqual(params, radar.params))) {
            showError("Duplicate Radar.");
            return null;
        }

        // Find radar to update
        let radarToUpdateIndex = -1;
        let radarToUpdate;
        for (let i = 0; i < this.radars.length; i ++) {
            if (this.radars[i].id == id) {
                radarToUpdate = this.radars[i];
                radarToUpdateIndex = i;
                break;
            }
        }
        console.log("The radar we are tring to update is below:");
        console.log(radarToUpdate);

        // Update radar params and overlay, keep ID the same
        const overlay = await this.fetchCoverage(params);
        if (!overlay) return null;

        if (radarToUpdate.overlay) {
            radarToUpdate.overlay.setMap(null);
            radarToUpdate.overlay = null;
        }

        radarToUpdate.overlay = overlay;
        radarToUpdate.overlay.setMap(this.map);

        const updated = {
            id: radarToUpdate.id,
            params: params,
            overlay: overlay,
        };
        this.radars[radarToUpdateIndex] = updated;
        return updated;
    }

    deleteRadar(id) {
        // Remove marker
        this.customMarkers.deleteMarker(id);

        // Find radar
        let radarIndex = -1;
        let radar;
        for (let i = 0; i < this.radars.length; i ++) {
            if (this.radars[i].id == id) {
                radar = this.radars[i];
                radarIndex = i;
                break;
            }
        }
        console.log("The radar we are trying to delete is below:");
        console.log(radar);
        // Remove overlay
        radar.overlay.setMap(null);
        radar.ovlerlay = null;
        // Remove from cache
        if (radarIndex != -1) {
            this.radars.splice(radarIndex, 1);
        }
    }

    async fetchCoverage(p) {
        const steps = [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5];

        console.log(p);

        const [x5070, y5070] = proj4('EPSG:4326', 'EPSG:5070', [p.lng, p.lat]);
        const body = {
            easting: x5070, northing: y5070,
            max_alt_m: p.agl_threshold_m,
            tower_m: p.tower_height_m,
            elevation_angles: steps.slice(p.elevation_angles.min, p.elevation_angles.max + 1),
            color: window.overlay_color
        };

        let data;
        try {
            showSpinner();
            const res = await fetch(`${window._env_prod.SERVER_URL}/calculate_blockage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            data = await res.json();
        } catch (error) {
            showError("Request failed: ", error);
            hideSpinner();
            return null;
        }

        const sw = new google.maps.LatLng(data.bounds.south, data.bounds.west);
        const ne = new google.maps.LatLng(data.bounds.north, data.bounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(data.image_url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);
        hideSpinner();
        return overlay;
    }

    toggleOverlay(id) {
        // Find radar whose overlay we will toggle
        let radarToToggleIndex = -1;
        let radarToToggle;
        for (let i = 0; i < this.radars.length; i ++) {
            if (this.radars[i].id == id) {
                radarToToggle = this.radars[i];
                radarToToggleIndex = i;
                break;
            }
        }
        if (!radarToToggle.overlay) return;
        const isOverlayVisible = radarToToggle.overlay.getMap();
        radarToToggle.overlay.setMap(isOverlayVisible ? null : this.map);
    }

    getPrecalculatedOverlay(siteId) {
        const url = `public/data/nexrad_coverages/coverages_3k/${siteId}.png`;

        const overlayBounds = this.nexradBounds[siteId];
        const sw = new google.maps.LatLng(overlayBounds.south, overlayBounds.west);
        const ne = new google.maps.LatLng(overlayBounds.north, overlayBounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);  
        
        return overlay;
    }

    addMarker(site_id, lat, lng) {
        const marker = this.customMarkers.makeMarker(lat, lng, { properties: { id: site_id} }, { clickable: true });
        return marker;
    }

    isEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== typeof obj2) return false;
        if (typeof obj1 !== 'object') return obj1 === obj2;
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (let key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.isEqual(obj1[key], obj2[key])) return false;
        }
        return true;
    }
};
window.RadarLayer = RadarLayer;