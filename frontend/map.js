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
  map = new google.maps.Map(document.getElementById("map"), {
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

  window.map = map;
  
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

  // Decode URL
  const radars = radarLayer.decodeRadarParamsListFromUrl(window.location.href);
  showSpinner();
  const promises = radars.map(radar => radarLayer.newRadarRequest(radar.params, radar.id));
  await Promise.all(promises);
  radarLayer.customMarkers.unhighlightMarkers();
  hideSpinner();
  
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

function ft2m(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n * 0.3048;
}
function m2ft(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n / 0.3048;
}

function km2ToMi2(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n * 0.3861021585424458; // 1 km² = 0.3861021585 mi²
}


document.getElementById("existingRadarSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    radarLayer.nexradMarkers.show();
  } else {
    radarLayer.nexradMarkers.hide();
  }
});

document.getElementById("generatedRadarSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    radarLayer.customMarkers.show();
  } else {
    radarLayer.customMarkers.hide();
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

document.getElementById('share-link').addEventListener('click', () => {
  const link = radarLayer.generateUrl();
  copyToClipboard(link);
});

async function copyToClipboard(link) {
  try {
    await navigator.clipboard.writeText(link);
    showError("Link copied to clipboard successfully.");
  } catch (err) {
    showError("Failed to copy link to clipboard.");
  }
}

function reset() {
  currentlySelectedUsgsBasin = null;
  radarLayer.reset();
  radarLayer.rangeRings.resetAll();
  usgsLayer.reset();
  podLayer.reset();
  populationLayer.clear();
  coveragesLayer.reset();
  riverLayer.reset();
  if (currProfileViewer) {
    currProfileViewer.destroy();
    currProfileViewer = null;
  }
  closeAllWindows();
}

function closeAllWindows() {
  const windows = [
    'arbitrary-radar',
    'arbitrary-radar-show', 
    'existing-radar-show',
    'pod-settings',
    'radar-settings',
    'map-control',
    'basin-info-container'
  ];
  windows.forEach(windowId => {
    const window = document.getElementById(windowId);
    if (window) {
      window.style.display = 'none';
    }
  });
  // reset basin stats toggle
  document.getElementById("basin-stats-window-close").style.display = "none";
  document.getElementById("report-toggle-container").style.width = "155px";
}