let population;
let coverage;
let dataLoaded = false;

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

function changeCoverageThreshold(newThreshold) {
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
    };
}

async function generateReport(basinId = null) {
    let areaCovered = 0;
    let totalArea = 0;
    let populationCovered = 0;
    let totalPopulation = 0;
    if (basinId === null) return;
    else { // Otherwise, if basin is selected, loop over basin indices only
        const basinIncides = await getBasinIndices(basinId);
        for (let i = 0; i < basinIncides.length; i++) {
            const index = basinIncides[i];
            const populationAtPixel = population[index];
            const coverageAtPixel = coverage[index];

            if (coverageAtPixel === 1) {
                areaCovered += 1;
                populationCovered += populationAtPixel;
            }
            else {
                for (const coverageIndices of radarLayer.coverageIndicesMap.values()) {
                    if (binaryIncudes(coverageIndices, index)) {
                        areaCovered += 1;
                        populationCovered += populationAtPixel;
                        break;
                    }
                }
            }
            totalPopulation += populationAtPixel;
        }
        totalArea = basinIncides.length;
    }
    console.log("Area coverage: ", areaCovered, totalArea, areaCovered / totalArea);
    console.log("Population coverage: ", populationCovered, totalPopulation, populationCovered / totalPopulation);
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