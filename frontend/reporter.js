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

    if (basinId === null) return;
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
    console.log(pixelsCoveredByNexrad, pixelsCoveredByCustom, pixelsNotCovered);
    console.log(populationCoveredByNexrad, populationCoveredByCustom, populationNotCovered);
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

document.addEventListener('generateReport', () => {
    generateReport(currentlySelectedUsgsBasin);
});

document.getElementById("report-toggle-container").addEventListener('click', () => {
    const piechartContainer = document.getElementById("piechart-container");
    piechartContainer.style.display = piechartContainer.style.display === "block" ? "none" : "block";
})

/* Pie Chart Visualization */
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(() => {
    drawChart(2, 1, 1);
});

function drawChart(nexrad, custom, none) {
    var data = google.visualization.arrayToDataTable([
        ['Radar', 'Area Covered'],
        ['NEXRAD',      nexrad],
        ['Custom Radars',      custom],
        ['None', none]
    ]);

    var options = {
        colors: ["#007200", "#38b000", "#bc4b51"],
        pieSliceText: 'label-and-percentage',
    };

    var chart = new google.visualization.PieChart(document.getElementById('piechart'));

    chart.draw(data, options);
}