class ExistingRadarLayer extends BaseRadarLayer {
    constructor(map, radarSitesUrl, boundsUrl, customRadarHelper) {
        super(map, { markerFill: 'red', markerStroke: 'red', markerSize: 4.5 });
        
        this.radarSitesUrl = radarSitesUrl;
        
        this.boundsUrl = boundsUrl;
        this.overlayBounds = {};

        this.editSnapshot = null;

        this.customRadarHelper = customRadarHelper;

        this.steps = [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5]
        const range = { min: this.steps[0], max: this.steps[this.steps.length - 1] };
        this.steps.forEach((val, i) => {
            const pct = (i / (this.steps.length - 1)) * 100;
            range[`${pct}%`] = val;
        });

        this.elevationAnglesSlider = document.getElementById('existing-radar-show-elevation-angles-slider');
        noUiSlider.create(this.elevationAnglesSlider, {
            start: [this.steps[0], this.steps[this.steps.length - 1]],
            connect: true,
            range: range,
            snap: true,
            tooltips: [
                { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) },
                { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) }
            ],
            format: {
                to: v=> parseFloat(v).toFixed(1),
                from: v => Number(v)
            }
        });
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
        const watchFields = [towerEl, altEl].filter(Boolean);

        watchFields.forEach(el => {
            el.addEventListener("input", () => {
                console.log(this.hasChanges());
                updateBtn.disabled = !this.hasChanges();
            });
        });

        // Add slider change listener separately
        this.elevationAnglesSlider.noUiSlider.on('update', () => {
            updateBtn.disabled = !this.hasChanges();
        });

        updateBtn.addEventListener("click", () => {
            // Gather data
            console.log(this.readForm());

            const marker = this.customRadarHelper.addCustomMarker(this.readForm());
            setTimeout(() => {
                this.markers.highlightMarker(marker);
            }, 10);
            this.customRadarHelper.fetchAndAddOverlay(marker);

            updateBtn.disabled = true;

            this.customRadarHelper.populateDynamicRadarPanel(marker);
            toggleWindow('arbitrary-radar-show');
        });


        const closeBtn = document.getElementById("existing-radar-show-close-btn");
        const existingWindow = closeBtn.parentElement.parentElement;

        // Track the previous visibility state
        let wasVisible = window.getComputedStyle(existingWindow).display !== 'none';

        // Watch for changes to the existingWindow's style attribute
        const existingObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isCurrentlyVisible = existingWindow.style.display !== 'none' && 
                                            window.getComputedStyle(existingWindow).display !== 'none';
                    
                    // Only trigger if it was visible before and is now hidden
                    if (wasVisible && !isCurrentlyVisible) {
                        console.log("Existing window became invisible - unhighlighting markers");
                        this.markers.unhighlightMarkers();
                    }
                    
                    // Update the tracking variable
                    wasVisible = isCurrentlyVisible;
                }
            });
        });

        // Start observing the existingWindow for style changes
        existingObserver.observe(existingWindow, {
            attributes: true,
            attributeFilter: ['style']
        });

        // Close button only handles hiding the window
        closeBtn.addEventListener("click", () => {
            existingWindow.style.display = 'none';
        });
    }

    readForm() {
        const lat = parseFloat(document.getElementById("existing-radar-site-lat").textContent);
        const lng = parseFloat(document.getElementById("existing-radar-site-lng").textContent);
        const agl = parseFloat(document.getElementById("existing-radar-site-max-alt").value);
        const tower = parseFloat(document.getElementById("existing-radar-site-tower-height").value);
        const selectedRange = this.elevationAnglesSlider.noUiSlider.get();
        const minSelected = parseFloat(selectedRange[0]);
        const maxSelected = parseFloat(selectedRange[1]);
        const angles = this.steps.filter(step => step >= minSelected && step <= maxSelected);

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

    handleMarkerClick(event, marker) {
        // Open existing radar show menu, populate with marker.properties
        const panel = document.getElementById('existing-radar-show');
            if (panel.style.display === 'none' || getComputedStyle(panel).display === 'none') {
            toggleWindow('existing-radar-show');
        }
        this.populateDynamicRadarPanel(marker);
        setTimeout(() => {
            this.markers.highlightMarker(marker);
        }, 10);
        
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

        document.getElementById("existing-radar-site-id").textContent = props.id || "";
        document.getElementById("existing-radar-site-name").textContent = props.name || "";
        document.getElementById("existing-radar-site-lat").textContent = props.lat || "";
        document.getElementById("existing-radar-site-lng").textContent = props.lng || "";
        document.getElementById("existing-radar-site-tower-height").value = ft2m(props.tower_ft) || "";
        document.getElementById("existing-radar-site-max-alt").value = aglThreshold || "";

        const selectedAngles = props.elevationAngles || [];
        if (selectedAngles.length > 0) {
            const minAngle = Math.min(...selectedAngles);
            const maxAngle = Math.max(...selectedAngles);
            this.elevationAnglesSlider.noUiSlider.set([minAngle, maxAngle]);
        }

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
        const selectedRange = this.elevationAnglesSlider.noUiSlider.get();
        const minSelected = parseFloat(selectedRange[0]);
        const maxSelected = parseFloat(selectedRange[1]);
        const angles = this.steps.filter(step => step >= minSelected && step <= maxSelected).sort();

        return (
            tower != this.editSnapshot.towerHeight ||
            agl != this.editSnapshot.aglThreshold ||
            angles.length != this.editSnapshot.elevationAngles.length ||
            angles.some((v, i) => v != this.editSnapshot.elevationAngles[i])
        );
    }
}

window.ExistingRadarLayer = ExistingRadarLayer;