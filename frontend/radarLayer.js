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
        this.hoverTimeout = null;

        this.rangeCircles = {};
        this.activeRangeDistances = new Set([50000, 100000, 150000, 200000, 230000]);
        this.showRangeCircles = false;
    }

    async init() {
        await this.precalculatedRadarSitesMarkers.init({
            marker_options: {
                markerFill: 'red',
                markerStroke: 'red',
                markerSize: 4.5
            }
        });

        await this.dynamicRadarSitesMarkers.init({
            marker_options: {
                markerFill: 'purple',
                markerStroke: 'purple',
                markerSize: 4.5
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

        // Master "Show Range Rings" checkbox
        const radarRangeCheckbox = document.getElementById("radar-range-checkbox");
        radarRangeCheckbox.addEventListener("change", (e) => {
            this.showRangeCircles = e.target.checked;
            this.updateAllRangeCircles();
        });

        // Individual distance checkboxes
        const rangeCheckboxes = document.querySelectorAll(".range-checkbox");
        rangeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                const radius = parseInt(checkbox.dataset.distance);
                if (checkbox.checked) {
                    this.activeRangeDistances.add(radius);
                } else {
                    this.activeRangeDistances.delete(radius);
                }
                this.updateAllRangeCircles();
            });
        });

        const unitsInput = document.getElementById("units-input");
        unitsInput.addEventListener("change", () => {
            this.updateRangeRingLabels();
        });
        this.updateRangeRingLabels();

        const radarSubmitBtn = document.getElementById("radar-submit-btn");
        radarSubmitBtn.addEventListener("click", () => {
            const lat = parseFloat(document.getElementById("radarLat").value);
            const lng = parseFloat(document.getElementById("radarLon").value);

            if (isNaN(lat) || isNaN(lng)) {
                alert("Please enter valid latitude and longitude values.");
                return;
            }

            radarLayer.submitCoverageRequest(lat, lng);
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
        const response = await fetch("public/data/nexrad_coverages/radar_bounds.json");
        this.boundsData = await response.json();
    }

    precalculatedRadarSiteClicked(event, marker) {
        const siteID = marker.properties.id;
        if (this.precalcOverlay[siteID]) {
            // If overlay already exists for this site, remove it
            this.precalcOverlay[siteID].setMap(null);
            delete this.precalcOverlay[siteID];
            this.updateRangeCircles(siteID);
            return;
        }
        this._addPrecalculatedOverlay(marker);
        this.updateRangeCircles(siteID);
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
        this.addRangeCircles(marker, id);
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
                    id: `${lat}${lng}`,
                },
                clickable: true
            },
            {clickable: true}
        );
        this.dynamicOverlayOrder.push(marker.properties.id);
        this.addRangeCircles(marker, marker.properties.id);
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

        const serverUrl = window._env_prod.SERVER_URL;
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

        this.dynamicOverlay[marker.properties.id] = overlay;
        this.updateRangeCircles(marker.properties.id);
    }

    dynamicRadarSiteClicked(event, marker) {
        const siteID = marker.properties.id;
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
        this.updateRangeCircles(siteID);
    }

    precalculatedRadarSiteHover(event, marker) {
        const { id, name, lat, lng, elev_ft, tower_ft } = marker.properties;

        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = setTimeout(() => {
            const popupContent = this.createLabel(id, name, lat, lng, elev_ft, tower_ft);

            this.activePopup = new markerTip(
                new google.maps.LatLng(lat, lng),
                "arrow_btm_box",
                popupContent
            );
            this.activePopup.setMap(this.map);
        }, 366); // Delay in ms
    }

    createLabel(id, name, lat, lng, elev_ft, tower_ft) {
        const useMetric = (window.currentUnitSystem === "metric");

        const elev = useMetric ? `${(elev_ft * 0.3048).toFixed(0)} m` : `${elev_ft} ft`;
        const tower = useMetric ? `${(tower_ft * 0.3048).toFixed(0)} m` : `${tower_ft} ft`;

        const div = document.createElement("div");
        div.innerHTML = `
            <div>
                <strong>${id} - ${name}</strong><br>
                Lat: ${lat.toFixed(4)}<br>
                Lng: ${lng.toFixed(4)}<br>
                Elev: ${elev}<br>
                Tower: ${tower}
            </div>
        `;
        return div;
    }

    precalculatedRadarSiteHoverEnd() {
        clearTimeout(this.hoverTimeout);

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
            console.log("Removing overlay for site ID:", mostRecentSiteID);
            overlay.setMap(null);
            delete this.dynamicOverlay[mostRecentSiteID];
        }

        // Remove marker from the map and collection
        const marker = this.dynamicRadarSitesMarkers.getMarker(mostRecentSiteID);
        if (marker) {
            console.log("Removing marker for site ID:", mostRecentSiteID);
            marker.setMap(null);
            delete this.dynamicRadarSitesMarkers.markers[mostRecentSiteID];
            this.removeRangeCircles(mostRecentSiteID);
        }
    }

    addRangeCircles(marker, siteID) {
        if (!this.rangeCircles[siteID]) {
            this.rangeCircles[siteID] = {};
        }

        for (const radius of [50000, 100000, 150000, 200000, 230000]) {
            // Avoid recreating existing
            if (this.rangeCircles[siteID][radius]) continue;

            const circle = new google.maps.Circle({
                strokeColor: '#000000ff',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillOpacity: 0.0,
                map: null,
                center: marker.getPosition(),
                radius: radius,
                clickable: false,
            });

            this.rangeCircles[siteID][radius] = circle;
        }

        this.updateRangeCircles(siteID);
    }

    updateRangeCircles(siteID) {
        const visible = this.showRangeCircles;
        const siteCircles = this.rangeCircles[siteID];
        if (!siteCircles) return;

        for (const radius in siteCircles) {
            const circle = siteCircles[radius];
            const shouldShow = visible && this.activeRangeDistances.has(parseInt(radius));

            // Get the associated marker (precalc or dynamic)
            const marker = this.precalculatedRadarSitesMarkers.getMarker(siteID) ||
                        this.dynamicRadarSitesMarkers.getMarker(siteID);

            const overlay = this.precalcOverlay[siteID] || this.dynamicOverlay[siteID];
            const overlayVisible = overlay && overlay.getMap() !== null;
            const markerVisible = marker && marker.getMap() !== null;

            circle.setMap(shouldShow && markerVisible && overlayVisible ? this.map : null);

        }
    }

    updateAllRangeCircles() {
        for (const siteID in this.rangeCircles) {
            this.updateRangeCircles(siteID);
        }
    }

    removeRangeCircles(siteID) {
        if (!this.rangeCircles[siteID]) return;

        for (const radius in this.rangeCircles[siteID]) {
            const circle = this.rangeCircles[siteID][radius];
            circle.setMap(null);
        }

        delete this.rangeCircles[siteID];
    }

    updateRangeRingLabels() {
        const useMetric = (document.getElementById("units-input").value === "metric");

        const rangeCheckboxes = document.querySelectorAll(".range-checkbox");
        rangeCheckboxes.forEach(checkbox => {
            const label = checkbox.parentElement;
            const radiusMeters = parseInt(checkbox.dataset.distance);

            const labelText = useMetric
                ? `${radiusMeters / 1000} km`
                : `${Math.round(radiusMeters / 1609.34)} mi`;

            label.childNodes[1].textContent = ` ${labelText}`;
        });
    }

    validateRadarCoordinates() {
        
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

    async submitCoverageRequest(lat, lng) {
        if (this.isLoading) return;

        const maxAlt = getInput(document.getElementById("aglThreshold-input"));
        const towerHeight = getInput(document.getElementById("towerHeight-input"));

        const unitSystem = document.getElementById("units-input").value;
        const feetToMeters = (m) => m / 3.28084;

        let alt_m = null;
        let tower_m = null;
        if (maxAlt !== null) {
            alt_m = unitSystem === "metric" ? maxAlt : feetToMeters(maxAlt);
        }
        if (towerHeight !== null) {
            tower_m = unitSystem === "metric" ? towerHeight : feetToMeters(towerHeight);
        }

        const angles = getCheckedElevationAngles();

        try {
            await this.getCoverage(lat, lng, alt_m, tower_m, angles);
        } catch (err) {
            console.error("Error in radarLayer.getCoverage", err);
        }
    }
}

window.RadarLayer = RadarLayer;