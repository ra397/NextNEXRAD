class ProfileViewer {
    constructor(map, centerLat, centerLng, profileDistance = 230e3) {
        this.map = map;
        this.center = { lat: centerLat, lng: centerLng };
        this.profileDistance = profileDistance;
        this.elevationAngles = [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5];
        this.azimuth = 0;
        this.terrainProfile = [];
        this.width = 0;
        this.profileSelector = null;

        this._onKeyDown = this._onKeyDown.bind(this);
    }

    async init() {
        this.profileSelector = new ProfileSelector(this.map, this.center.lat, this.center.lng, this.profileDistance);

        const { terrainProfile_1d, width } = await fetchTerrainProfile(this.center.lat, this.center.lng);
        this.terrainProfile = terrainProfile_1d;
        this.width = width;

        this._setupEvents();

        this._displayProfileAtAzimuth(0);

        document.getElementById("terrainProfileCanvasContainer").style.display = "block";
    }

    _setupEvents() {
        google.maps.event.addListener(this.profileSelector.dragMarker, 'drag', (ev) => {
            const azimuth = google.maps.geometry.spherical.computeHeading(this.center, ev.latLng);
            const constrainedPos = google.maps.geometry.spherical.computeOffset(this.center, this.profileDistance, azimuth);
            this.profileSelector.dragMarker.setPosition(constrainedPos);
            this.profileSelector.profileLine.getPath().setAt(1, constrainedPos);
        });

        google.maps.event.addListener(this.profileSelector.dragMarker, 'dragend', (ev) => {
            const azimuth = Math.round(google.maps.geometry.spherical.computeHeading(this.center, ev.latLng));
            this.azimuth = azimuth;
            this._moveToAzimuth(azimuth);
        });

        document.addEventListener('keydown', this._onKeyDown);
    }

    _stepAzimuth(azimuth) {
        let next = azimuth;
        if (next > 180) next = -179 + (next - 181);
        else if (next < -179) next = 180 - (-180 - next);
        return next;
    }

    _onKeyDown(e) {
        const step = 1;
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            this._moveToAzimuth(this._stepAzimuth(this.azimuth - step));
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            this._moveToAzimuth(this._stepAzimuth(this.azimuth + step));
        }
    }

    _moveToAzimuth(azimuth) {
        this.azimuth = azimuth;
        const constrainedPos = google.maps.geometry.spherical.computeOffset(this.center, this.profileDistance, azimuth);
        this.profileSelector.dragMarker.setPosition(constrainedPos);
        if (this.profileSelector.profileLine) {
        this.profileSelector.profileLine.getPath().setAt(1, constrainedPos);
        }
        this._displayProfileAtAzimuth(azimuth);

        const normalizedAzimuth = ((Math.round(azimuth) % 360) + 360) % 360;
        document.getElementById("terrainProfileTitle").textContent = `Azimuth: ${normalizedAzimuth}°`;
    }

    _displayProfileAtAzimuth(azimuth) {
        const profile = this._getTerrainSliceByAzimuth(azimuth);
        setYLimits(Math.min(...this.terrainProfile), Math.max(...this.terrainProfile) + 3e3);
        this.plotTerrainAndBeams(profile);
    }

    _getTerrainSliceByAzimuth(azimuth) {
        const normalizedAzimuth = ((Math.round(azimuth) % 360) + 360) % 360;
        const start = normalizedAzimuth * this.width;
        const stop = start + this.width;
        return this.terrainProfile.slice(start, stop);
    }

    plotTerrainAndBeams(profile) {
        clearGraph();

        const xs = [...Array(profile.length).keys()];

        // Threshold shading
        const thresholds = [3e3, 2e3, 1e3];
        const colors = ["#d0f5fc", "#9debff", "#59d4ff"];
        thresholds.forEach((threshold, i) => {
            const shifted = profile.map(v => v + threshold);
            graphData(xs, shifted, 1, colors[i]);
        });

        // Actual terrain profile
        graphData(xs, profile, 1, null, true);

        // Beam heights
        const xs_km = xs.map(x => x * 1e3);
        for (const angle of this.elevationAngles) {
            graphData(xs, calculateBeamHeights(xs_km, angle, profile[0]));
        }
    }

    destroy() {
        this.azimuth = 0;
        document.removeEventListener('keydown', this._onKeyDown);
        this.profileSelector?.destroy();
        document.getElementById("terrainProfileCanvasContainer").style.display = "none";
        this.terrainProfile = null;
        this.width = null;
    }
}

let currProfileViewer = null;

document.addEventListener("display_profile", async (event) => {
    if (currProfileViewer !== null) {
        currProfileViewer.destroy();
        currProfileViewer = null;
    }
    const lat = event.detail.lat;
    const lng = event.detail.lng;
    const viewer = new ProfileViewer(window.map, lat, lng);
    await viewer.init();
    currProfileViewer = viewer;

    document.getElementById("terrainProfileTitle").textContent = "Azimuth: 0°";
});

document.getElementById("profileWindowExit").addEventListener("click", () => {
    currProfileViewer.destroy();
    currProfileViewer = null;
});

let terrainProfileModeOn = false;

document.getElementById("terrain-profile-mode-toggle").addEventListener("click", () => {
    if (terrainProfileModeOn === false) {
        terrainProfileModeOn = true;
    } else {
        terrainProfileModeOn = false;

        if (currProfileViewer) {
            currProfileViewer.destroy();
            currProfileViewer = null;
        }
    }
});