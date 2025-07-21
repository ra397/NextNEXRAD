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

        this.activePopup = null;
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
        this.precalculatedRadarSitesMarkers.reactMouseOver = this.precalculatedRadarSiteHover.bind(this);
        this.precalculatedRadarSitesMarkers.reactMouseOut = this.precalculatedRadarSiteHoverEnd.bind(this);
        
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
            for (let i = 0; i < data.length; i++) {
                this.precalculatedRadarSitesMarkers.makeMarker(
                    data[i].lat,
                    data[i].lng,
                    {
                        properties: {
                            id: data[i].id,
                            name: data[i].name,
                            lat: data[i].lat,
                            lng: data[i].lng,
                            elev_ft: data[i].elev,
                            tower_ft: data[i].tower,
                        },
                        clickable: true,
                        mouseOver: true,
                        mouseOut: true,
                        optimized: true,
                    },
                    {
                        clickable: true,
                        mouseOver: true,
                        mouseOut: true,
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
        const siteID = marker.properties.id;
        if (this.precalcOverlay[siteID]) {
            // If overlay already exists for this site, remove it
            this.precalcOverlay[siteID].setMap(null);
            delete this.precalcOverlay[siteID];
            return;
        }
        this._addPrecalculatedOverlay(marker);
    }

    _addPrecalculatedOverlay(marker) {
        const {id, name, lat, lng, elev_ft, tower_ft} = marker.properties;
        const url = `${this.radar_coverage_path}/${this.precalculatedFolder}/${id}.png`;
        const overlayBounds = this.boundsData[id];

        const sw = new google.maps.LatLng(overlayBounds.south, overlayBounds.west);
        const ne = new google.maps.LatLng(overlayBounds.north, overlayBounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);

        this.precalcOverlay[id] = overlay;
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
        overlay.setOpacity(0.7);

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

    precalculatedRadarSiteHover(event, marker) {
        const { id, name, lat, lng, elev_ft, tower_ft } = marker.properties;

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
            <div>
                <strong>${id} - ${name}</strong><br>
                Lat: ${lat.toFixed(4)}<br>
                Lng: ${lng.toFixed(4)}<br>
                Elev: ${elev_ft} ft<br>
                Tower: ${tower_ft} ft
            </div>
        `;

        this.activePopup = new markerTip(
            new google.maps.LatLng(lat, lng),
            "arrow_btm_box",  // Make sure to define this CSS class
            popupContent
        );
        this.activePopup.setMap(this.map);
    }

    precalculatedRadarSiteHoverEnd() {
        if (this.activePopup) {
            this.activePopup.setMap(null);
            this.activePopup = null;
        }
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