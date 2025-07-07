const server = window._env_dev.SERVER_URL;

let map;

let radarLayer; // Radar layer for displaying radar coverage
let usgsLayer;
let podLayer;
let populationLayer;

let isLoading = false;

proj4.defs("EPSG:3857",
  "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 " +
  "+datum=WGS84 +units=m +no_defs"
);

async function initMap() {
  // Initialize the map
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: window.constants.map.defaultZoom,
    center: window.constants.map.centerUSA,
    draggableCursor: 'crosshair',
    fullscreenControl: false,
    mapTypeId: "terrain",
    styles: window.constants.map.defaultMapStyle,
  });

  radarLayer = new RadarLayer(map, 'public/data/nexrad_epsg3857.geojson', 'public/data/nexrad_coverages');
  radarLayer.initUI();
  await radarLayer.init();

  usgsLayer = new UsgsLayer(map);
  await usgsLayer.init();

  podLayer = new PodLayer(map);
  podLayer.initUI();

  populationLayer = new PopulationLayer(map);
  populationLayer.initUI();
  await populationLayer.load();

  // Event handler when user clicks on a point in the map
  map.addListener("click", (e) => {
    // Do not allow user to click on map if a request is being processed
    if (isLoading) return;

    // Get the lat and lon coordinates of the point that was clicked (epsg:4326)
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    const maxAlt = getInput(document.getElementById("aglThreshold-input"));
    const towerHeight = getInput(document.getElementById("towerHeight-input"));

    const unitSystem = document.getElementById("units-input").value;
    const feetToMeters = (m) => m / 3.28084;

    let alt_m = null;
    let tower_m = null;
    if (maxAlt !== null) {
      alt_m = unitSystem === "metric" ? maxAlt : feetToMeters(maxAlt);
    }
    if (towerHeight !== null) {
      tower_m = unitSystem === "metric" ? towerHeight : feetToMeters(towerHeight);
    }
    const angles = getCheckedElevationAngles();

    try {
      isLoading = true;
      showSpinner();
      radarLayer.getCoverage(lat, lng, alt_m, tower_m, angles);
    } catch (err) {
      console.error("Error in radarLayer.getCoverage", err);
    } finally {
      hideSpinner();
      isLoading = false;
    }
  });
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

// Returns a list of checked elevation angles
function getCheckedElevationAngles() {
  const checkboxes = document.querySelectorAll('#elevation-angle-checkboxes input[type="checkbox"]');
  return Array.from(checkboxes)
              .filter(cb => cb.checked)
              .map(cb => parseFloat(cb.value));
}

document.getElementById("usgsSites-checkbox").addEventListener("change", function () {
  if (this.checked) {
    usgsLayer.showUsgsSites();
  } else {
    usgsLayer.hideUsgsSites();
  }
});

// Updates labels in radar settings menu based on selected units
document.getElementById("units-input").addEventListener("change", function () {
  const unit = this.value;
  
  const aglLabel = document.querySelector("label[for='aglThreshold-input']");
  const towerLabel = document.querySelector("label[for='towerHeight-input']");
  const aglInput = document.getElementById("aglThreshold-input");
  const towerInput = document.getElementById("towerHeight-input");
  
  const precalculatedThresholdLabel = document.getElementById("precalculated-threshold-label");
  const threeThousandFeetCoverage = document.getElementById("3k_coverage_label");
  const sixThousandFeetCoverage = document.getElementById("6k_coverage_label");
  const tenThousandFeetCoverage = document.getElementById("10k_coverage_label");


  if (unit === "metric") {
    aglLabel.textContent = "AGL Threshold (m):";
    towerLabel.textContent = "Tower Height (m):";
    aglInput.placeholder = "e.g. 914.4";
    towerInput.placeholder = "e.g. 30.48";

    precalculatedThresholdLabel.textContent = "Precalculated Coverages Threshold (m):"
    threeThousandFeetCoverage.textContent = "914.4";
    sixThousandFeetCoverage.textContent = "1828.8";
    tenThousandFeetCoverage.textContent = "3048";
  } else {
    aglLabel.textContent = "AGL Threshold (ft):";
    towerLabel.textContent = "Tower Height (ft):";
    aglInput.placeholder = "e.g. 3000";
    towerInput.placeholder = "e.g. 100";

    precalculatedThresholdLabel.textContent = "Precalculated Coverages Threshold (ft):"
    threeThousandFeetCoverage.textContent = "3k";
    sixThousandFeetCoverage.textContent = "6k";
    tenThousandFeetCoverage.textContent = "10k";
  }
});