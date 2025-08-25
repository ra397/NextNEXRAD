from calculate_blockage import combine_blockage_masks
from calculate_blockage.constants import DEM_PATH, VCP12, window_size, dem_pixel_size
import numpy as np
from pyproj import Transformer
from PIL import Image
from io import BytesIO
import base64
from osgeo import gdal, osr
from PIL import Image
import numpy as np
from io import BytesIO
import base64
from recolor import COLOR_MAP

def get_blockage(easting, northing, elevation_angles_deg=None, tower_m=None, agl_threshold_m=None, color='green'):
    if elevation_angles_deg is None:
        elevation_angles_deg = VCP12
    if tower_m is None:
        tower_m = 30.48
    if agl_threshold_m is None:
        agl_threshold_m = 914.4

    # Generate matrix in EPSG:5070
    matrix_5070 = combine_blockage_masks(
        DEM_PATH, easting, northing, elevation_angles_deg, tower_m, agl_threshold_m, window_size
    ).astype(np.uint8)

    # Save matrix to temporary in-memory GeoTIFF (EPSG:5070)
    driver = gdal.GetDriverByName("GTiff")
    mem_ds = driver.Create('/vsimem/5070.tif', matrix_5070.shape[1], matrix_5070.shape[0], 1, gdal.GDT_Byte)
    mem_ds.SetGeoTransform([
        easting - (window_size * dem_pixel_size) // 2,  # top-left x
        dem_pixel_size,                                 # pixel width
        0,
        northing + (window_size * dem_pixel_size) // 2, # top-left y
        0,
        -dem_pixel_size                                  # pixel height (negative for north-up)
    ])
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(5070)
    mem_ds.SetProjection(srs.ExportToWkt())
    mem_ds.GetRasterBand(1).WriteArray(matrix_5070)
    mem_ds.FlushCache()

    # Reproject to EPSG:3857 using GDAL.Warp
    gdal.Warp(
        '/vsimem/3857.tif',
        '/vsimem/5070.tif',
        dstSRS='EPSG:3857',
        resampleAlg=gdal.GRA_NearestNeighbour
    )

    # Read result and convert to PNG
    reprojected_ds = gdal.Open('/vsimem/3857.tif')
    array = reprojected_ds.ReadAsArray()

    height, width = array.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    # Apply user-specified color
    r, g, b = COLOR_MAP[color]
    rgba[..., 0] = np.where(array == 1, r, 0)  # Red channel
    rgba[..., 1] = np.where(array == 1, g, 0)  # Green channel
    rgba[..., 2] = np.where(array == 1, b, 0)  # Blue channel
    rgba[..., 3] = np.where(array == 1, 255, 0)

    img = Image.fromarray(rgba, mode="RGBA")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    data_url = f"data:image/png;base64,{img_base64}"

    # Convert bounds to epsg:4326
    gt = reprojected_ds.GetGeoTransform()
    x_min = gt[0]
    y_max = gt[3]
    x_max = x_min + gt[1] * reprojected_ds.RasterXSize
    y_min = y_max + gt[5] * reprojected_ds.RasterYSize

    transform = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    west, south = transform.transform(x_min, y_min)
    east, north = transform.transform(x_max, y_max)

    response = {
        "image_url": data_url,
        "bounds": {
            "north": north,
            "south": south,
            "east": east,
            "west": west
        }
    }

    return response

if __name__ == "__main__":
    easting, northing = 649531.417877711355686, 2644666.859246487729251
    coverage = get_blockage(easting, northing)