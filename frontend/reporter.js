let population;
let coverage;
let dataLoaded = false;

let currentlySelectedUsgsBasin = null;
window.currentlySelectedUsgsBasin = currentlySelectedUsgsBasin;

document.addEventListener("DOMContentLoaded", async () => {
    loadDataUsingWorker();
});

// Loads population and coverage using worker
function loadDataUsingWorker() {
    const worker = new Worker("report-worker.js");
    worker.postMessage({
        serverUrl: window._env_prod.SERVER_URL
    });

    worker.onmessage = function(e) {
        const { population: pop, coverage: cov } = e.data;
        population = pop;
        coverage = cov;
        dataLoaded = true;
        worker.terminate(); // Clean up
        console.log('Data loaded!');
    };
}

document.getElementById('threshold-range-slider').addEventListener('change', async (e) => {
    const thresholds = ['3k_ft', '6k_ft', '10k_ft'];
    const value = parseInt(e.target.value);
    const threshold = thresholds[value];
    
    try {
        await changeCoverageThreshold(threshold);
        triggerReportGeneration({
            action: 'thresholdChanged',
            threshold: threshold
        });
    } catch (error) {
        console.error('Error changing coverage threshold:', error);
    }
});

function changeCoverageThreshold(newThreshold) {
    return new Promise((resolve, reject) => {
        const worker = new Worker("report-worker.js");
        
        worker.postMessage({
            type: 'get_coverage',
            serverUrl: window._env_prod.SERVER_URL,
            threshold: newThreshold
        });
        
        worker.onmessage = function(e) {
            coverage = e.data.coverage;
            worker.terminate();
            console.log(`Coverage updated to ${newThreshold}`);
            resolve(e.data); 
        };
        
        worker.onerror = function(error) {
            worker.terminate();
            console.error('Worker error:', error);
            reject(error); 
        };
    });
}

async function generateReport(basinId = null) {
    let pixelsCoveredByNexrad = 0;
    let pixelsCoveredByCustom = 0;
    let totalPixels = 0;

    let populationCoveredByNexrad = 0;
    let populationCoveredByCustom = 0;
    let totalPopulation = 0;

    if (basinId === null) return null;
    else { // Otherwise, if basin is selected, loop over basin indices only
        const basinIncides = await getBasinIndices(basinId);
        for (let i = 0; i < basinIncides.length; i++) {
            const index = basinIncides[i];
            const populationAtPixel = population[index];
            const coverageAtPixel = coverage[index];

            if (coverageAtPixel === 1) {
                pixelsCoveredByNexrad++;
                populationCoveredByNexrad += populationAtPixel;
            }
            else {
                for (const coverageIndices of radarLayer.coverageIndicesMap.values()) {
                    if (binaryIncudes(coverageIndices, index)) {
                        pixelsCoveredByCustom++;
                        populationCoveredByCustom += populationAtPixel;
                        break;
                    }
                }
            }
            totalPopulation += populationAtPixel;
        }
        totalPixels = basinIncides.length;
    }
    const pixelsNotCovered = totalPixels - pixelsCoveredByNexrad - pixelsCoveredByCustom;
    const populationNotCovered = totalPopulation - populationCoveredByNexrad - populationCoveredByCustom;
    const report = {
        basinId,
        area: {
            coveredByNexrad: pixelsCoveredByNexrad,
            coveredByCustom: pixelsCoveredByCustom,
            notCovered: pixelsNotCovered,
            total: totalPixels
        },
        population: {
            coveredByNexrad: populationCoveredByNexrad,
            coveredByCustom: populationCoveredByCustom,
            notCovered: populationNotCovered,
            total: totalPopulation
        }
    };
    return report;
}

async function getBasinIndices(usgs_id) {
    try {
        const response = await fetch(`${window._env_prod.SERVER_URL}/get-basin?id=${usgs_id}`);
        const result = await response.json();
        const binaryData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        const arrayType = dtypeMap[result.dtype];
        const basinData = new arrayType(binaryData.buffer);
        return basinData;
        
    } catch (error) {
        console.error('Error loading basin data:', error);
    }
}

function binaryIncudes(arr, target) {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) {
      return true;
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return false; 
}

function triggerReportGeneration() {
    const event = new CustomEvent('generateReport');
    document.dispatchEvent(event);
}

const colorMap = {
    green: "rgb(82, 182, 82)",
    purple: "rgb(82, 82, 182)",
    gray: "rgb(172, 172, 172)",
    yellow: "rgb(255, 222, 32)",
};

// Generate Report event
document.addEventListener('generateReport', async () => {
    const report = await generateReport(currentlySelectedUsgsBasin);
    if (report == null) return;
    window.latestReport = report;
    // Using the report, generate the pie chart
    const basinTitle = "Area Coverage";
    const basinId = `Basin ID: ${report.basinId}`;
    let subtitle;
    if (window.units == "metric") {
        subtitle = `Total Area: ${report.area.total} km`;
    } else {
        subtitle = `Total Area: ${km2ToMi2(report.area.total).toFixed(0)} mi`;
    }
    const data = [
        { label: 'NEXRAD', value: (report.area.coveredByNexrad / report.area.total) * 100, color: colorMap[overlay_color] },
        { label: 'Custom Radars', value: (report.area.coveredByCustom / report.area.total) * 100, color: radarLayer.customMarkers.getMarkerStyle().color },
        { label: 'None', value: (report.area.notCovered / report.area.total) * 100, color: "#ffffff"}
    ];
    document.getElementById("area-population-toggle").checked = false;
    generatePieChart(basinTitle, basinId, subtitle, data);
});

document.getElementById("report-toggle-container").addEventListener('click', () => {
    // Toggle basin stats window
    const piechartContainer = document.getElementById("basin-info-container");
    const toggleContainer = document.getElementById("report-toggle-container");
    const currentWidth = toggleContainer.style.width;
    if (currentlySelectedUsgsBasin !== null) {
        piechartContainer.style.display = piechartContainer.style.display === "block" ? "none" : "block";
        toggleContainer.style.width = (currentWidth === "324px") ? "120px" : "324px";
    } else {
        showError("A USGS basin must be selected.");
    }
});

document.getElementById("area-population-toggle").addEventListener('click', async () => {
    const report = window.latestReport;

    // Toggle between area and population
    const piechartTitleElem = document.getElementById("piechart-title");
    const showingArea = piechartTitleElem.textContent === "Area Coverage";

    let basinTitle, subtitle, data;
    const basinId = `Basin ID: ${report.basinId}`;

    if (showingArea) {
        document.getElementById("superscript").style.display = 'none';
        basinTitle = "Population Coverage";
        subtitle = `Total Population: ${report.population.total}`;
        data = [
            { label: 'NEXRAD', value: (report.population.coveredByNexrad / report.population.total) * 100, color: colorMap[overlay_color] },
            { label: 'Custom Radars', value: (report.population.coveredByCustom / report.population.total) * 100, color: radarLayer.customMarkers.getMarkerStyle().color },
            { label: 'None', value: (report.population.notCovered / report.population.total) * 100, color: "#ffffff" }
        ];
    } else {
        document.getElementById("superscript").style.display = 'inline-block';
        basinTitle = "Area Coverage";
        if (window.units == 'metric') {
            subtitle = `Total Area: ${report.area.total} km`;
        } else {
            subtitle = `Total Area: ${km2ToMi2(report.area.total).toFixed(0)} mi`;
        }
        data = [
            { label: 'NEXRAD', value: (report.area.coveredByNexrad / report.area.total) * 100, color: colorMap[overlay_color] },
            { label: 'Custom Radars', value: (report.area.coveredByCustom / report.area.total) * 100, color: radarLayer.customMarkers.getMarkerStyle().color },
            { label: 'None', value: (report.area.notCovered / report.area.total) * 100, color: "#ffffff" }
        ];
    }
    generatePieChart(basinTitle, basinId, subtitle, data);
});

function generatePieChart(title, basinId, subtitle, data) {
    const canvas = document.getElementById('piechart');
    const ctx = canvas.getContext('2d');
    // Dynamically fill out titles based on data
    document.getElementById("piechart-title").textContent = title;
    document.getElementById("piechart-basin-id").textContent = basinId;
    document.getElementById("piechart-subtitle").textContent = subtitle;
    // Dynamically create legend items based on data
    const legendContainer = document.getElementById('piechart-legend');
    legendContainer.innerHTML = ''; // Clear previous legend items
    data.forEach(item => {
        // Create legend item container
        const legendItem = document.createElement('div');
        legendItem.className = 'piechart-legend-item';
        
        // Create color box
        const colorBox = document.createElement('div');
        colorBox.className = 'piechart-legend-color';
        colorBox.style.backgroundColor = item.color;
        
        // Create label span
        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        
        // Append elements to legend item
        legendItem.appendChild(colorBox);
        legendItem.appendChild(labelSpan);
        
        // Append legend item to container
        legendContainer.appendChild(legendItem);
    });

    // Dynamically generate pie chart based on data
    const MIN_LABEL_PERCENTAGE = 10;
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 * 0.8; 
    let startAngle = -Math.PI / 2; // Start from the top (12 o'clock position)

    data.forEach(item => {
        const sliceAngle = (item.value / totalValue) * 2 * Math.PI; // Angle for the current slice
        const endAngle = startAngle + sliceAngle;

        // draw slice
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2); // Move to the center
        ctx.arc(canvas.width / 2, canvas.height / 2, radius, startAngle, endAngle); // Draw the arc
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();

        // Add labels
        if (item.value >= MIN_LABEL_PERCENTAGE) {
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.value.toFixed(0) + '%', labelX, labelY);
        }
        startAngle = endAngle; // Update the starting angle for the next slice
    });
    // Draw border around the entire pie
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.stroke();
}