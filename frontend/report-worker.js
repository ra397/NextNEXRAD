let db = null;

self.onmessage = async function(e) {
    const { type, serverUrl, threshold } = e.data;
    
    if (type === 'get_coverage') {
        await initDatabaseConnection();
        const coverageData = await fetchCoverage(serverUrl, threshold);
        postMessage({ coverage: coverageData });
        return;
    }
    
    // Your existing initial load code
    await initDatabaseConnection();
    const [population, coverage] = await Promise.all([
        fetchPopulation(serverUrl),
        fetchCoverage(serverUrl, "3k_ft")
    ]);
    postMessage({ population, coverage });
}

const dtypeMap = {
    'uint8': Uint8Array,
    'uint16': Uint16Array,
    'uint32': Uint32Array,
    'int8': Int8Array,
    'int16': Int16Array,
    'int32': Int32Array,
    'float32': Float32Array,
    'float64': Float64Array
};

async function fetchPopulation(serverUrl) {
    // Try cache first
    const cached = await getArray('population');
    if (cached) {
        return cached;
    }
    
    // Not in cache, fetch from server
    const response = await fetch(`${serverUrl}/get-population`);
    const result = await response.json();
    const binaryData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
    const arrayType = dtypeMap[result.dtype];
    const populationData = new arrayType(binaryData.buffer);
    
    // Store in cache for next time
    await storeArray(populationData, 'population');
    
    return populationData;
}

async function fetchCoverage(serverUrl, threshold = "3k_ft") {
    const cacheKey = `coverage_${threshold}`;
    
    // Try cache first
    const cached = await getArray(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Not in cache, fetch from server
    const response = await fetch(`${serverUrl}/get-coverage?threshold=${encodeURIComponent(threshold)}`);
    const result = await response.json();
    const coverageData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
    
    // Store in cache for next time
    const stored = await storeArray(coverageData, cacheKey);
    
    return coverageData;
}

async function initDatabaseConnection() {
    return new Promise((_resolve, _reject) => {
        const request = indexedDB.open("reportDB");

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("Database opened successfully.");
            _resolve();
        }

        request.onerror = function(event) {
            console.error("Error openeing database: ", event.target.errorCode);
            _reject();
        }

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains('typedArrays')) {
                db.createObjectStore('typedArrays', { keyPath: 'id' });
            }
        };
    })
}

function storeArray(array, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['typedArrays'], 'readwrite');
        const objectStore = transaction.objectStore('typedArrays');
        const dataToStore = { id: id, array: array };
        const putRequest = objectStore.put(dataToStore);

        putRequest.onsuccess = function() {
            resolve(true);
        };

        putRequest.onerror = function() {
            resolve(false);
        }
    });
}

function getArray(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['typedArrays'], 'readonly');
        const objectStore = transaction.objectStore('typedArrays');
        const getRequest = objectStore.get(id);
        
        getRequest.onsuccess = function() {
            if (getRequest.result) {
                resolve(getRequest.result.array);  // Return the actual array data
            } else {
                resolve(null);  // Return null if not found
            }
        }
        
        getRequest.onerror = function() {
            resolve(null);
        }
    });
}