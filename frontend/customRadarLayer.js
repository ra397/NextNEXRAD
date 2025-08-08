class CustomRadarLayer extends BaseRadarLayer {
    constructor(map, serverUrl) {
        super(map, { markerFill: 'blue', markerStroke: 'blue', markerSize: 4.5 });
        this.serverUrl = serverUrl;
        this.idCounter = 0;
    }

    async init() {
        await this.initMarkers();
        this.initUI();
    }

    initUI() {
        document.getElementById("radar-submit-btn").addEventListener("click", () => {
            const params = this.readForm();
            if (!params) return;
            const marker = this.addCustomMarker(params);
            this.fetchAndAddOverlay(marker);
        });

        document.getElementById("toggle-dynamic-radar").addEventListener("click", () => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            this.toggleOverlay(siteId);
        });

        document.getElementById("delete-dynamic-radar").addEventListener("click", () => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            this.removeOverlay(siteId);
            this.markers.deleteMarker(siteId);
            toggleWindow('arbitrary-radar-show');
        });
    }

    readForm() {
        const lat = parseFloat(document.getElementById("radarLat").value);
        const lng = parseFloat(document.getElementById("radarLng").value);
        const agl = parseFloat(document.getElementById("aglThreshold-input").value);
        const tower = parseFloat(document.getElementById("towerHeight-input").value);
        const angles = [...document.querySelectorAll('#elevation-angle-checkboxes input:checked')]
            .map(cb => parseFloat(cb.value));

        if ([lat, lng, agl, tower].some(v => isNaN(v)) || angles.length === 0) return null;
        return { lat, lng, agl, tower, angles };
    }

    addCustomMarker(params) {
        const id = ++this.idCounter;
        return this.markers.makeMarker(params.lat, params.lng, {
            properties: {                     
                id: id,
                lat: params.lat,
                lng: params.lng,
                aglThreshold: params.agl,
                towerHeight: params.tower,
                elevationAngles: params.angles
            }
        }, { clickable: true });
    }

    async createOverlayForSite(marker) {
        const p = marker.properties;
        const [x5070, y5070] = proj4('EPSG:4326', 'EPSG:5070', [p.lng, p.lat]);
        const body = {
            easting: x5070, northing: y5070,
            max_alt_m: p.aglThreshold, tower_m: p.towerHeight,
            elevation_angles: p.elevationAngles
        };

        const res = await fetch(`${this.serverUrl}/calculate_blockage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        const sw = new google.maps.LatLng(data.bounds.south, data.bounds.west);
        const ne = new google.maps.LatLng(data.bounds.north, data.bounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(data.image_url, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);
        return overlay;
    }

    async fetchAndAddOverlay(marker) {
        const overlay = await this.createOverlayForSite(marker);
        if (overlay) this.addOverlay(marker.properties.id, overlay);
    }

    onMarkerClick(event, marker) {
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

    removeOverlay(siteId) {
        super.removeOverlay(siteId);
        // also remove the marker for custom radars
        this.markers.deleteMarker(siteId);
    }
};
window.CustomRadarLayer = CustomRadarLayer;