import numpy as np
from pyproj import Geod, Transformer

geod = Geod(ellps='WGS84')

# Define coordinate transformers
to_4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
to_3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)

def transform_3857_to_4326(x, y):
    return to_4326.transform(x, y)

def transform_4326_to_3857(lon, lat):
    return to_3857.transform(lon, lat)

def get_1d_profile(window: np.ndarray, easting, northing) -> np.ndarray:
    profile = []

    for azimuth in range(360):
        for distance in range(230):
            value = get_cell_value(window, azimuth, distance, easting, northing)
            profile.append(value)
    return np.array(profile).astype(np.uint16)

def get_cell_value(window, azimuth, distance, easting, northing):
    # Convert center point from EPSG:3857 to lon/lat (WGS84)
    lon, lat = transform_3857_to_4326(easting, northing)

    # Calculate destination point using geodesic (ellipsoidal) distance
    dest_lon, dest_lat, _ = geod.fwd(lon, lat, azimuth, distance * 1000)

    # Convert destination point back to EPSG:3857
    x_coord, y_coord = transform_4326_to_3857(dest_lon, dest_lat)

    # Convert to pixel coordinates in the DEM window
    height, width = window.shape
    center_x = width // 2
    center_y = height // 2

    # Calculate pixel offsets assuming 1km resolution (1000m/pixel)
    pixel_offset_x = int(round((x_coord - easting) / 1000))
    pixel_offset_y = int(round((northing - y_coord) / 1000))  # y increases downward

    ix = center_x + pixel_offset_x
    iy = center_y + pixel_offset_y

    # Check for out-of-bounds
    if 0 <= ix < width and 0 <= iy < height:
        value = window[iy, ix]
    else:
        value = 0

    return value