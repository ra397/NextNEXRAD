class UsgsLayer {
    constructor(map) {
        this.map = map;

        this.usgsSitesMarkers = new markerCollection(this.map);

        this.populationPerBasinMap = null;

        this.basinLayers = {};
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
        this.loadUsgsSites();
        this.loadPopulationPerBasin();
    }

    loadUsgsSites() {
        const url = window._env_dev.USGS_SITES_URL;
        this._getArrayBuffer(url).then((ret) => {
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
                        mouseOver: false,
                        mouseOut: false
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
    }

    usgsSiteClicked(event, marker) {
        const props = marker.properties || marker.content?.dataset || {};
        const usgsId = props.usgs_id;
        const area = props.drainage_area;
        const population = this.populationPerBasinMap?.[usgsId] ?? null;

        // If the basin is already shown, remove it and the label
        if (this.basinLayers[usgsId]) {
            this.basinLayers[usgsId].setMap(null); // Remove basin from map
            delete this.basinLayers[usgsId];       // Delete reference

            if (marker.customLabel && marker.customLabel.remove) {
                marker.customLabel.remove();       // Remove label from map
            }
            delete marker.customLabel; 
            return;
        }

        // Otherwise, load and show basin and label
        this.showLabel(marker, usgsId, area, population);
        this.loadBasin(usgsId);
    }

    async loadBasin(usgsId) {
        try {
            const buf = await this._getArrayBuffer(`${window._env_dev.USGS_BOUNDARY_URL}${usgsId}.pbf`);
            const geojson = geobuf.decode(new Pbf(new Uint8Array(buf)));

            const layer = new google.maps.Data({ map: this.map });
            layer.addGeoJson(geojson);
            layer.setStyle({
                fillColor: "gray",
                fillOpacity: 0.2,
                strokeColor: "black",
                strokeWeight: 1,
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

        const useMetric = (window.currentUnitSystem === "metric");
        const displayArea = useMetric ? Math.round(area_km2) : Math.round(area_km2 * 0.386102);
        const unit = useMetric ? "km²" : "mi²";

        let html = `${site_id}<br>Area: ${displayArea} ${unit}`;
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
}

window.UsgsLayer = UsgsLayer;