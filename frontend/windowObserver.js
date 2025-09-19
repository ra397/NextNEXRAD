// existing-radar-show window
const closeBtn = document.getElementById("existing-radar-show-close-btn");
const existingWindow = closeBtn.parentElement.parentElement;

// Track the previous visibility state
let wasVisible = window.getComputedStyle(existingWindow).display !== 'none';

// Watch for changes to the existingWindow's style attribute
const existingObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isCurrentlyVisible = existingWindow.style.display !== 'none' && 
                                    window.getComputedStyle(existingWindow).display !== 'none';
            
            // Only trigger if it was visible before and is now hidden
            if (wasVisible && !isCurrentlyVisible) {
                radarLayer.nexradMarkers.unhighlightMarkers();
            }
            // Update the tracking variable
            wasVisible = isCurrentlyVisible;
        }
    });
});

// Start observing the existingWindow for style changes
existingObserver.observe(existingWindow, {
    attributes: true,
    attributeFilter: ['style']
});

// Close button only handles hiding the window
closeBtn.addEventListener("click", () => {
    existingWindow.style.display = 'none';
});

// arbitrary-radar-show window
const showCloseBtn = document.getElementById("arbitrary-radar-show-close-btn");
const showWindow = showCloseBtn.parentElement.parentElement;

let showWasVisible = window.getComputedStyle(showWindow).display !== 'none';

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isCurrentlyVisible = showWindow.style.display !== 'none' && 
                                    window.getComputedStyle(showWindow).display !== 'none';
            
            if (showWasVisible && !isCurrentlyVisible) {
                radarLayer.customMarkers.unhighlightMarkers();
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

// arbitrary-radar window observer
const radarWindow = document.getElementById("arbitrary-radar");

// Track the previous visibility state
let wasWindowVisible = window.getComputedStyle(radarWindow).display !== "none";

// Watch for changes to the radarWindow's style attribute
const radarObserver = new MutationObserver(() => {
    const isCurrentlyVisible = radarWindow.style.display !== "none" &&
                               window.getComputedStyle(radarWindow).display !== "none";

    if (!wasWindowVisible && isCurrentlyVisible) {
        mapLocationSelector.setOnLocationSelected((location) => {
            document.getElementById("radarLat").textContent = location.lat;
            document.getElementById("radarLng").textContent = location.lng;
            mapLocationSelector.addTempMarker(location.lat, location.lng);
        });
        mapLocationSelector.start();
    }

    if (wasWindowVisible && !isCurrentlyVisible) {
        fieldManager.resetFields('arbitrary-radar');
        mapLocationSelector.deleteTempMarker();
        mapLocationSelector.cancel();
    }

    wasWindowVisible = isCurrentlyVisible;
});

radarObserver.observe(radarWindow, {
    attributes: true,
    attributeFilter: ["style"],
});