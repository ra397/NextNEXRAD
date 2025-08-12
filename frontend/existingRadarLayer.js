class ExistingRadarLayer extends BaseRadarLayer {
    constructor(map, radarSitesUrl, boundsUrl, customRadarHelper) {
        super(map, { markerFill: 'red', markerStroke: 'red', markerSize: 4.5 });
        
        this.radarSitesUrl = radarSitesUrl;
        
        this.boundsUrl = boundsUrl;
        this.overlayBounds = {};

        this.editSnapshot = null;

        this.customRadarHelper = customRadarHelper;
    }

    async init() {
        await this.initMarkers();
        await this.loadRadarSites();
        this.initUI();
    }

    initUI() {
        // Update
        const updateBtn = document.getElementById("update-existing-radar");
        updateBtn.disabled = true;

        const towerEl = document.getElementById("existing-radar-site-tower-height");
        const altEl   = document.getElementById("existing-radar-site-max-alt");
        const angleEls = document.querySelectorAll("#existing-elevation-angle-checkboxes input[type='checkbox']");
        const watchFields = [towerEl, altEl, ...angleEls].filter(Boolean);

        watchFields.forEach(el => {
            el.addEventListener("input", () => {
                console.log(this.hasChanges());
                updateBtn.disabled = !this.hasChanges();
            });
        });

        updateBtn.addEventListener("click", () => {
            // Gather data
            console.log(this.readForm());

            const marker = this.customRadarHelper.addCustomMarker(this.readForm());
            this.customRadarHelper.fetchAndAddOverlay(marker);

            updateBtn.disabled = true;
        });
    }

    readForm() {
        const lat = parseFloat(document.getElementById("existing-radar-site-lat").value);
        const lng = parseFloat(document.getElementById("existing-radar-site-lng").value);
        const agl = parseFloat(document.getElementById("existing-radar-site-max-alt").value);
        const tower = parseFloat(document.getElementById("existing-radar-site-tower-height").value);
        const angles = [...document.querySelectorAll('#existing-elevation-angle-checkboxes input:checked')]
            .map(cb => parseFloat(cb.value));

        if ([lat, lng, agl, tower].some(v => isNaN(v)) || angles.length === 0) return null;
        return { lat, lng, agl, tower, angles };
    }

    async loadRadarSites() {
        const res = await fetch(this.radarSitesUrl);
        const sites = await res.json();
        for (const site of sites) {
            this.markers.makeMarker(site.lat, site.lng, {
                properties: {
                    id: site.id,
                    name: site.name,
                    lat: site.lat,
                    lng: site.lng,
                    elev_ft: site.elev,
                    tower_ft: site.tower,
                    elevationAngles: [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5]
                },
            },
            { clickable: true });
        }
    }

    onMarkerClick(event, marker) {
        const panel = document.getElementById('existing-radar-show');
            if (panel.style.display === 'none' || getComputedStyle(panel).display === 'none') {
            toggleWindow('existing-radar-show');
        }
        this.populateDynamicRadarPanel(marker);
        
        // Initialize range ring controls for this site
        this.initSiteRangeRingControls(
            marker.properties.id, 
            'existing-radar-range-checkbox', 
            'existing-range-checkbox'
        );
    }

    populateDynamicRadarPanel(marker) {
        const props = marker.properties;

        const aglThreshold = this.getCurrentThresholdInMeters();

        document.getElementById("existing-radar-site-id").value = props.id || "";
        document.getElementById("existing-radar-site-name").value = props.name || "";
        document.getElementById("existing-radar-site-lat").value = props.lat || "";
        document.getElementById("existing-radar-site-lng").value = props.lng || "";
        document.getElementById("existing-radar-site-tower-height").value = ft2m(props.tower_ft) || "";
        document.getElementById("existing-radar-site-max-alt").value = aglThreshold || "";

        const checkboxes = document.querySelectorAll("#existing-elevation-angle-checkboxes input[type='checkbox']");
        const selectedAngles = props.elevationAngles || [];
        checkboxes.forEach(cb => {
            cb.checked = selectedAngles.includes(parseFloat(cb.value));
        });

        this.editSnapshot = {
            towerHeight: ft2m(props.tower_ft),
            aglThreshold: aglThreshold,
            elevationAngles: [...selectedAngles].sort()
        }

        document.getElementById("update-existing-radar").disabled = true;
    }

    getCurrentThresholdInMeters() {
        const threshold_folder = CoveragesLayer.getSelectedThreshold();
        if (threshold_folder == "3k_tiles") {
            return ft2m(3_000);
        } else if (threshold_folder == "6k_tiles") {
            return ft2m(6_000);
        } else {
            return ft2m(10_000);
        }
    }

    hasChanges() {
        if (!this.editSnapshot) return false;
        const tower = parseFloat(document.getElementById("existing-radar-site-tower-height").value);
        const agl = parseFloat(document.getElementById("existing-radar-site-max-alt").value);
        const angles = [...document.querySelectorAll("#existing-elevation-angle-checkboxes input:checked")]
            .map(cb => parseFloat(cb.value))
            .sort();

        return (
            tower != this.editSnapshot.towerHeight ||
            agl != this.editSnapshot.aglThreshold ||
            angles.length != this.editSnapshot.elevationAngles.length ||
            angles.some((v, i) => v != this.editSnapshot.elevationAngles[i])
        );
    }
}

window.ExistingRadarLayer = ExistingRadarLayer;