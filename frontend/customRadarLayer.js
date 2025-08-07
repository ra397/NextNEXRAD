class CustomRadarLayer {
    constructor(map) {
        this.map = map;

        this.customOverlay = {}; // Key: radar site ID (counter), Value: overlay object
        this.customRadarCounter = 0;
        this.customRadarMarkers = new markerCollection(this.map);
        this.customRadarMarkers.reactClick = this.customRadarSiteClicked.bind(this);
    }

    async initUI() {
        // Initialize event handlers
        this.customRadarSubmit();
        this.toggleRadar();
        this.deleteRadar();

        await this.customRadarMarkers.init({
            marker_options: {
                markerFill: 'blue',
                markerStroke: 'blue',
                markerSize: 4.5,
            }
        });
    }

    getCheckedElevationAngles() {
        const checkboxes = document.querySelectorAll('#elevation-angle-checkboxes input[type="checkbox"]');
        return Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => parseFloat(cb.value));
    }

    customRadarSubmit() {
        const submitBtn = document.getElementById("radar-submit-btn");
        submitBtn.addEventListener("click", (e) => {
            const params = this.getCustomRadarParameters();
            if (params === null) {
                return; // Invalid parameters, do not proceed
            }
            const marker = this.addCustomRadarMarker(params);
            this.addCustomRadarOverlay(marker);
        });
    }

    toggleRadar() {
        document.getElementById("toggle-dynamic-radar").addEventListener("click", (e) => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            const marker = this.customRadarMarkers.getMarker(siteId);
            const overlay = this.customOverlay[siteId];

            if (marker && overlay) {
                if (overlay.getMap()) {
                    overlay.setMap(null);
                } else {
                    overlay.setMap(this.map);
                }
            }
        });
    }

    deleteRadar() {
        document.getElementById("delete-dynamic-radar").addEventListener("click", (e) => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            const marker = this.customRadarMarkers.getMarker(siteId);
            const overlay = this.customOverlay[siteId];

            if (overlay) {
                overlay.setMap(null);
                delete this.customOverlay[siteId];
            }
            if (marker) {
                this.customRadarMarkers.deleteMarker(siteId);
            }
            toggleWindow('arbitrary-radar-show');
        });
    }

    addCustomRadarMarker(params) {
        const marker = this.customRadarMarkers.makeMarker(
            params.lat,
            params.lng,
            {
                properties: {
                    id: ++this.customRadarCounter,
                    lat: params.lat,
                    lng: params.lng,
                    aglThreshold: params.aglThreshold,
                    towerHeight: params.towerHeight,
                    elevationAngles: params.elevationAngles
                }
            },
            {
                clickable: true
            }
        );
        return marker;
    }
    
    async addCustomRadarOverlay(marker) {
        const params = marker.properties;
        const [x5070, y5070] = proj4('EPSG:4326', 'EPSG:5070', [params.lng, params.lat]);
        const requestBody = {
            easting: x5070,
            northing: y5070,
            max_alt_m: params.aglThreshold,
            tower_m: params.towerHeight,
            elevation_angles: params.elevationAngles
        };

        const serverUrl = window._env_dev.SERVER_URL;
        const response = await fetch(`${serverUrl}/calculate_blockage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log("Received overlay data:", data);

        const sw = new google.maps.LatLng(data.bounds.south, data.bounds.west);
        const ne = new google.maps.LatLng(data.bounds.north, data.bounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);
        const overlay = customOverlay(data.image_url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);

        this.customOverlay[params.id] = overlay;
    }

    getCustomRadarParameters() {
        const lat = parseFloat(document.getElementById("radarLat").value);
        const lng = parseFloat(document.getElementById("radarLng").value);
        
        if (isNaN(lat) || lat < -90 || lat > 90) {
            console.error("Latitude must be a number between -90 and 90.");
            return null;
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            console.error("Longitude must be a number between -180 and 180.");
            return null;
        }

        const aglThreshold = parseFloat(document.getElementById("aglThreshold-input").value);
        if (isNaN(aglThreshold) || aglThreshold < 0) {
            console.error("AGL Threshold must be a non-negative number.");
            return null;
        }

        const towerHeight = parseFloat(document.getElementById("towerHeight-input").value);
        if (isNaN(towerHeight) || towerHeight < 0) {
            console.error("Tower Height must be a non-negative number.");
            return null;
        }

        const selectedElevationAngles = this.getCheckedElevationAngles();
        if (selectedElevationAngles.length === 0) {
            console.error("At least one elevation angle must be selected.");
            return null;
        }

        return {
            lat: lat,
            lng: lng,
            aglThreshold: aglThreshold,
            towerHeight: towerHeight,
            elevationAngles: selectedElevationAngles
        }
    }


    customRadarSiteClicked(event, marker) {
        const panel = document.getElementById('arbitrary-radar-show');
        // Only toggle if the panel is currently hidden
        if (panel.style.display === 'none' || getComputedStyle(panel).display === 'none') {
            toggleWindow('arbitrary-radar-show');
        }

        this.populateDynamicRadarPanel(marker);
    }


    populateDynamicRadarPanel(marker) {
        const props = marker.properties;

        // Set basic fields
        document.getElementById("dynamic-radar-site-id").value = props.id || "";
        document.getElementById("dynamic-radar-site-lat").value = props.lat || "";
        document.getElementById("dynamic-radar-site-lng").value = props.lng || "";
        document.getElementById("dynamic-radar-site-tower-height").value = props.towerHeight || "";
        document.getElementById("dynamic-radar-site-max-alt").value = props.aglThreshold || "";

        // Set elevation angle checkboxes
        const checkboxes = document.querySelectorAll("#show-elevation-angle-checkboxes input[type='checkbox']");
        const selectedAngles = props.elevationAngles || [];

        checkboxes.forEach(cb => {
            cb.checked = selectedAngles.includes(parseFloat(cb.value));
        });
    }

    ft2m(feet) {
        if (typeof feet !== "number" || isNaN(feet)) {
            throw new Error("Input must be a valid number.");
        }
        return feet * 0.3048;
    }
    
    m2ft(meters) {
        if (typeof meters !== "number" || isNaN(meters)) {
            throw new Error("Input must be a valid number.");
        }
        return meters / 0.3048;
    }
};
window.CustomRadarLayer = CustomRadarLayer;