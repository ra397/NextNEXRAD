let currentMarkerType = null;
let previousMarkerType = null;

// Make the marker control popups draggable windows
const markerControlPopup = document.querySelector(".marker-control-popup");
if (!markerControlPopup._dragger) {
    markerControlPopup._dragger = new DragContainer(markerControlPopup, ['drag-cnr tl-cnr', 'drag-cnr tr-cnr', 'drag-cnr bl-cnr', 'drag-cnr br-cnr']);
}
// Add event listeners to all edit-marker-icon spans
document.querySelectorAll('.edit-marker-icon[data-marker-type]').forEach(icon => {
    icon.addEventListener('click', function() {
        const newMarkerType = this.dataset.markerType;
        const isSameMarkerType = newMarkerType === previousMarkerType;
        
        currentMarkerType = newMarkerType;
        populateMarkerControlPopup(currentMarkerType);
        
        if (isSameMarkerType) {
            toggleMarkerControlPopup();
        } else {
            showMarkerControlPopup();
        }
        
        previousMarkerType = newMarkerType;
    });
});

const title = document.getElementById("marker-preview");
const colorInput = document.getElementById("marker-fill");
const sizeInput = document.getElementById('marker-size');
const opacityInput = document.getElementById('marker-opacity');
const opacityValue = document.getElementById('opacity-value');

function populateMarkerControlPopup(markerType) {
    let markerStyle = null;
    document.getElementById("marker-size-label").style.display = "block";
    sizeInput.style.display = "block";
    document.getElementById("opacity-control-row").style.display = "none";
    if (markerType == "nexrad") {
        markerStyle = radarLayer.nexradMarkers.getMarkerStyle();
        title.textContent = "NEXRAD Markers";
    } else if (markerType == "generated") {
        markerStyle = radarLayer.customMarkers.getMarkerStyle();
        title.textContent = "Custom Markers";
    } else if (markerType == "usgs") {
        markerStyle = usgsLayer.getMarkerStyle();
        title.textContent = "USGS Markers";
    } else if (markerType == "river") {
        title.textContent = "River Network";
        document.getElementById("marker-size-label").style.display = "none";
        sizeInput.style.display = "none";
        colorInput.value = riverLayer.getColor();
        return;
    } else if (markerType == "population") {
        title.textContent = "Population Layer";
        document.getElementById("marker-size-label").style.display = "none";
        sizeInput.style.display = "none";

        document.getElementById("opacity-control-row").style.display = "block";

        colorInput.value = populationLayer.getColor();

        const currentOpacity = populationLayer.getOpacity();
        opacityInput.value = currentOpacity;
        opacityValue.textContent = `${Math.round(currentOpacity * 100)}%`;
        return;
    }
    else {
        console.error("Invalid markerType.");
    }
    colorInput.value = markerStyle.color;
    sizeInput.value = markerStyle.size;
}

function updateMarker() {
    if (currentMarkerType == "nexrad") {
        radarLayer.nexradMarkers.setMarkerStyle(colorInput.value, sizeInput.value);
    } else if (currentMarkerType == "generated") {
        radarLayer.customMarkers.setMarkerStyle(colorInput.value, sizeInput.value);
    } else if (currentMarkerType == "usgs") {
        usgsLayer.setMarkerStyle(colorInput.value, sizeInput.value);
    } else if (currentMarkerType == "river") {
        riverLayer.setColor(colorInput.value);
    } else if (currentMarkerType == "population") {
        populationLayer.setColor(colorInput.value);
        
        // Update opacity if the control is visible
        if (opacityInput && opacityValue) {
            const newOpacity = parseFloat(opacityInput.value);
            populationLayer.setOpacity(newOpacity);
            opacityValue.textContent = `${Math.round(newOpacity * 100)}%`;
        }
    } 
    else {
        console.error("Invalid markerType.");
    }
}

function toggleMarkerControlPopup() {
    const popup = document.querySelector(".marker-control-popup");
    if (window.getComputedStyle(popup).display === "none") {
        popup.style.display = "block";
    } else {
        popup.style.display = "none";
    }
}

function showMarkerControlPopup() {
    const popup = document.querySelector(".marker-control-popup");
    popup.style.display = "block";
}

// Add this code to initialize the popup visibility control
function initMarkerControlPopupVisibility() {
    const mapControl = document.getElementById('map-control');
    const markerControlPopup = document.querySelector('.marker-control-popup');
    
    if (!mapControl || !markerControlPopup) {
        console.warn('Map control or marker control popup elements not found');
        return;
    }
    
    // Track the previous visibility state of map-control
    let mapControlWasVisible = window.getComputedStyle(mapControl).display !== 'none';
    
    // Create observer to watch for changes to map-control visibility
    const mapControlObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const isCurrentlyVisible = mapControl.style.display !== 'none' && 
                                         window.getComputedStyle(mapControl).display !== 'none';
                
                // If map-control became hidden, hide the marker popup too
                if (mapControlWasVisible && !isCurrentlyVisible) {
                    markerControlPopup.style.display = 'none';
                }
                
                // Update tracking variable
                mapControlWasVisible = isCurrentlyVisible;
            }
        });
    });
    
    // Start observing map-control for style changes
    mapControlObserver.observe(mapControl, {
        attributes: true,
        attributeFilter: ['style']
    });
    
    // Also hide popup if map-control is initially hidden
    if (window.getComputedStyle(mapControl).display === 'none') {
        markerControlPopup.style.display = 'none';
    }
}

initMarkerControlPopupVisibility();