class ExistingRadarLayer {
    constructor(map, radarSitesUrl, coveragesUrl) {
        this.map = map;
        this.radarSitesUrl = radarSitesUrl;
        this.coveragesUrl = coveragesUrl;

        this.existingOverlay = {}; // Key: radar site ID, Value: overlay object
        this.existingRadarSitesMarkers = new markerCollection(this.map);
        this.loadRadarSites();
        this.existingRadarSitesMarkers.reactClick = this.existingRadarSiteClicked.bind(this);

        this.overlayBounds = {};
        this.loadBounds();

        this.initUI();
    }

    initUI() {
        this.currentAglThresholdChanged();
    }

    async loadRadarSites() {
        await this.existingRadarSitesMarkers.init({
            marker_options: {
                markerFill: 'red',
                markerStroke: 'red',
                markerSize: 4.5,
            }
        });
        fetch(this.radarSitesUrl)
            .then(response => response.json())
            .then(radarSites => {
                for (const radarSite of radarSites) {
                    this.existingRadarSitesMarkers.makeMarker(
                        radarSite.lat,
                        radarSite.lng,
                        {
                            properties: {
                                id: radarSite.id,
                                name: radarSite.name,
                                lat: radarSite.lat,
                                lng: radarSite.lng,
                                elev_ft: radarSite.elev,
                                tower_ft: radarSite.tower,
                            },
                        },
                        {
                            clickable: true,
                        }
                    )
                }
            })
            .catch(error => console.error('Error loading radar sites:', error));
    }

    async loadBounds() {
        const res = await fetch("public/data/nexrad_coverages/radar_bounds.json");
        this.overlayBounds = await res.json();
    }

    getCurrentAglThreshold() {
        const radios = document.getElementsByName('precalculated-threshold-radiobuttons');
        for (const radio of radios) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return null;
    }

    currentAglThresholdChanged() {
        const radios = document.getElementsByName('precalculated-threshold-radiobuttons');
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                for (const siteId in this.existingOverlay) {
                    this.existingOverlay[siteId].setMap(null);
                    const overlay = this.createOverlayForExistingRadarSite(siteId);
                    if (overlay) {
                        this.existingOverlay[siteId] = overlay;
                    }
                }
            });
        });
    }

    existingRadarSiteClicked(event, marker) {
        // Toggle the overlay for the clicked radar site
        const siteId = marker.properties.id;
        if (this.existingOverlay[siteId]) {
            // Overlay exists, remove it
            this.existingOverlay[siteId].setMap(null);
            delete this.existingOverlay[siteId];
        } else {
            // Create and add the overlay
            const overlay = this.createOverlayForExistingRadarSite(siteId);
            if (overlay) {
                this.existingOverlay[siteId] = overlay;
            }
        }
    }

    createOverlayForExistingRadarSite(siteId) {
        const imgBounds = this.overlayBounds[siteId];
        if (!imgBounds) {
            console.warn(`No bounds found for site ID: ${siteId}`);
            return null;
        }

        const aglThreshold = this.getCurrentAglThreshold();
        const imgUrl = `${this.coveragesUrl}/${aglThreshold}/${siteId}.png`;

        const sw = new google.maps.LatLng(imgBounds.south, imgBounds.west);
        const ne = new google.maps.LatLng(imgBounds.north, imgBounds.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        const overlay = customOverlay(imgUrl, bounds, this.map, 'OverlayView');
        overlay.setOpacity(0.7);
        return overlay;
    }
};

window.ExistingRadarLayer = ExistingRadarLayer;