class CoveragesLayer {
  constructor(map) {
    this.map = map;
    this.canvas = document.getElementById("chess-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.bounds = [
      -13906416.5939,  // west (EPSG:3857)
      2778559.92095,    // south
      -7437947.446900001,   // east
      6267384.38795     // north
    ];

    this.overlay = null;
  }

  async load() {
    const kmPerPixel = 1; // 1km x 1km pixels
    const pixelSize = 1000; // 1km in meters

    const width = Math.round((this.bounds[2] - this.bounds[0]) / pixelSize);
    const height = Math.round((this.bounds[3] - this.bounds[1]) / pixelSize);

    this.canvas.width = width;
    this.canvas.height = height;

    // Project bounds to lat/lng
    const transformer = proj4("EPSG:3857", "EPSG:4326");
    const [west, south] = transformer.forward([this.bounds[0], this.bounds[1]]);
    const [east, north] = transformer.forward([this.bounds[2], this.bounds[3]]);
    const overlayBounds = { north, south, east, west };

    this.drawCheckerboard(width, height);

    this.overlay = new CanvasOverlay(overlayBounds, this.canvas);
    this.overlay.setMap(this.map);
  }

  drawCheckerboard(width, height) {
    const imageData = this.ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isDark = (x + y) % 2 === 0;

        const color = isDark ? 0 : 255; // black or white
        imageData.data[idx] = color;
        imageData.data[idx + 1] = color;
        imageData.data[idx + 2] = color;
        imageData.data[idx + 3] = 100; // semi-transparent
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.canvas.style.display = "none";
    if (this.overlay) this.overlay.setMap(null);
  }
}

window.CoveragesLayer = CoveragesLayer;