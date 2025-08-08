from processor import get_blockage
import json
from pyproj import Transformer
import base64

def feet_to_meters(feet):
    return feet * 0.3048

def save_png(data_url, directory, filename):
    _, encoded = data_url.split(',', 1)
    with open(f"{directory}/{filename}.png", "wb") as f:
        f.write(base64.b64decode(encoded))

transformer = Transformer.from_crs("epsg:4326", "epsg:5070", always_xy=True)

bounding_boxes = {}

with open("nexrad.json", "r") as f:
    nexrad = json.load(f)

    for radar in nexrad:
        print(f"Processing {radar['id']}...")

        radar_lat = radar["lat"]
        radar_lon = radar["lng"]

        # Convert from lat/lng to easting/northing in epsg:5070
        easting, northing = transformer.transform(radar_lon, radar_lat)

        tower_height_m = feet_to_meters(radar["tower"])

        response = get_blockage(
            easting=easting,
            northing=northing,
            tower_m=tower_height_m,
            agl_threshold_m=feet_to_meters(10_000),
        )

        if response is None:
            print(f"Failed to process {radar['id']}")
            continue

        save_png(response["image_url"], "coverages_10k", radar["id"])

        bounding_boxes[radar["id"]] = response["bounds"]

with open("radar_bounds.json", "w") as f:
    json.dump(bounding_boxes, f, indent=2)