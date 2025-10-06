class UsgsLayer {
    constructor(map) {
        this.map = map;

        this.usgsSitesMarkers = new markerCollection(this.map);

        this.currentBasinLayer = null;

        this._lastMarkerSize = null;
        
        // Hover timing control
        this.hoverDelay = 500; // milliseconds to wait before showing hover label
        this.hoverTimeouts = new Map(); // Store timeout IDs per marker

        this.min_area = 0;
        this.max_area = 1_800_000;
    }

    async init() {
        await this.usgsSitesMarkers.init({
            marker_options: {
                markerFill: "#006400",
                markerStroke: "#006400",
                markerSize: 3.5
            }
        });
        this.usgsSitesMarkers.reactClick = this.usgsSiteClicked.bind(this);
        this.usgsSitesMarkers.reactMouseOver = this.usgsSiteHover.bind(this);
        this.usgsSitesMarkers.reactMouseOut = this.usgsSiteHoverEnd.bind(this);
        this.loadUsgsSites();
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

    showUsgsSites() {
        for (let i = 0; i < this.usgsSitesMarkers.markers.length; i ++) {
            const marker =  this.usgsSitesMarkers.markers[i];
            const area = this.usgsSitesMarkers.markers[i].properties.drainage_area;
            if (area < this.min_area || area > this.max_area) {
                marker.setMap(null);
            } else {
                marker.setMap(window.map);
            }
        }
    }

    hideUsgsSites() {
        this.usgsSitesMarkers.hide();

        if (this.currentBasinLayer) {
            this.currentBasinLayer.setMap(null);
            this.currentBasinLayer = null;
        }

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

    usgsSiteClicked(event, marker, goTo=false) {
        const usgsId = marker.properties.usgs_id;
        if (this.currentBasinLayer) {
            if (currentlySelectedUsgsBasin === usgsId) {
                // close the basin
                this.currentBasinLayer.setMap(null);
                this.currentBasinLayer = null;
                // set currently selected usgs basin to null
                currentlySelectedUsgsBasin = null;

                // close the basin stats window
                document.getElementById("report-toggle-container").style.width = "155px";
                document.getElementById("basin-info-container").style.display = "none";
                document.getElementById("basin-stats-window-close").style.display = "none";
            } 
            else {
                // close the old basin layer
                this.currentBasinLayer.setMap(null);
                this.currentBasinLayer = null;
                // open the new basin layer
                this.loadBasin(usgsId, goTo);
                // update currently selected usgs basin
                currentlySelectedUsgsBasin = usgsId;
                triggerReportGeneration();
            }
        }
        else {
            // open the new basin layer
            this.loadBasin(usgsId, goTo);
            // update currently selected usgs basin
            currentlySelectedUsgsBasin = usgsId;
            triggerReportGeneration();
        }
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
            const population = usgs_sites?.[usgsId]?.population ?? null

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

    async loadBasin(usgsId, goTo) {
        try {
            const buf = await this._getArrayBuffer(`public/data/pbf_basins/${usgsId}.pbf`);
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

            if (goTo) {
                const coordinatesList = geojson.geometry.coordinates; 
                let minLat = Infinity, maxLat = -Infinity;
                let minLng = Infinity, maxLng = -Infinity;

                coordinatesList.forEach(coordinates => {
                    coordinates.forEach(([lng, lat]) => {
                        if (lat < minLat) minLat = lat;
                        if (lat > maxLat) maxLat = lat;
                        if (lng < minLng) minLng = lng;
                        if (lng > maxLng) maxLng = lng;
                    });
                });

                const bounds = new google.maps.LatLngBounds(
                    new google.maps.LatLng(minLat, minLng), 
                    new google.maps.LatLng(maxLat, maxLng)
                );

                // Fit the map to this bounding box
                map.fitBounds(bounds);
                map.fitBounds(bounds);
            }

            this.currentBasinLayer = layer;
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

        let displayArea;
        let unit;
        if (window.units == 'metric') {
            displayArea = Math.round(area_km2);
            unit = "km²";
        } else {
            displayArea = Math.round(km2ToMi2(area_km2));
            unit = "mi²";
        }

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

    reset() {
        this.hideUsgsSites();
        document.getElementById("usgsSites-checkbox").checked = false;
        currentlySelectedUsgsBasin = null;
        triggerReportGeneration();
    }

    getMarkerStyle() {
        return {
            color: this.usgsSitesMarkers.markerFill,
            size: this.usgsSitesMarkers.markerSize,
        }
    }

    async setMarkerStyle(hexValue, size) {
        await this.usgsSitesMarkers.updateIcons({
            markerFill: hexValue,
            markerStroke: hexValue,
            markerSize: size
        });
    }
}

window.UsgsLayer = UsgsLayer;