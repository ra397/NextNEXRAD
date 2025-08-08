class ExistingRadarLayer extends BaseRadarLayer {
    constructor(map, radarSitesUrl, coveragesUrl, boundsUrl) {
        super(map, { markerFill: 'red', markerStroke: 'red', markerSize: 4.5 });
        
        this.radarSitesUrl = radarSitesUrl;
        this.coveragesUrl = coveragesUrl;
        
        this.boundsUrl = boundsUrl;
        this.overlayBounds = {};
    }

    async init() {
        await this.initMarkers();
        await this.loadBounds();
        await this.loadRadarSites();
        this.reactAglThresholdChange();
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
        const siteId = marker.properties.id;
        if (this.overlays[siteId]) {
            this.toggleOverlay(siteId);
        } else {
            const overlay = this.createOverlayForSite(marker);
            if (overlay) this.addOverlay(siteId, overlay);
        }
    }
};

window.ExistingRadarLayer = ExistingRadarLayer;