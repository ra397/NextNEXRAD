import json
import numpy as np
from osgeo import gdal, osr
from pyproj import Transformer
from calculate_blockage import combine_blockage_masks
from calculate_blockage.constants import DEM_PATH, VCP12, window_size
from calculate_blockage.read_dem import DemReader

# DEM extent and size
DEM_MIN_X = -2583576
DEM_MAX_X = 2637501
DEM_MIN_Y = -30485
DEM_MAX_Y = 3402178
DEM_WIDTH = 20883
DEM_HEIGHT = 13730

dem_pixel_size_x = (DEM_MAX_X - DEM_MIN_X) / DEM_WIDTH
dem_pixel_size_y = (DEM_MAX_Y - DEM_MIN_Y) / DEM_HEIGHT

print(dem_pixel_size_x, dem_pixel_size_y)

def feet_to_meters(feet):
    return feet * 0.3048

dem_reader = DemReader(DEM_PATH)

# Load radar locations
with open("nexrad.json", "r") as f:
    radars = json.load(f)

# Create output raster array
combined = np.zeros((DEM_HEIGHT, DEM_WIDTH), dtype=np.uint8)

transformer = Transformer.from_crs("epsg:4326", "epsg:5070", always_xy=True)

for radar in radars:
    easting, northing = transformer.transform(radar['lng'], radar['lat'])
    tower_height_m = feet_to_meters(radar['tower'])

    coverage = combine_blockage_masks(
        dem_path=DEM_PATH,
        easting=easting,
        northing=northing,
        elevation_angles=VCP12,
        tower_height=tower_height_m,
        agl_threshold=feet_to_meters(3_000)
    )
    x = int((easting - DEM_MIN_X) / dem_pixel_size_x) - window_size // 2
    y = int((DEM_MAX_Y - northing) / dem_pixel_size_y) - window_size // 2

    x0 = max(x, 0)
    y0 = max(y, 0)
    x1 = min(x + window_size, DEM_WIDTH)
    y1 = min(y + window_size, DEM_HEIGHT)

    cov_x0 = x0 - x if x0 > x else 0
    cov_y0 = y0 - y if y0 > y else 0
    cov_x1 = window_size - (x + window_size - x1) if x1 < x + window_size else window_size
    cov_y1 = window_size - (y + window_size - y1) if y1 < y + window_size else window_size

    combined[y0:y1, x0:x1] |= coverage[cov_y0:cov_y1, cov_x0:cov_x1]

dem_reader.close()

# Write 5070 matrix to GeoTiff
driver = gdal.GetDriverByName("GTiff")
out_ds = driver.Create("5070.tif", DEM_WIDTH, DEM_HEIGHT, 1, gdal.GDT_Byte)
gt = (DEM_MIN_X, dem_pixel_size_x, 0, DEM_MAX_Y, 0, -dem_pixel_size_y)
out_ds.SetGeoTransform(gt)
srs = osr.SpatialReference()
srs.ImportFromEPSG(5070)
out_ds.SetProjection(srs.ExportToWkt())
out_ds.GetRasterBand(1).WriteArray(combined)
out_ds.FlushCache()

# Reprojet to 3857 using GDAL.Warp
gdal.Warp(
    '3857.tif',
    '5070.tif',
    dstSRS='EPSG:3857',
    resampleAlg=gdal.GRA_NearestNeighbour
)

# Find bounds in 4326
reprojected_ds = gdal.Open('3857.tif')
gt = reprojected_ds.GetGeoTransform()
x_min = gt[0]
y_max = gt[3]
x_max = x_min + gt[1] * reprojected_ds.RasterXSize
y_min = y_max + gt[5] * reprojected_ds.RasterYSize

transform = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
west, south = transform.transform(x_min, y_min)
east, north = transform.transform(x_max, y_max)

bounds = {
    "north": north,
    "south": south,
    "east": east,
    "west": west
}

print(f"Saved combined coverages with 3k ft threshold with bounds: {bounds}")