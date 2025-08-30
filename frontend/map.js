const server = window._env_prod.SERVER_URL;

let map;

let radarLayer;
let usgsLayer;
let podLayer;
let populationLayer;
let coveragesLayer;
let riverLayer;

let isLoading = false;

proj4.defs("EPSG:5070", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 " +
                         "+x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs");

async function initMap() {
  const standardMapType = new google.maps.StyledMapType(standardStyle, { name: 'Standard', mapTypeId: google.maps.MapTypeId.TERRAIN });
  const lightMapType = new google.maps.StyledMapType(lightStyle, { name: 'Light' });
  const darkMapType = new google.maps.StyledMapType(darkStyle, { name: 'Dark' });

  // Initialize the map
  const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 39.5, lng: -98.35 }, // Center USA
      zoom: 5,
      minZoom: 5,
      maxZoom: 12,
      mapTypeId: 'light', // Default to light mode
      gestureHandling: "greedy", // Allow scrolling to zoom (without using CTRL)
      mapTypeControl: true, 
      mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: ['light', 'dark', 'standard', 'satellite', 'hybrid']
      },
      fullScreenControl: true,
      fullscreenControlOptions: {
          position: google.maps.ControlPosition.BOTTOM_RIGHT
      },
  });

  // Register the custom map types
  map.mapTypes.set('light', lightMapType);
  map.mapTypes.set('dark', darkMapType);
  map.mapTypes.set('standard', standardMapType);

  addTerrainStyles();
  const terrainOverlay = new TerrainOverlay(new google.maps.Size(256, 256));
  map.overlayMapTypes.push(terrainOverlay);
  window.terrainOverlay = terrainOverlay;
  window.map = map;
  terrainOverlay.setMap(null); // Start with terrain overlay OFF

  radarLayer = new RadarLayer(map);
  window.radarLayer = radarLayer;
  
  mapLocationSelector = new MapLocationSelector(map);
  window.mapLocationSelector = mapLocationSelector;

  usgsLayer = new UsgsLayer(map);
  await usgsLayer.init();
  window.usgsLayer = usgsLayer;

  podLayer = new PodLayer(map);
  podLayer.initUI();

  populationLayer = new PopulationLayer(map);
  populationLayer.initUI();
  await populationLayer.load();
  window.populationLayer = populationLayer;

  coveragesLayer = new CoveragesLayer(map);
  coveragesLayer.initUI();
  window.coveragesLayer = coveragesLayer; // So i can access this variable in settings.js

  riverLayer = new RiverNetworkLayer(map);
  riverLayer.initUI();
  window.riverLayer = riverLayer;

  map.addListener("zoom_changed", () => {
    const zoom = map.getZoom();
    if (usgsLayer.updateMarkerSize) {
      usgsLayer.updateMarkerSize(zoom);
    }
  })
}

// Given an html input element, get the value
// Returns value if value is valid, null otherwise
function getInput(input) {
  // Get the value from the input element
  const value = parseFloat(input.value);
  // Verify the value
  if (value < 0) {
    alert("Please use non-negative values.");
    return null;
  }
  if (isNaN(value) || value < 0) {
    return null;
  }

  return value;
}

function showSpinner() {
    const spinner = document.getElementById("loading-spinner");
    if (spinner) {
        spinner.style.display = "block";
    }
    this.isLoading = true;
}

function hideSpinner() {
    const spinner = document.getElementById("loading-spinner");
    if (spinner) {
        spinner.style.display = "none";
    }
    this.isLoading = false;
}

// Convert feet to meters
function ft2m(feet) {
  return (feet * 0.3048).toFixed(2);
}

// Convert meters to feet
function m2ft(meters) {
  return (meters * 3.28084).toFixed(2);
}

document.getElementById("existingRadarSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    existingRadarLayer.showMarkers();
  } else {
    existingRadarLayer.hideMarkers();
  }
});

document.getElementById("generatedRadarSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    customRadarLayer.showMarkers();
  } else {
    customRadarLayer.hideMarkers();
  }
});

document.getElementById("usgsSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    usgsLayer.showUsgsSites();
  } else {
    usgsLayer.hideUsgsSites();
  }
});

document.getElementById("terrainOverlay-checkbox").addEventListener("change", function () {
  if (this.checked) {
    terrainOverlay.setMap(window.map);
  } else {
    terrainOverlay.setMap(null);
  }
});

function reset() {
  customRadarLayer.reset();
  customRadarLayer.resetAllRangeRings();
  existingRadarLayer.resetAllRangeRings();
  usgsLayer.reset();
  podLayer.reset();
  populationLayer.clear();
  coveragesLayer.reset();
  riverLayer.reset();
  closeAllWindows();
}

function closeAllWindows() {
  const windows = [
    'arbitrary-radar',
    'arbitrary-radar-show', 
    'existing-radar-show',
    'pod-settings',
    'radar-settings',
    'map-control'
  ];
  windows.forEach(windowId => {
    const window = document.getElementById(windowId);
    if (window) {
      window.style.display = 'none';
    }
  });
}