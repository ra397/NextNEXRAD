class RadarLayer {
    constructor(map, radar_sites_path, radar_coverage_path) {
        this.map = map;

        this.radar_sites_path = radar_sites_path;
        this.radar_coverage_path = radar_coverage_path;

        this.halfExtent = window.constants.radar.halfExtent;

        this.precalculatedRadarSitesMarkers = new markerCollection(this.map);
        this.dynamicRadarSitesMarkers = new markerCollection(this.map);

        this.precalcOverlay = {};
        this.dynamicOverlay = {};

        this.dynamicOverlayOrder = []; // Keeps track of the order each dynamic overlay is created

        this.precalculatedFolder = 'coverages_3k'; // default threshold

        this.spinner = null;
        this.isLoading = false;

        this.geod = geodesic.Geodesic.WGS84;

        this.boundsData = null;

        this.isSelectModeActive = false;
    }

    async init() {
        await this.precalculatedRadarSitesMarkers.init({
            marker_options: {
                markerFill: 'red',
                markerStroke: 'red',
                markerSize: 3.5
            }
        });

        await this.dynamicRadarSitesMarkers.init({
            marker_options: {
                markerFill: 'purple',
                markerStroke: 'purple',
                markerSize: 3.5
            }
        })

        this.precalculatedRadarSitesMarkers.reactClick = this.precalculatedRadarSiteClicked.bind(this);
        this.dynamicRadarSitesMarkers.reactClick = this.dynamicRadarSiteClicked.bind(this);
        
        this.loadPrecalculatedRadarSites();
        this.loadBounds();
    }

    initUI() {
        this.spinner = document.getElementById("loading-spinner");

        const threeThousandThresholdRadioButton = document.getElementById("3k_coverage");
        const sixThousandThresholdRadioButton = document.getElementById("6k_coverage");
        const tenThousandThresholdRadioButton = document.getElementById("10k_coverage");

        threeThousandThresholdRadioButton.addEventListener("change", () => {
            this.setPrecalculatedFolder("coverages_3k");
        });

        sixThousandThresholdRadioButton.addEventListener("change", () => {
            this.setPrecalculatedFolder("coverages_6k");
        });

        tenThousandThresholdRadioButton.addEventListener("change", () => {
            this.setPrecalculatedFolder("coverages_10k");
        });

        const undoMostRecentDynamicRadarCoverage = document.getElementById("remove-most-recent-radar-coverage");
        undoMostRecentDynamicRadarCoverage.addEventListener("click", () => {
            this.removeMostRecentDynamicMarkerandOverlay();
        })

        const radarModeCheckbox = document.getElementById("radar-mode-checkbox");
        radarModeCheckbox.addEventListener("change", (e) => {
            this.isSelectModeActive = e.target.checked;
            console.log(this.isSelectModeActive);
            this.map.setOptions({
                draggableCursor: this.isSelectModeActive ? "crosshair" : "pointer"
            });
        });
    }

    // Loads the radar sites from a GeoJSON file and creates markers for each site
    loadPrecalculatedRadarSites() {
        fetch(this.radar_sites_path)
        .then(response => response.json())
        .then(data => {
            for (let i = 0; i < data.features.length; i++) {
                const description = data.features[i].properties.description;
                const siteData = this._extractSiteData(description);
                const coords = {
                    latitude: siteData.latitude,
                    longitude: siteData.longitude,
                };

                this.precalculatedRadarSitesMarkers.makeMarker(
                    coords.latitude,
                    coords.longitude,
                    {
                    properties: {
                        siteID : siteData.siteId,
                        latitude: siteData.latitude,
                        longitude: siteData.longitude,
                        elevation: siteData.elevation,
                    },
                    clickable: true,
                    optimized: true
                    },
                    {
                    clickable: true,
                    mouseOver: false,
                    mouseOut: false
                    }
                );
            }
        });
    }

    async loadBounds() {
        const response = await fetch("/public/data/nexrad_coverages/radar_bounds.json");
        this.boundsData = await response.json();
    }

    precalculatedRadarSiteClicked(event, marker) {
        const siteID = marker.properties.siteID;
        if (this.precalcOverlay[siteID]) {
            // If overlay already exists for this site, remove it
            this.precalcOverlay[siteID].setMap(null);
            delete this.precalcOverlay[siteID];
            return;
        }
        this._addPrecalculatedOverlay(marker);
    }

    _addPrecalculatedOverlay(marker) {
        const {siteID, latitude, longitude, elevation} = marker.properties;
        const url = `${this.radar_coverage_path}/${this.precalculatedFolder}/${siteID}.png`;
        const overlayBounds = this.boundsData[siteID];

        const sw = new google.maps.LatLng(overlayBounds.south, overlayBounds.west);
        const ne = new google.maps.LatLng(overlayBounds.north, overlayBounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.5);


        this.precalcOverlay[siteID] = overlay;
    }

    setPrecalculatedFolder(folder) {
        this.precalculatedFolder = folder;

        // Remove existing precalculated overlays from map
        for (const siteID in this.precalcOverlay) {
            this.precalcOverlay[siteID].setMap(null);
        }

        for (const siteID in this.precalcOverlay) {
            const marker = this.precalculatedRadarSitesMarkers.getMarker(siteID);
            if (marker) {
                this._addPrecalculatedOverlay(marker);
            }
        }
    }

    async getCoverage(lat, lng, maxAlt, towerHeight, elevationAngles) {
        if (this.isLoading) {
            return;
        }
        const marker = this._addDynamicMarker(lat, lng);
        this.isLoading = true;
        this.showSpinner();
        try {
            await this._sendCoverageRequest(marker, lat, lng, maxAlt, towerHeight, elevationAngles);
        } catch (err) {
            console.error("Error fetching coverage:", err);
        } finally {
            this.isLoading = false;
            this.hideSpinner();
        }
    }

    _addDynamicMarker(lat, lng) {
        // Add marker to dynamic radars marker collection
        const marker = this.dynamicRadarSitesMarkers.makeMarker(
            lat,
            lng,
            {
                properties: {
                    siteID: `${lat}${lng}`,
                },
                clickable: true
            },
            {clickable: true}
        );
        this.dynamicOverlayOrder.push(marker.properties.siteID);
        return marker;
    }

    async _sendCoverageRequest(marker, lat, lng, maxAlt, towerHeight, elevationAngles) {
        const [x5070, y5070] = proj4('EPSG:4326', 'EPSG:5070', [lng, lat]);

        const payload = {
            easting: x5070,
            northing: y5070,
            max_alt_m: maxAlt,
            tower_m: towerHeight,
            elevation_angles: elevationAngles,
        };

        const serverUrl = window._env_dev.SERVER_URL;
        const response = await fetch(`${serverUrl}/calculate_blockage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        const sw = new google.maps.LatLng(result.bounds.south, result.bounds.west);
        const ne = new google.maps.LatLng(result.bounds.north, result.bounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);
        const overlay = customOverlay(result.image_url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.5);

        this.dynamicOverlay[marker.properties.siteID] = overlay;
    }

    dynamicRadarSiteClicked(event, marker) {
        const siteID = marker.properties.siteID;
        const overlay = this.dynamicOverlay[siteID];
        if (!overlay) {
            console.warn(`No overlay found for dynamic site ${siteID}`);
            return;
        }
        const isVisible = overlay.getMap() !== null;
        if (isVisible) {
            overlay.setMap(null); // Hide
        } else {
            overlay.setMap(this.map); // Show again
        }
    }

    // Helper: extracts site data from the description
    _extractSiteData(description) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(description, 'text/html');
        const tdElements = Array.from(doc.querySelectorAll('td'));

        let siteId = null;
        let latitude = null;
        let longitude = null;
        let elevation = null;

        tdElements.forEach(td => {
            const text = td.textContent.trim();

            if (text.startsWith("SITE ID")) {
            const match = text.match(/NEXRAD:([A-Z0-9]+)/);
            if (match) siteId = match[1];
            } else if (text.startsWith("LATITUDE")) {
            latitude = parseFloat(text.replace("LATITUDE", "").trim());
            } else if (text.startsWith("LONGITUDE")) {
            longitude = parseFloat(text.replace("LONGITUDE", "").trim());
            } else if (text.startsWith("ELEVATION")) {
            elevation = parseFloat(text.replace("ELEVATION", "").trim());
            }
        });
        return { siteId, latitude, longitude, elevation };
    }

    removeMostRecentDynamicMarkerandOverlay() {
        if (this.dynamicOverlayOrder.length === 0) return;

        const mostRecentSiteID = this.dynamicOverlayOrder.pop();

        // Remove overlay from map and dictionary
        const overlay = this.dynamicOverlay[mostRecentSiteID];
        if (overlay) {
            overlay.setMap(null);
            delete this.dynamicOverlay[mostRecentSiteID];
        }

        // Remove marker from the map and collection
        const marker = this.dynamicRadarSitesMarkers.getMarker(mostRecentSiteID);
        if (marker) {
            marker.setMap(null);
            delete this.dynamicRadarSitesMarkers.markers[mostRecentSiteID]; 
        }
    }

    showSpinner() {
        if (this.spinner) {
            this.spinner.style.display = "block";
        }
    }

    hideSpinner() {
        if (this.spinner) {
            this.spinner.style.display = "none";
        }
    }
}

window.RadarLayer = RadarLayer;