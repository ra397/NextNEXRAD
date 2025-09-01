const fieldManager = new RadarFieldsManager();

// Select Location Button Click Handler
document.getElementById("select-location-btn").addEventListener("click", () => {
    mapLocationSelector.setOnLocationSelected((location) => {
        document.getElementById("radarLat").textContent = location.lat;
        document.getElementById("radarLng").textContent = location.lng;
        mapLocationSelector.addTempMarker(location.lat, location.lng);
    });
    mapLocationSelector.start();
});

// Arbitrary Radar Menu Button Handlers
// "Get Coverage Button" Click Handler
document.getElementById("radar-submit-btn").addEventListener("click", async () => {
    const params = fieldManager.getFields("arbitrary-radar");
    const validation = fieldManager.validateFields(params);
    if (validation.ok) {
        const newRadar = await radarLayer.newRadarRequest(params);
        mapLocationSelector.deleteTempMarker();
        if (newRadar != null) {
            toggleWindow("arbitrary-radar-show");
            fieldManager.setFields('arbitrary-radar-show', newRadar);
            fieldManager.resetFields("arbitrary-radar");
        }
    } else {
        showError(validation.errors);
    }
});

// Arbitrary Radar Show Menu Button Handlers
// Update Button Click Handler - in Custom Radar Viewer
document.getElementById("update-dynamic-radar").addEventListener("click", async () => {
    const params = fieldManager.getFields("arbitrary-radar-show");
    const validation = fieldManager.validateFields(params);
    if (validation.ok) {
        const oldRadarId = fieldManager._getNumberFromSpan("dynamic-radar-site-id");
        const updatedRadar = radarLayer.updateRadar(oldRadarId, params);
        mapLocationSelector.deleteTempMarker();
        if (updatedRadar != null) {
            fieldManager.setFields('arbitrary-radar-show', updatedRadar.params);
            fieldManager.resetFields("arbitrary-radar");
        }
    } else {
        showError(validation.errors);
    }
});

document.getElementById("toggle-dynamic-radar").addEventListener("click", () => {
    const radarId = fieldManager._getNumberFromSpan("dynamic-radar-site-id");
    radarLayer.toggleOverlay(radarId);
});

document.getElementById("delete-dynamic-radar").addEventListener("click", () => {
    const radarId = fieldManager._getNumberFromSpan("dynamic-radar-site-id");
    radarLayer.deleteRadar(radarId);
    fieldManager.resetFields("arbitrary-radar-show");
    toggleWindow("arbitrary-radar-show");
});