class UsgsLayer {
    constructor(map) {
        this.map = map;

        this.usgsSitesMarkers = new markerCollection(this.map);

        this.populationPerBasinMap = null;

        this.basinLayers = {};

        this._lastMarkerSize = null;
        
        // Hover timing control
        this.hoverDelay = 366; // milliseconds to wait before showing hover label
        this.hoverTimeouts = new Map(); // Store timeout IDs per marker
    }

    async init() {
        await this.usgsSitesMarkers.init({
            marker_options: {
                markerFill: "green",
                markerStroke: "green",
                markerSize: 3.5
            }
        });
        this.usgsSitesMarkers.reactClick = this.usgsSiteClicked.bind(this);
        this.usgsSitesMarkers.reactMouseOver = this.usgsSiteHover.bind(this);
        this.usgsSitesMarkers.reactMouseOut = this.usgsSiteHoverEnd.bind(this);
        this.loadUsgsSites();
        this.loadPopulationPerBasin();
    }

    loadUsgsSites() {
        const usgsSiteSrc = "public/data/uid_markers.pbf";
        this._getArrayBuffer(usgsSiteSrc).then((ret) => {
            const pbf = new Pbf(ret);
            const geojson = geobuf.decode(pbf);  // Converts to GeoJSON

            for (let i = 0; i < geojson.features.length; i++) {
                const f = geojson.features[i];
                const c = f.geometry.coordinates;

                // Skip small basins
                if (1 * f.properties.drainage_area < 100) continue;

                this.usgsSitesMarkers.makeMarker(
                    c[1], // latitude
                    c[0], // longitude
                    {
                        properties: f.properties,
                        clickable: true,
                        optimized: true
                    },
                    {
                        clickable: true,
                        mouseOver: true,
                        mouseOut: true
                    }
                );
            }
            this.usgsSitesMarkers.hide();
        });        
    }

    loadPopulationPerBasin() {
        fetch('public/data/usgs_population_map.json')
            .then(res => res.json())
            .then(data => {
            this.populationPerBasinMap = data;
            })
            .catch(err => console.error('Error loading population map:', err));        
    }

    showUsgsSites() {
        this.usgsSitesMarkers.show();
    }

    hideUsgsSites() {
        this.usgsSitesMarkers.hide();

        for (const usgsId in this.basinLayers) {
            this.basinLayers[usgsId].setMap(null);
        }
        this.basinLayers = {};

        for (const marker of this.usgsSitesMarkers.markers) {
            if (marker.customLabel && marker.customLabel.remove) {
                marker.customLabel.remove();
            }
            delete marker.customLabel;
            delete marker._isHoverLabel;
            delete marker._usgsData;
        }
        
        // Clear all hover timeouts
        this.hoverTimeouts.clear();
    }

    usgsSiteClicked(event, marker) {
        const usgsId = marker.properties.usgs_id;
        // If the basin is already shown, remove it and the label
        if (this.basinLayers[usgsId]) {
            this.basinLayers[usgsId].setMap(null); // Remove basin from map
            delete this.basinLayers[usgsId];       // Delete reference
            return;
        }
        this.loadBasin(usgsId);
    }

    usgsSiteHover(event, marker) {
        // Don't show hover label if marker already has a click label
        if (marker.customLabel && !marker._isHoverLabel) return;

        // Clear any existing timeout for this marker
        const existingTimeout = this.hoverTimeouts.get(marker);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set a timeout to show the hover label after delay
        const timeoutId = setTimeout(() => {
            // Double-check that we still don't have a click label
            if (marker.customLabel && !marker._isHoverLabel) return;

            // Clean up any existing hover label first
            if (marker.customLabel && marker._isHoverLabel) {
                marker.customLabel.remove();
                delete marker.customLabel;
                delete marker._isHoverLabel;
                delete marker._usgsData;
            }

            const usgsId = marker.properties.usgs_id;
            const area = marker.properties.drainage_area;
            const population = this.populationPerBasinMap?.[usgsId] ?? null;

            this.showLabel(marker, usgsId, area, population);
            marker._isHoverLabel = true; // Mark this as a hover label
            
            // Clean up the timeout reference
            this.hoverTimeouts.delete(marker);
        }, this.hoverDelay);

        // Store the timeout ID
        this.hoverTimeouts.set(marker, timeoutId);
    }

    usgsSiteHoverEnd(event, marker) {
        // Clear any pending hover timeout
        const existingTimeout = this.hoverTimeouts.get(marker);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.hoverTimeouts.delete(marker);
        }

        // Only remove the label if it exists AND it's a hover label (not a click label)
        if (marker.customLabel && marker._isHoverLabel && marker.customLabel.remove) {
            marker.customLabel.remove();
            delete marker.customLabel;
            delete marker._isHoverLabel;
            delete marker._usgsData;
        }
    }

    async loadBasin(usgsId) {
        try {
            const buf = await this._getArrayBuffer(`${window._env_prod.USGS_BOUNDARY_URL}${usgsId}.pbf`);
            const geojson = geobuf.decode(new Pbf(new Uint8Array(buf)));

            const layer = new google.maps.Data({ map: this.map });
            layer.addGeoJson(geojson);
            layer.setStyle({
                fillColor: "gray",
                fillOpacity: 0.2,
                strokeColor: "black",
                strokeWeight: 1,
                clickable: false
            });

            this.basinLayers[usgsId] = layer;
        } catch (err) {
            console.error("Error loading basin:", err);
        }        
    }

    showLabel(marker, site_id, area, population = null) {
        const labelDiv = this.createLabel(site_id, area, population, 'arrow_rht_box');
        const label = new infoTool(marker.getMap(), marker.getPosition(), labelDiv);
        marker.customLabel = label;    
        marker._usgsData = { site_id, area, population };    
    }

    createLabel(site_id, area_km2, population = null, use_class = 'arrow_rht_box') {
        const div = document.createElement('div');
        div.classList.add(use_class);
        div.setAttribute('style', 'position:absolute; will-change: left, top;');

        const displayArea = Math.round(area_km2);
        const unit = "km²";

        let html = `ID: ${site_id}<br>Area: ${displayArea} ${unit}`;
        if (population !== null) {
            html += `<br>Population: ${(Math.round(population / 100) * 100).toLocaleString()}`;
        }

        div.innerHTML = html;
        return div;
    }

    updateAllLabels() {
        for (const marker of this.usgsSitesMarkers.markers) {
            const data = marker._usgsData;
            if (!data || !marker.customLabel) continue;

            const updatedDiv = this.createLabel(data.site_id, data.area, data.population, 'arrow_rht_box');
            marker.customLabel.updateContent(updatedDiv);
        }
    }

    _getArrayBuffer(url) {
        return fetch(url).then(response => response.arrayBuffer());
    }

    updateMarkerSize(zoom) {
        let size;

        if (zoom >= 8 && zoom <= 12) {
            const zoomBin = Math.floor(zoom);
            size = Math.max(3.5, Math.min(8, 0.5 * zoomBin));
        } else {
            size = 3.5; // default size when zoomed out or too far in
        }

        if (this._lastMarkerSize === size) return;
        this._lastMarkerSize = size;

        this.usgsSitesMarkers.updateIcons({ markerSize: size });
    }
}

window.UsgsLayer = UsgsLayer;