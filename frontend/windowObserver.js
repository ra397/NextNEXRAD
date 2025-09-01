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
                console.log("Existing window became invisible - unhighlighting markers");
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
                console.log("Window became invisible - unhighlighting markers");
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