let db = null;

self.onmessage = async function(e) {
    const { serverUrl } = e.data;    
    await initDatabaseConnection();
    const [population, coverage_3k, coverage_6k, coverage_10k] = await Promise.all([
        fetchPopulation(),
        fetchCoverage("3k_ft"),
        fetchCoverage("6k_ft"),
        fetchCoverage("10k_ft")
    ]);
    postMessage({ population, coverage_3k, coverage_6k, coverage_10k });
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

async function fetchPopulation() {
    // Try cache first
    const cached = await getArray('population');
    if (cached) {
        return cached;
    }
    
    // Not in cache, fetch from server
    const response = await fetch(`public/data/population/ppp.bin.gz`);
    
    if (!response.ok) throw new Error("Failed to fetch");

    const ds = new DecompressionStream("gzip");
    const decompressedStream = response.body.pipeThrough(ds);
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();    
    
    const arrayType = dtypeMap["uint16"];
    const populationData = new arrayType(decompressedBuffer);

    // Store in cache for next time
   const stored = await storeArray(populationData, 'population');
    
    return populationData;
}

async function fetchCoverage(threshold = "3k_ft") {
    const cacheKey = `coverage_${threshold}`;
    
    // Try cache first
    const cached = await getArray(cacheKey);
    if (cached) {
        return cached;
    }
    
    // Not in cache, fetch from server
    const response = await fetch(`public/data/coverages/${threshold}.bin.gz`);

    if (!response.ok) throw new Error("Failed to fetch");

    // Decompress the gzip stream
    const ds = new DecompressionStream("gzip");
    const decompressedStream = response.body.pipeThrough(ds);
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();

    // Convert to typed array
    const arrayType = dtypeMap["uint8"]; // or dynamic from header if you change that
    const coverageData = new arrayType(decompressedBuffer);

    // Store in cache for next time
    const stored = await storeArray(coverageData, cacheKey);
    
    return coverageData;
}

async function initDatabaseConnection() {
    return new Promise((_resolve, _reject) => {
        const request = indexedDB.open("reportDB");

        request.onsuccess = function(event) {
            db = event.target.result;
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