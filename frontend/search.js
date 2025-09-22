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
    li.setAttribute("title", `${site.name} – ${site.id}`);
    li.className = "search-result-item";
    resultsContainer.appendChild(li);
  }
}

function searchSites(searchTerm) {
  const normalizedSearch = normalize(searchTerm);
  if (normalizedSearch.length < 3) {
    clearResults();
    return;
  }

  const keywords = normalizedSearch.split(/\s+/); // split into words
  const matches = [];

  for (const [site_id, siteData] of Object.entries(usgs_sites)) {
    const siteName = siteData.name || "";
    const combined = (siteName + " " + site_id).toLowerCase();

    // Check that all keywords are present
    const allKeywordsMatch = keywords.every(keyword => combined.includes(keyword));

    if (allKeywordsMatch) {
      matches.push({ id: site_id, name: siteName });
      if (matches.length === 10) break;
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
    // Check if the clicked element is a direct child of search-results
    if (event.target.parentElement === resultsContainer) {
        // Get the data-id attribute and log it
        const usgsId = event.target.getAttribute('data-id');
        handleUserSelection(usgsId)
    }
});

function handleUserSelection(usgsId) {
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