from calculate_blockage import combine_blockage_masks
from calculate_blockage.constants import DEM_PATH, VCP12, window_size
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from io import BytesIO

def make_png(matrix):
    color = [1.0, 0.0, 0.0, 1.0]  # opaque red
    transparent = [1.0, 0.0, 0.0, 0.0]  # fully transparent

    fig = plt.figure(figsize=(window_size / 100.0, window_size / 100.0), dpi=100, frameon=False)
    ax = fig.add_axes([0, 0, 1, 1])  # type: ignore # fill entire figure
    ax.set_axis_off()
    ax.imshow(matrix, cmap=ListedColormap([transparent, color]), interpolation="nearest")

    buf = BytesIO()
    plt.savefig(buf, format="png", dpi=100, transparent=True, bbox_inches='tight', pad_inches=0)
    plt.close(fig)
    buf.seek(0)

    return buf

def get_blockage(easting, northing, elevation_angles_deg=None, tower_m=None, agl_threshold_m=None):
    if elevation_angles_deg is None:
        elevation_angles_deg = VCP12
    if tower_m is None:
        tower_m = 30.48  # default tower height in meters
    if agl_threshold_m is None:
        agl_threshold_m = 914.4  # default max altitude in meters (3000 ft)

    coverage = combine_blockage_masks(
        DEM_PATH,
        easting,
        northing,
        elevation_angles_deg,
        tower_m,
        agl_threshold_m,
        window_size
    )
    img_buf = make_png(coverage)
    return img_buf

if __name__ == "__main__":
    easting, northing = 649531.417877711355686, 2644666.859246487729251
    img_buf = get_blockage(easting, northing)
    
    with open("kmqt.png", "wb") as f:
        f.write(img_buf.getbuffer())
    
    print("Blockage image saved as kmqt.png")