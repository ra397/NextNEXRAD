let population; // Store in localstorage or indexDB
let coverage;

let LENGTH = 17_923_693

document.addEventListener("DOMContentLoaded", async () => {
    population = await getPopulation();
    coverage = await getCoverage();
})

async function generateReport(basinId = null) {
    let areaCovered = 0;
    let totalArea = 0;
    let populationCovered = 0;
    let totalPopulation = 0;
    if (basinId === null) { // If no basin is selected, loop over conus
        // TODO: we are currently looping through the whole bounds (we should only loop through CONUS indices only)
        for (let i = 0; i < LENGTH; i++) {
            const populationAtPixel = population[i];
            const coverageAtPixel = coverage[i];

            if (coverageAtPixel === 1) {
                areaCovered += 1;
                populationCovered += populationAtPixel;
            }
            totalPopulation += populationAtPixel;
        }
        totalArea = LENGTH;
    }
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

    console.log(areaCovered, totalArea, areaCovered / totalArea);
    console.log(populationCovered, totalPopulation, populationCovered / totalPopulation);
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

async function getPopulation() {
    try {
        const response = await fetch(`${window._env_prod.SERVER_URL}/get-population`);
        const result = await response.json();
        
        const binaryData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));

        const arrayType = dtypeMap[result.dtype];
        const populationData = new arrayType(binaryData.buffer);
        
        return populationData;
        
    } catch (error) {
        console.error('Error loading population data:', error);
    }
}

async function getCoverage() {
    try {
        const response = await fetch(`${window._env_prod.SERVER_URL}/get-coverage`);
        const result = await response.json();
        
        const coverageData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        
        return coverageData;
        
    } catch (error) {
        console.error('Error loading coverage data:', error);
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