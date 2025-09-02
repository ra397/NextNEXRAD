class RangeRings {
    constructor(map, unit = "metric") {
        this.map = map;

        this.unit = unit; // "metric" or "imperial"

        this.options = {
            metric: {
                distances: [0, 50000, 100000, 150000, 200000, 230000],
                labels: ['None', '50 km', '100 km', '150 km', '200 km', '230 km']
            },
            imperial: {
                distances: [0, 80467, 160934, 241402], // 50, 100, 150 miles in meters
                labels: ['None', '50 mi', '100 mi', '150 mi']
            }
        };

        this.states = {}; // siteId -> sliderValue
        this.rings = {};  // siteId -> array of google.maps.Circle
    }

    setUnit(unit) {
        if (unit !== "metric" && unit !== "imperial") {
            console.warn("Invalid unit:", unit);
            return;
        }
        this.unit = unit;
        // Re-draw all rings in new units
        Object.keys(this.states).forEach(siteId => {
            const center = this.rings[siteId]?.[0]?.getCenter();
            if (center) this.update(siteId, center);
        });
    }

    initSlider(siteId, sliderId, getCenterFn) {
        if (!this.states[siteId]) this.states[siteId] = 0;

        const slider = document.getElementById(sliderId);
        if (!slider) return console.warn("Slider not found", sliderId);

        slider.max = this.options[this.unit].distances.length - 1;
        slider.value = this.states[siteId];

        const newSlider = slider.cloneNode(true);
        slider.parentNode.replaceChild(newSlider, slider);

        newSlider.addEventListener('input', () => {
            const val = parseInt(newSlider.value, 10);
            this.states[siteId] = val;
            this.update(siteId, getCenterFn());
        });
    }

    update(siteId, center) {
        this.remove(siteId, false);
        const val = this.states[siteId];
        if (val === 0) return;

        const { distances } = this.options[this.unit];
        const latLng = center instanceof google.maps.LatLng ?
            center : new google.maps.LatLng(center.lat, center.lng);

        const arr = [];
        for (let i = 1; i <= val; i++) {
            const circle = new google.maps.Circle({
                strokeColor: '#000000',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillOpacity: 0.0,
                map: this.map,
                center: latLng,
                radius: distances[i], // always meters for Google Maps
                clickable: false,
            });
            arr.push(circle);
        }
        this.rings[siteId] = arr;
    }

    getState(siteId) {
        const { labels } = this.options[this.unit];
        return labels[this.states[siteId] || 0];
    }

    remove(siteId, resetState = true) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(r => r.setMap(null));
            delete this.rings[siteId];
        }
        if (resetState) this.states[siteId] = 0;
    }

    resetAll() {
        Object.keys(this.rings).forEach(id => this.remove(id));
        Object.keys(this.states).forEach(id => (this.states[id] = 0));
    }
}
window.RangeRings = RangeRings;