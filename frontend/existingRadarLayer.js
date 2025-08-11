class ExistingRadarLayer extends BaseRadarLayer {
    constructor(map, radarSitesUrl, coveragesUrl, boundsUrl, customRadarHelper) {
        super(map, { markerFill: 'red', markerStroke: 'red', markerSize: 4.5 });
        
        this.radarSitesUrl = radarSitesUrl;
        this.coveragesUrl = coveragesUrl;
        
        this.boundsUrl = boundsUrl;
        this.overlayBounds = {};

        this.editSnapshot = null;

        this.customRadarHelper = customRadarHelper;
    }

    async init() {
        await this.initMarkers();
        await this.loadBounds();
        await this.loadRadarSites();
        this.reactAglThresholdChange();
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

    async loadBounds() {
        const res = await fetch(this.boundsUrl);
        this.overlayBounds = await res.json();
    }

    getCurrentAglFolder() {
        const checked = document.querySelector(
            'input[name="precalculated-threshold-radiobuttons"]:checked'
        );
        return checked?.value ?? null;
    }

    reactAglThresholdChange() {
        document.querySelectorAll('[name="precalculated-threshold-radiobuttons"]').forEach(radio => {
            radio.addEventListener('change', () => {
                for (const siteId in this.overlays) {
                    this.removeOverlay(siteId); // clears old image
                    const marker = this.markers.getMarker(siteId);
                    if (marker) {
                        const overlay = this.createOverlayForSite(marker);
                        if (overlay) {
                            this.addOverlay(siteId, overlay);
                        }
                    }
                }
            });
        });
    }

    createOverlayForSite(marker) {
        const siteId = marker.properties.id;
        const boundsData = this.overlayBounds[siteId];
        if (!boundsData) return null;

        const folder = this.getCurrentAglFolder();
        const imgUrl = `${this.coveragesUrl}/${folder}/${siteId}.png`;

        const sw = new google.maps.LatLng(boundsData.south, boundsData.west);
        const ne = new google.maps.LatLng(boundsData.north, boundsData.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(imgUrl, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);
        return overlay;
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

        const aglThreshold = ft2m(this.getCurrentAglThresholdInFeet())

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

    getCurrentAglThresholdInFeet() {
        const folder = this.getCurrentAglFolder();
        if (folder == "coverages_3k") {
            return 3_000;
        } else if (folder == "coverages_6k") {
            return 6_000;
        } else if (folder == "coverages_10k") {
            return 10_000;
        } else {
            return null;
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