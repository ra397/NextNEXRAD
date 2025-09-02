const fieldManager = new RadarFieldsManager();

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
            fieldManager.setFields('arbitrary-radar-show', updatedRadar);
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

// Existing Radar Show Menu Button Handlers
// Update Btn: If we have unique params, create new radar
//             otherwise, fetch overlay with params and attach it to existing radar.overlay (show it too)
document.getElementById("update-existing-radar").addEventListener("click", async () => {
    const params = fieldManager.getFields("existing-radar-show");
    const validation = fieldManager.validateFields(params);
    if (validation.ok) {
        const result = await radarLayer.getOverlayForNexradRadar(params);
        if (!result) {
            const siteId = document.getElementById("existing-radar-site-id").textContent;
            console.log(siteId);
            radarLayer.toggleOverlay(siteId);
            const newRadar = await radarLayer.newRadarRequest(params);
            toggleWindow('arbitrary-radar-show');
            fieldManager.setFields('arbitrary-radar-show', newRadar);
            fieldManager.resetFields("existing-radar-show");
        }
    } else {
        showError(validation.errors);
    }
});