async function fetchTerrainProfile(lat, lng) {
    const [easting, northing] = proj4("EPSG:4326", "EPSG:3857", [lng, lat]);
    const url = `${window._env_dev.SERVER_URL}/get-terrain?easting=${encodeURIComponent(easting)}&northing=${encodeURIComponent(northing)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const json = await response.json();

        const { terrain, dtype, width } = json;

        // Base64 decode the terrain string into binary
        const binary = atob(terrain);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const typedArray = new dtypeMap[dtype](bytes.buffer);

        return {
            'terrainProfile_1d': typedArray,
            'width': width
        };

    } catch (err) {
        console.error("Failed to fetch terrain:", err);
        return null;
    }
}