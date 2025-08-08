import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
import numpy as np

def resample_raster(input_path, output_path, scale_factor, method='max'):
    method_map = {
        'nearest': Resampling.nearest,
        'bilinear': Resampling.bilinear,
        'cubic': Resampling.cubic,
        'average': Resampling.average,
        'mode': Resampling.mode,
        'max': Resampling.max,
        'min': Resampling.min,
        'med': Resampling.med,
        'q1': Resampling.q1,
        'q3': Resampling.q3,
        'sum': Resampling.sum,
    }

    if method not in method_map:
        raise ValueError(f"Unsupported resampling method '{method}'")

    resampling_method = method_map[method]

    with rasterio.open(input_path) as src:
        src_transform = src.transform
        src_crs = src.crs
        src_dtype = src.dtypes[0]
        src_data = src.read(1)

        # Calculate new dimensions
        new_height = int(src.height / scale_factor)
        new_width = int(src.width / scale_factor)

        # Calculate new transform
        dst_transform = src_transform * src_transform.scale(
            src.width / new_width,
            src.height / new_height
        )

        dst_profile = src.profile.copy()
        dst_profile.update({
            'height': new_height,
            'width': new_width,
            'transform': dst_transform,
            'dtype': src_dtype
        })

        dst_data = np.empty((new_height, new_width), dtype=src_dtype)

        reproject(
            source=src_data,
            destination=dst_data,
            src_transform=src_transform,
            src_crs=src_crs,
            dst_transform=dst_transform,
            dst_crs=src_crs,
            resampling=resampling_method
        )

    with rasterio.open(output_path, 'w', **dst_profile) as dst:
        dst.write(dst_data, 1)

# Example usage:
resample_raster(
    r"C:\Users\ralaya\Documents\gis\data\usa_population\usa_ppp_2020_1km_epsg3857_clipped.tif",
    r"C:\Users\ralaya\Documents\gis\data\usa_population\usa_ppp_2020_5km_epsg3857_clipped.tif",
    scale_factor=5,
    method='sum'
)