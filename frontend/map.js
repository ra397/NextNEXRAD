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
    minZoom: 5,
    maxZoom: 12,
    fullscreenControl: false,
    mapTypeId: "terrain",
    styles: window.constants.map.defaultMapStyle,
  });

  existingRadarLayer = new ExistingRadarLayer(map, 'public/data/nexrad.json', 'public/data/nexrad_coverages', 'public/data/nexrad_coverages/radar_bounds.json');
  existingRadarLayer.init();

  customRadarLayer = new CustomRadarLayer(map, server);
  customRadarLayer.init();

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

// Toggle the visibility of a sidebar window
function toggleWindow(id) {
  // Close other windows
  document.querySelectorAll('.sidebar-window').forEach(w => {
    if (w.id !== id) w.style.display = 'none';
  });

  const el = document.getElementById(id);
  el.style.display = (el.style.display === 'block') ? 'none' : 'block';
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

const spinner = document.getElementById("loading-spinner");

function showSpinner() {
  spinner.style.display = "block";
}

function hideSpinner() {
  spinner.style.display = "none";
}

document.getElementById("usgsSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    usgsLayer.showUsgsSites();
  } else {
    usgsLayer.hideUsgsSites();
  }
});