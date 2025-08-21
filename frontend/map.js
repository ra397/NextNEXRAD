const server = window._env_dev.SERVER_URL;

let map;

let existingRadarLayer;
let customRadarLayer;
let usgsLayer;
let podLayer;
let populationLayer;
let coveragesLayer;
let riverLayer;

let isLoading = false;

proj4.defs("EPSG:5070", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 " +
                         "+x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs");

async function initMap() {
  // Initialize the map
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: window.constants.map.defaultZoom,
    center: window.constants.map.centerUSA,
    gestureHandling: "greedy",
    minZoom: 5,
    maxZoom: 12,
    fullscreenControl: false,
    mapTypeId: "terrain",
    styles: window.constants.map.defaultMapStyle,
  });

  customRadarLayer = new CustomRadarLayer(map, server);
  customRadarLayer.init();

  existingRadarLayer = new ExistingRadarLayer(map, 'public/data/nexrad.json', 'public/data/nexrad_coverages/radar_bounds.json', customRadarLayer);
  existingRadarLayer.init();

  usgsLayer = new UsgsLayer(map);
  await usgsLayer.init();

  podLayer = new PodLayer(map);
  podLayer.initUI();

  populationLayer = new PopulationLayer(map);
  populationLayer.initUI();
  await populationLayer.load();

  coveragesLayer = new CoveragesLayer(map);
  coveragesLayer.initUI();

  riverLayer = new RiverNetworkLayer(map);
  riverLayer.initUI();

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

document.getElementById("usgsSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    usgsLayer.showUsgsSites();
  } else {
    usgsLayer.hideUsgsSites();
  }
});

function reset() {
  customRadarLayer.reset();
  usgsLayer.hideUsgsSites();
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