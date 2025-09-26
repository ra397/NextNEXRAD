proj4.defs("EPSG:5070", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 " +
                         "+x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs");

const SERVER = window._env_dev.SERVER_URL;

async function fetchTerrainProfile(lat, lng) {
    const [easting, northing] = proj4("EPSG:4326", "EPSG:5070", [lng, lat]);
    const url = `${SERVER}/get-terrain?easting=${encodeURIComponent(easting)}&northing=${encodeURIComponent(northing)}`;

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