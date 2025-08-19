class CustomRadarLayer extends BaseRadarLayer {
    constructor(map, serverUrl) {
        super(map, { markerFill: 'blue', markerStroke: 'blue', markerSize: 4.5 });
        this.serverUrl = serverUrl;
        this.idCounter = 0;
        this.editSnapshot = null; // store original values for change detection
        this.isLoading = false; // track loading state
        
        // Map click selection state
        this.isSelectingLocation = false;
        this.mapClickListener = null;
        this.originalCursor = null;
        this.mapClickTempMarker = null;

        const steps = [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5]
        const range = { min: steps[0], max: steps[steps.length - 1] };
        steps.forEach((val, i) => {
            const pct = (i / (steps.length - 1)) * 100;
            range[`${pct}%`] = val;
        });

        this.elevationAnglesSlider = document.getElementById('elevation-angles-slider');
        noUiSlider.create(this.elevationAnglesSlider, {
            start: [steps[0], steps[steps.length - 1]],
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
        this.initUI();
    }

    initUI() {
        // Select location using map click
        document.getElementById('select-location-btn').addEventListener("click", () => {
            this.startLocationSelection();
        });

        // Submit new radar
        document.getElementById("radar-submit-btn").addEventListener("click", () => {
            const params = this.readForm();
            if (!params) return;
            const marker = this.addCustomMarker(params);
            this.fetchAndAddOverlay(marker);

            // Take them to arbitrary radar show
            this.populateDynamicRadarPanel(marker);
            toggleWindow('arbitrary-radar-show');

            // Highlight newly created marker
            this.markers.highlightMarker(marker);
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
        //const angleEls = document.querySelectorAll("#show-elevation-angle-checkboxes input[type='checkbox']");

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
            // const angles = [...document.querySelectorAll("#show-elevation-angle-checkboxes input:checked")]
            //     .map(cb => parseFloat(cb.value));

            if ([tower, agl].some(v => isNaN(v)) || angles.length === 0) {
                alert("Invalid inputs");
                return;
            }

            this.updateRadar(siteId, { lat, lng, aglThreshold: agl, towerHeight: tower, elevationAngles: angles });
            updateBtn.disabled = true;
        });

        // For the create window
        const createCloseBtn = document.getElementById("arbitrary-radar-create-close-btn");
        const createWindow = createCloseBtn.parentElement;

        let createWasVisible = window.getComputedStyle(createWindow).display !== 'none';

        const createObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isCurrentlyVisible = createWindow.style.display !== 'none' && 
                                            window.getComputedStyle(createWindow).display !== 'none';
                    
                    if (createWasVisible && !isCurrentlyVisible) {
                        console.log("Create window became invisible - deleting temp marker");
                        this.markers.deleteMarker("temp");
                    }
                    
                    createWasVisible = isCurrentlyVisible;
                }
            });
        });

        createObserver.observe(createWindow, {
            attributes: true,
            attributeFilter: ['style']
        });

        createCloseBtn.addEventListener('click', () => {
            createWindow.style.display = 'none';
        });

        // For the show window
        const showCloseBtn = document.getElementById("arbitrary-radar-show-close-btn");
        const showWindow = showCloseBtn.parentElement;

        let showWasVisible = window.getComputedStyle(showWindow).display !== 'none';

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isCurrentlyVisible = showWindow.style.display !== 'none' && 
                                            window.getComputedStyle(showWindow).display !== 'none';
                    
                    if (showWasVisible && !isCurrentlyVisible) {
                        console.log("Window became invisible - unhighlighting markers");
                        this.markers.unhighlightMarkers();
                    }
                    
                    showWasVisible = isCurrentlyVisible;
                }
            });
        });

        observer.observe(showWindow, {
            attributes: true,
            attributeFilter: ['style']
        });

        showCloseBtn.addEventListener('click', () => {
            showWindow.style.display = 'none';
        });
    }

    startLocationSelection() {
        if (this.isSelectingLocation) {
            // Already in selection mode, cancel it
            this.cancelLocationSelection();
            return;
        }

        this.isSelectingLocation = true;
        
        // Store original cursor and change to crosshair
        this.originalCursor = this.map.get('draggableCursor');
        this.map.set('draggableCursor', 'crosshair');
        this.map.set('draggingCursor', 'crosshair');
        
        // Update button text to indicate active state
        const btn = document.getElementById('select-location-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Click on map (ESC to cancel)';
        btn.style.backgroundColor = '#007bff';
        btn.style.color = 'white';
        
        // Add map click listener
        this.mapClickListener = this.map.addListener('click', (event) => {
            this.handleMapClick(event);
        });

        // Add escape key listener to cancel
        this.escapeListener = (event) => {
            if (event.key === 'Escape') {
                this.cancelLocationSelection();
            }
        };
        document.addEventListener('keydown', this.escapeListener);
    }

    handleMapClick(event) {
        if (!this.isSelectingLocation) return;

        const lat = event.latLng.lat();
        const lng = event.latLng.lng();


        // Delete previous temporary marker
        this.markers.deleteMarker("temp");
        // Add a temporary marker 
        this.mapClickTempMarker = this.addCustomMarker({lat: lat, lng:lng}, "temp");
        console.log(this.mapClickTempMarker.properties);

        // Validate coordinates (basic check - you might want more specific validation)
        if (this.isValidLocation(lat, lng)) {
            // Fill out the form fields
            document.getElementById("radarLat").value = lat.toFixed(4);
            document.getElementById("radarLng").value = lng.toFixed(4);            
            // Exit location selection mode
            this.endLocationSelection();
        } else {
            alert("Invalid location selected. Please click on a valid map area.");
        }
    }

    isValidLocation(lat, lng) {
        // Basic validation - check if coordinates are within reasonable bounds
        // You can customize this based on your specific requirements
        return (
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180 &&
            !isNaN(lat) && !isNaN(lng)
        );
    }

    cancelLocationSelection() {
        this.endLocationSelection();
    }

    endLocationSelection() {
        if (!this.isSelectingLocation) return;

        this.isSelectingLocation = false;
        
        // Remove map click listener
        if (this.mapClickListener) {
            google.maps.event.removeListener(this.mapClickListener);
            this.mapClickListener = null;
        }
        
        // Remove escape key listener
        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }
        
        // Restore original cursor
        this.map.set('draggableCursor', this.originalCursor);
        this.map.set('draggingCursor', this.originalCursor);
        
        // Restore button appearance
        const btn = document.getElementById('select-location-btn');
        btn.textContent = 'Select Location on Map';
        btn.style.backgroundColor = '';
        btn.style.color = '';
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
        if (this.isLoading) {
            return;
        }
        showSpinner();
        this.isLoading = true;
        try {
            const overlay = await this.createOverlayForSite(marker);
            if (overlay) this.addOverlay(marker.properties.id, overlay);
        } catch (error) {
            console.error("Error fetching overlay:", error);
        } finally {
            hideSpinner();
            this.isLoading = false;
        }
    }

    updateRadar(siteId, newProps) {
        // 1. Remove old overlay and marker
        this.removeOverlay(siteId); // this also deletes marker in CustomRadarLayer

        // 2. Add new marker with same ID
        const marker = this.addCustomMarker(newProps, siteId);

        this.markers.highlightMarker(marker);

        // 3. Add new overlay
        this.fetchAndAddOverlay(marker);
    }

    handleMarkerClick(event, marker) {
        // If we're in location selection mode, don't handle marker clicks
        if (this.isSelectingLocation) return;
        
        const panel = document.getElementById('arbitrary-radar-show');
        if (panel.style.display === 'none' || getComputedStyle(panel).display === 'none') {
            toggleWindow('arbitrary-radar-show');
        }
        this.populateDynamicRadarPanel(marker);
        setTimeout(() => {
            this.markers.highlightMarker(marker);
        }, 10);
        
        // Initialize range ring controls for this site
        this.initSiteRangeRingControls(
            marker.properties.id, 
            'dynamic-radar-range-checkbox', 
            'dynamic-range-checkbox'
        );
    }

    populateDynamicRadarPanel(marker) {
        const props = marker.properties;
        
        document.getElementById("dynamic-radar-site-id").value = props.id || "";
        document.getElementById("dynamic-radar-site-lat").value = props.lat.toFixed(4) || "";
        document.getElementById("dynamic-radar-site-lng").value = props.lng.toFixed(4) || "";
        document.getElementById("dynamic-radar-site-tower-height").value = props.towerHeight || "";
        document.getElementById("dynamic-radar-site-max-alt").value = props.aglThreshold || "";

        // const checkboxes = document.querySelectorAll("#show-elevation-angle-checkboxes input[type='checkbox']");
        // const selectedAngles = props.elevationAngles || [];
        // checkboxes.forEach(cb => {
        //     cb.checked = selectedAngles.includes(parseFloat(cb.value));
        // });

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
        // const angles = [...document.querySelectorAll("#show-elevation-angle-checkboxes input:checked")]
        //     .map(cb => parseFloat(cb.value))
        //     .sort();

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
}

window.CustomRadarLayer = CustomRadarLayer;