let population;

let coverage_3k;
let coverage_6k;
let coverage_10k;

let coverage = null;

let dataLoaded = false;

let currentlySelectedUsgsBasin = null;
window.currentlySelectedUsgsBasin = currentlySelectedUsgsBasin;

document.addEventListener("DOMContentLoaded", async () => {
    loadDataUsingWorker();
});

// Loads population and coverage using worker
function loadDataUsingWorker() {
    const worker = new Worker("report-worker.js");
    worker.postMessage({ config });
    worker.onmessage = function(e) {
        const { population: pop, coverage_3k: cov_3k, coverage_6k: cov_6k, coverage_10k: cov_10k } = e.data;
        population = pop;
        coverage_3k = cov_3k;
        coverage_6k = cov_6k;
        coverage_10k = cov_10k;
        dataLoaded = true;
        worker.terminate(); // Clean up
        coverage = coverage_3k;
    };
}

document.getElementById('threshold-range-slider').addEventListener('change', async (e) => {
    const thresholds = ['3k_ft', '6k_ft', '10k_ft'];
    const value = parseInt(e.target.value);
    const threshold = thresholds[value];
    
    if (threshold === "3k_ft") coverage = coverage_3k;
    else if (threshold === "6k_ft") coverage = coverage_6k;
    else if (threshold === "10k_ft") coverage = coverage_10k;

    triggerReportGeneration();
});

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
                    if (binaryIncludes(coverageIndices, index)) {
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
        const response = await fetch(`${config.BASIN_IX_1D}/${usgs_id}.json`);
        const result = await response.json();
        const binaryData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        const arrayType = dtypeMap[result.dtype];
        const basinData = new arrayType(binaryData.buffer);
        return basinData;
        
    } catch (error) {
        console.error('Error loading basin data:', error);
    }
}

function binaryIncludes(arr, target) {
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

    const area_data = [
        { 
            label: 'NEXRAD',
            percentage: `${((latestReport.area.coveredByNexrad / latestReport.area.total) * 100).toFixed(1)}%`,
            raw: `${((latestReport.area.coveredByNexrad / latestReport.area.total) * usgs_sites[currentlySelectedUsgsBasin].area_km2).toFixed(0)}`,
            value: (latestReport.area.coveredByNexrad / latestReport.area.total),
            color: colorMap[overlay_color]
        },
        { 
            label: 'Custom',
            percentage: `${((latestReport.area.coveredByCustom / latestReport.area.total) * 100).toFixed(1)}%`,
            raw: `${((latestReport.area.coveredByCustom / latestReport.area.total) * usgs_sites[currentlySelectedUsgsBasin].area_km2).toFixed(0)}`,
            value: (latestReport.area.coveredByCustom / latestReport.area.total),
            color: radarLayer.customMarkers.getMarkerStyle().color
        },
        { 
            label: 'No Coverage',
            percentage: `${((latestReport.area.notCovered / latestReport.area.total) * 100).toFixed(1)}%`,
            raw: `${((latestReport.area.notCovered / latestReport.area.total) * usgs_sites[currentlySelectedUsgsBasin].area_km2).toFixed(0)}`,
            value: (latestReport.area.notCovered / latestReport.area.total),
            color: '#ffffff'
        },
    ];
    generatePieChart("area-piechart", area_data);

    const totalPopulation = latestReport.population.total || 0;
    const population_data = [
        { 
            label: 'NEXRAD',
            percentage: totalPopulation > 0 ? `${((latestReport.population.coveredByNexrad / totalPopulation) * 100).toFixed(1)}%` : '0.0%',
            raw: totalPopulation > 0 ? `${latestReport.population.coveredByNexrad}` : '0',
            value: totalPopulation > 0 ? (latestReport.population.coveredByNexrad / totalPopulation) : 0,
            color: colorMap[overlay_color]
        },
        { 
            label: 'Custom',
            percentage: totalPopulation > 0 ? `${((latestReport.population.coveredByCustom / totalPopulation) * 100).toFixed(1)}%` : '0.0%',
            raw: totalPopulation > 0 ? `${latestReport.population.coveredByCustom}` : '0',
            value: totalPopulation > 0 ? (latestReport.population.coveredByCustom / totalPopulation) : 0,
            color: radarLayer.customMarkers.getMarkerStyle().color
        },
        { 
            label: 'No Coverage',
            percentage: totalPopulation > 0 ? `${((latestReport.population.notCovered / totalPopulation) * 100).toFixed(1)}%` : '0.0%',
            raw: totalPopulation > 0 ? `${latestReport.population.notCovered}` : '0',
            value: totalPopulation > 0 ? (latestReport.population.notCovered / totalPopulation) : 0,
            color: '#ffffff'
        },
    ];

    generatePieChart("population-piechart", population_data);

    const basinTitle = usgs_sites[currentlySelectedUsgsBasin].name;
    const basinArea_km2 = usgs_sites[currentlySelectedUsgsBasin].area_km2.toFixed(0);
    const basinArea_mi2 = km2ToMi2(basinArea_km2).toFixed(0);
    const basinPopulation = latestReport.population.total;

    document.getElementById("basin-title").textContent = basinTitle;
    document.getElementById("basin-title").setAttribute("title", basinTitle + ` (${currentlySelectedUsgsBasin})`);
    if (units === "metric") {
        document.getElementById("area-heading").innerHTML = `Area: ${basinArea_km2} km<sup>2</sup>`;
    } else {
        document.getElementById("area-heading").innerHTML = `Area: ${basinArea_mi2} mi<sup>2</sup>`;        
    }
    document.getElementById("population-heading").textContent = `Population: ${basinPopulation}`;
});

let usgs_sites = null;
// Load usgs json into memory
fetch(config.USGS_JSON)
    .then(res => res.json())
    .then(data => {
        usgs_sites = data;
    });

document.getElementById("report-toggle-container").addEventListener('click', () => {
    const piechartContainer = document.getElementById("basin-info-container");
    const toggleContainer = document.getElementById("report-toggle-container");
    const currentWidth = toggleContainer.style.width;
    const exitButton = document.getElementById("basin-stats-window-close");
    if (currentlySelectedUsgsBasin === null) {
        showError("A USGS basin must be selected.");
        return;
    }
    if (coverage === null) {
        showError("Waiting for data to load.");
        return;
    }
    piechartContainer.style.display = piechartContainer.style.display === "block" ? "none" : "block";
    toggleContainer.style.width = (currentWidth === "414px") ? "155px" : "414px";
    exitButton.style.display =  exitButton.style.display === "block" ? "none" : "block";
});


function generatePieChart(piechart_el, data) {
    const canvas = document.getElementById(piechart_el);
    const ctx = canvas.getContext('2d');

    // Dynamically create legend items based on data
    let legend_el;
    if (piechart_el === "area-piechart") legend_el = "area-legend";
    else if (piechart_el == "population-piechart") legend_el = "population-legend";
    const legendContainer = document.getElementById(legend_el);

    // Clear any existing legend items
    legendContainer.innerHTML = "";

    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'piechart-legend-row header';

    ['', '%', 'Value'].forEach(text => {
        const col = document.createElement('div');
        col.className = 'piechart-legend-col';
        col.textContent = text;
        headerRow.appendChild(col);
    });
    legendContainer.appendChild(headerRow);

    // Create rows
    data.forEach(item => {
        const row = document.createElement('div');
        row.className = 'piechart-legend-row';

        // Column 1: Color box + label
        const labelCol = document.createElement('div');
        labelCol.className = 'piechart-legend-col label-col';

        const colorBox = document.createElement('div');
        colorBox.className = 'piechart-legend-color';
        colorBox.style.backgroundColor = item.color;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;

        labelCol.appendChild(colorBox);
        labelCol.appendChild(labelSpan);
        row.appendChild(labelCol);

        // Column 2: Percentage Value
        const percentCol = document.createElement('div');
        percentCol.className = 'piechart-legend-col';
        percentCol.textContent = item.percentage;
        row.appendChild(percentCol);

        // Column 3: Raw Value
        if (piechart_el === "area-piechart") {
            const metric_area = parseFloat(item.raw).toFixed(0);
            const imperial_area = parseFloat(km2ToMi2(item.raw)).toFixed(0);
            const valueCol = document.createElement('div');
            valueCol.className = 'piechart-legend-col area-value'
            valueCol.dataset.metric = metric_area;
            valueCol.dataset.imperial = imperial_area;
            valueCol.innerHTML = (units === "metric") ? metric_area : imperial_area;
            row.appendChild(valueCol);
        } else {
            const valueCol = document.createElement('div');
            valueCol.className = 'piechart-legend-col';
            valueCol.innerHTML = item.raw;
            row.appendChild(valueCol);
        }
        legendContainer.appendChild(row);
    });


    // Dynamically create pie chart based on data
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

        startAngle = endAngle; // Update the starting angle for the next slice
    });   
    
    // Draw border around the entire pie
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
}