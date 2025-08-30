const fieldManager = new RadarFieldsManager();

// Event listeners
document.getElementById("select-location-btn").addEventListener("click", () => {
    mapLocationSelector.setOnLocationSelected((location) => {
        document.getElementById("radarLat").textContent = location.lat;
        document.getElementById("radarLng").textContent = location.lng;
        mapLocationSelector.addTempMarker(location.lat, location.lng);
    });
    mapLocationSelector.start();
});

document.getElementById("radar-submit-btn").addEventListener("click", async () => {
    const params = fieldManager.getFields("arbitrary-radar");
    const validation = fieldManager.validateFields(params);
    if (validation.isValid) {
        const newRadar = await radarLayer.newRadarRequest(params);
        mapLocationSelector.deleteTempMarker();
        if (newRadar != null) {
            toggleWindow("arbitrary-radar-show");
            fieldManager.setFields('arbitrary-radar-show', newRadar.params, newRadar.id);
            fieldManager.resetFields("arbitrary-radar");
        }
    } else {
        showError(validation.errors);
    }
});

document.getElementById("update-dynamic-radar").addEventListener("click", async () => {
    const params = fieldManager.getFields("arbitrary-radar-show");
    const validation = fieldManager.validateFields(params);
    if (validation.isValid) {
        const newRadar = await radarLayer.newRadarRequest(params);
        mapLocationSelector.deleteTempMarker();
        if (newRadar != null) {
            // TODO: delete the old radar overlay and marker (from cache as well)
            fieldManager.setFields('arbitrary-radar-show', newRadar.params, newRadar.id);
            fieldManager.resetFields("arbitrary-radar");
        }
    } else {
        showError(validation.errors);
    }
});