class RangeRings {
    constructor(map) {
        this.map = map;
        this.distances = [0, 50000, 100000, 150000, 200000, 230000];
        this.labels = ['None', '50', '100', '150', '200', '230'];
        this.states = {}; // siteId -> sliderValue
        this.rings = {};  // siteId -> array of google.maps.Circle
    }

    initSlider(siteId, sliderId, getCenterFn) {
        // Save default state if first time
        if (!this.states[siteId]) this.states[siteId] = 0;

        const slider = document.getElementById(sliderId);
        if (!slider) return console.warn("Slider not found", sliderId);

        // Set current slider value
        slider.value = this.states[siteId];

        // Reset listeners
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
                radius: this.distances[i],
                clickable: false,
            });
            arr.push(circle);
        }
        this.rings[siteId] = arr;
    }

    show(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(r => r.setMap(this.map));
        }
    }

    hide(siteId) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(r => r.setMap(null));
        }
    }

    remove(siteId, resetState = true) {
        if (this.rings[siteId]) {
            this.rings[siteId].forEach(r => r.setMap(null));
            delete this.rings[siteId];
        }
        if (resetState) this.states[siteId] = 0;
    }

    getState(siteId) {
        return this.labels[this.states[siteId] || 0];
    }

    resetAll() {
        Object.keys(this.rings).forEach(id => this.remove(id));
        Object.keys(this.states).forEach(id => (this.states[id] = 0));
    }
}
window.RangeRings = RangeRings;