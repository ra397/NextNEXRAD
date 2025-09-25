import numpy as np

def get_1d_profile(window: np.ndarray, resolution_m: int = 250, km_radius: int = 230) -> np.ndarray:
    steps_per_km = 1000 // resolution_m       
    samples_per_ray = km_radius               
    total_steps = samples_per_ray * steps_per_km 

    height, width = window.shape
    center_x, center_y = width // 2, height // 2

    angles = np.deg2rad(np.arange(360))
    dx = np.sin(angles)
    dy = -np.cos(angles)

    steps = np.arange(total_steps)

    x = center_x + np.outer(dx, steps)
    y = center_y + np.outer(dy, steps)

    ix = np.clip(np.round(x).astype(int), 0, width - 1)
    iy = np.clip(np.round(y).astype(int), 0, height - 1)

    elevation_samples = window[iy, ix]  

    elevation_chunks = elevation_samples.reshape(360, samples_per_ray, steps_per_km)

    max_elevations = elevation_chunks.max(axis=2)

    return max_elevations.flatten()