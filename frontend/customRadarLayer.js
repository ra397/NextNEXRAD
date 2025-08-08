class CustomRadarLayer extends BaseRadarLayer {
    constructor(map, serverUrl) {
        super(map, { markerFill: 'blue', markerStroke: 'blue', markerSize: 4.5 });
        this.serverUrl = serverUrl;
        this.idCounter = 0;
        this.editSnapshot = null; // store original values for change detection
    }

    async init() {
        await this.initMarkers();
        this.initUI();
    }

    initUI() {
        // Submit new radar
        document.getElementById("radar-submit-btn").addEventListener("click", () => {
            const params = this.readForm();
            if (!params) return;
            const marker = this.addCustomMarker(params);
            this.fetchAndAddOverlay(marker);
        });

        // Toggle
        document.getElementById("toggle-dynamic-radar").addEventListener("click", () => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            this.toggleOverlay(siteId);
        });

        // Delete
        document.getElementById("delete-dynamic-radar").addEventListener("click", () => {
            const siteId = document.getElementById("dynamic-radar-site-id").value;
            this.removeOverlay(siteId);
            toggleWindow('arbitrary-radar-show');
        });

        // Update
        const updateBtn = document.getElementById("update-dynamic-radar");
        updateBtn.disabled = true;

        const towerEl = document.getElementById("dynamic-radar-site-tower-height");
        const altEl   = document.getElementById("dynamic-radar-site-max-alt");
        const angleEls = document.querySelectorAll("#show-elevation-angle-checkboxes input[type='checkbox']");

        // Build an array of actual elements, removing nulls if IDs are wrong
        const watchFields = [towerEl, altEl, ...angleEls].filter(Boolean);

        watchFields.forEach(el => {
            el.addEventListener("input", () => {
                updateBtn.disabled = !this.hasChanges();
            });
        });

        updateBtn.addEventListener("click", () => {
            const siteId = parseInt(document.getElementById("dynamic-radar-site-id").value, 10);
            const lat = parseFloat(document.getElementById("dynamic-radar-site-lat").value);
            const lng = parseFloat(document.getElementById("dynamic-radar-site-lng").value);
            const tower = parseFloat(document.getElementById("dynamic-radar-site-tower-height").value);
            const agl = parseFloat(document.getElementById("dynamic-radar-site-max-alt").value);
            const angles = [...document.querySelectorAll("#show-elevation-angle-checkboxes input:checked")]
                .map(cb => parseFloat(cb.value));

            if ([tower, agl].some(v => isNaN(v)) || angles.length === 0) {
                alert("Invalid inputs");
                return;
            }

            this.updateRadar(siteId, { lat, lng, aglThreshold: agl, towerHeight: tower, elevationAngles: angles });
            updateBtn.disabled = true;
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

    addCustomMarker(params, idOverride = null) {
        const id = idOverride ?? ++this.idCounter;
        return this.markers.makeMarker(params.lat, params.lng, {
            properties: {                     
                id,
                lat: params.lat,
                lng: params.lng,
                aglThreshold: params.agl ?? params.aglThreshold,
                towerHeight: params.tower ?? params.towerHeight,
                elevationAngles: params.angles ?? params.elevationAngles
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

    updateRadar(siteId, newProps) {
        // 1. Remove old overlay and marker
        this.removeOverlay(siteId); // this also deletes marker in CustomRadarLayer

        // 2. Add new marker with same ID
        const marker = this.addCustomMarker(newProps, siteId);

        // 3. Add new overlay
        this.fetchAndAddOverlay(marker);
    }

    onMarkerClick(event, marker) {
        const panel = document.getElementById('arbitrary-radar-show');
        if (panel.style.display === 'none' || getComputedStyle(panel).display === 'none') {
            toggleWindow('arbitrary-radar-show');
        }
        this.populateDynamicRadarPanel(marker);
    }

    populateDynamicRadarPanel(marker) {
        const props = marker.properties;
        
        document.getElementById("dynamic-radar-site-id").value = props.id || "";
        document.getElementById("dynamic-radar-site-lat").value = props.lat || "";
        document.getElementById("dynamic-radar-site-lng").value = props.lng || "";
        document.getElementById("dynamic-radar-site-tower-height").value = props.towerHeight || "";
        document.getElementById("dynamic-radar-site-max-alt").value = props.aglThreshold || "";

        const checkboxes = document.querySelectorAll("#show-elevation-angle-checkboxes input[type='checkbox']");
        const selectedAngles = props.elevationAngles || [];
        checkboxes.forEach(cb => {
            cb.checked = selectedAngles.includes(parseFloat(cb.value));
        });

        // store snapshot for change detection
        this.editSnapshot = {
            towerHeight: props.towerHeight,
            aglThreshold: props.aglThreshold,
            elevationAngles: [...selectedAngles].sort()
        };

        document.getElementById("update-dynamic-radar").disabled = true;
    }

    hasChanges() {
        if (!this.editSnapshot) return false;
        const tower = parseFloat(document.getElementById("dynamic-radar-site-tower-height").value);
        const agl = parseFloat(document.getElementById("dynamic-radar-site-max-alt").value);
        const angles = [...document.querySelectorAll("#show-elevation-angle-checkboxes input:checked")]
            .map(cb => parseFloat(cb.value))
            .sort();

        return (
            tower !== this.editSnapshot.towerHeight ||
            agl !== this.editSnapshot.aglThreshold ||
            angles.length !== this.editSnapshot.elevationAngles.length ||
            angles.some((v, i) => v !== this.editSnapshot.elevationAngles[i])
        );
    }

    removeOverlay(siteId) {
        super.removeOverlay(siteId);
        this.markers.deleteMarker(siteId);
    }
};
window.CustomRadarLayer = CustomRadarLayer;