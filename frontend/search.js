let results = []

const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("search-results");

let debounceTimeout = null;

function normalize(text) {
  return text.trim().toLowerCase();
}

function clearResults() {
  resultsContainer.innerHTML = "";
  resultsContainer.style.display = "none";
}

function displayResults(results) {
  clearResults();
  if (results.length === 0) {
    resultsContainer.style.display = "none";
    return;
  }
  
  resultsContainer.style.display = "block";
  for (const site of results) {
    const li = document.createElement("li");
    li.textContent = `${site.name} – ${site.id}`;
    li.setAttribute("data-id", `${site.id}`);
    li.setAttribute("data-type", site.type); // usgs or nexrad?
    li.setAttribute("title", `${site.name} – ${site.id}`);
    li.className = "search-result-item";
    resultsContainer.appendChild(li);
  }
}

function matchesKeywords(keywords, text) {
  return keywords.every(keyword => text.includes(keyword));
}

function searchSites(searchTerm) {
  const normalizedSearch = normalize(searchTerm);
  if (normalizedSearch.length < 3) {
    clearResults();
    return;
  }

  const keywords = normalizedSearch.split(/\s+/); // split into words
  const matches = [];

  // search nexrad first
  const nexrad_sites = radarLayer.sites;
  for (const site of nexrad_sites) {
    const combined = `${site.name} ${site.id}`.toLowerCase();
    if (matchesKeywords(keywords, combined)) {
      matches.push({ id: site.id, name: site.name, type: 'nexrad' });
      if (matches.length === 10) break;
    }
  }

  // search usgs sites next
  if (matches.length < 10) {
    for (const [site_id, siteData] of Object.entries(usgs_sites)) {
      const combined = `${siteData.name} ${site_id}`.toLowerCase();
      if (matchesKeywords(keywords, combined)) {
        matches.push({ id: site_id, name: siteData.name, type: 'usgs' });
        if (matches.length === 10) break;
      }
    }
  }

  displayResults(matches);
}

// Debounced input handler
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);

  debounceTimeout = setTimeout(() => {
    searchSites(searchInput.value);
  }, 300);
});

// Listen to search result click
resultsContainer.addEventListener('click', function(event) {
  if (event.target.parentElement === resultsContainer) {
    const siteId = event.target.getAttribute('data-id');
    const siteType = event.target.getAttribute('data-type');

    if (siteType === 'nexrad') {
      handleRadarSelection(siteId);
    } else if (siteType === 'usgs') {
      handleUsgsSelection(siteId);
    }

    clearResults();
    searchInput.value = "";
  }
});

function handleUsgsSelection(usgsId) {
    let marker;
    let lat = null;
    let lng = null;
    for (let i = 0; i < usgsLayer.usgsSitesMarkers.markers.length; i++) {
        marker = usgsLayer.usgsSitesMarkers.markers[i];
        if (marker.properties.usgs_id === usgsId) {
            lat = marker.position.lat();
            lng = marker.position.lng();
            break;
        }
    }
    if (lat && lng) {
        usgsLayer.showUsgsSites();
        document.getElementById("usgsSites-checkbox").checked = true;
        usgsLayer.usgsSiteClicked(null, marker, goTo=true);
    }
    clearResults();
    searchInput.value = "";
}

function handleRadarSelection(nexradId) {
  const delta = 1.5;
  for (let i = 0; i < radarLayer.nexradMarkers.markers.length; i++) {
    const marker = radarLayer.nexradMarkers.markers[i];
    if (marker.properties.id === nexradId) {
      lat = marker.position.lat();
      lng = marker.position.lng();
      const sw = { lat: lat - delta, lng: lng - delta };
      const ne = { lat: lat + delta, lng: lng + delta };
      const bounds = new google.maps.LatLngBounds(sw, ne);

      map.fitBounds(bounds);
      map.fitBounds(bounds);
      radarLayer.nexradMarkerClick(null, marker);
      return;
    }
  }
}