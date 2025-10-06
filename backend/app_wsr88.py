from flask import Flask, request, jsonify, send_file
from processor import get_blockage
import traceback
from flask_cors import CORS
import os
from recolor import recolor_png
import base64
from calculate_blockage.read_dem import DemReader
from calculate_blockage.get_1d_profile import get_1d_profile

app = Flask(__name__)
CORS(app, resources={
    r"/api-wsr88/*": {
        "origins": [
            "https://s-iihr80.iihr.uiowa.edu",
            "http://localhost:5500"
        ]
    }
})

@app.route("/api-wsr88/ping", methods=['GET'])
def api_root():
    return 'pong'

@app.route("/api-wsr88/calculate_blockage", methods=["POST"])
def calculate_blockage():
    try:
        data = request.get_json()
        easting = data.get("easting")
        northing = data.get("northing")
        tower_m = data.get("tower_m")
        max_alt_m = data.get("max_alt_m")
        elevation_angles = data.get("elevation_angles")
        color = data.get("color")

        print("Request received:", data)

        return jsonify(get_blockage(
            easting=easting,
            northing=northing,
            elevation_angles_deg=elevation_angles,
            tower_m=tower_m,
            agl_threshold_m=max_alt_m,
            color=color
        ))

    except Exception as e:
        traceback.print_exc()
        return jsonify({"detail": str(e)}), 500

TILE_BASE_PATH = r''

@app.route('/api-wsr88/tiles', methods=['GET'])
def get_tile():
    # Get parameters
    layer_threshold = request.args.get('layer_threshold')
    z = request.args.get('z')
    x = request.args.get('x')
    y = request.args.get('y')
    color = request.args.get('color')

    tile_path = os.path.join(TILE_BASE_PATH, layer_threshold, z, x, f"{y}.png") # type: ignore

    if os.path.exists(tile_path):
        img_buffer = recolor_png(tile_path, color)
        return send_file(img_buffer, mimetype='image/png')
    else:
        return jsonify({'error': 'Tile not found'}), 404

dem_path = r"C:\Users\ralaya\Documents\gis\projects\wsr88-coverage-app\backend\dem1000_epsg3857.tif"
@app.route("/api-wsr88/get-terrain")
def get_terrain():
    dem_reader = DemReader(dem_path)
    easting_str = request.args.get("easting")
    northing_str = request.args.get("northing")
    if easting_str is None or northing_str is None:
        return jsonify({"error": "Missing required parameters 'easting' or 'northing'"}), 400
    easting = float(easting_str)
    northing = float(northing_str)
    window = dem_reader.window(easting=easting, northing=northing, window_size=920, flip=False) # we are in 3857, no need to flip
    profile_1d = get_1d_profile(window=window, easting=easting, northing=northing)
    profile_1d_bytes = profile_1d.tobytes()
    profile_1d_b64 = base64.b64encode(profile_1d_bytes).decode('utf-8')
    dem_reader.close()
    return jsonify({
        "terrain": profile_1d_b64,
        "dtype": str(profile_1d.dtype),
        "width": 230,
    })

if __name__ == "__main__":
    app.run(debug=True)