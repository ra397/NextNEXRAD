class CoveragesLayer {
  constructor(map) {
    this.map = map;
    this.canvas = document.getElementById("coverage-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.data = [];
    this.bounds = null;

    this.overlay = null;

    this.showAllCheckbox = null;
  }

  initUI() {
    this.showAllCheckbox = document.getElementById("show-all-coverage-checkbox");
    this.showAllCheckbox.checked = false;
    this.showAllCheckbox.addEventListener('change', () => {
      if (this.showAllCheckbox.checked) {
        this.show();
      } else {
        this.clear();
      }
    })
  }

  async load() {
    // Load bounds and coverage data from JSON
    const response = await fetch("public/data/combined_coverage.json");
    const data = await response.json();
    this.data = data.data;

    // Expecting: { bounds: [west, south, east, north], coverage: [[0,1,...], ...] }
    this.bounds = [
      data.bounds[0],
      data.bounds[1],
      data.bounds[2],
      data.bounds[3]
    ];

    const pixelSize = 1027.802671352157176; // 1km in meters

    const width = Math.round((this.bounds[2] - this.bounds[0]) / pixelSize);
    const height = Math.round((this.bounds[3] - this.bounds[1]) / pixelSize);

    this.canvas.width = width;
    this.canvas.height = height;

    // Project bounds to lat/lng
    const transformer = proj4("EPSG:3857", "EPSG:4326");
    const [west, south] = transformer.forward([this.bounds[0], this.bounds[1]]);
    const [east, north] = transformer.forward([this.bounds[2], this.bounds[3]]);
    const overlayBounds = { north, south, east, west };

    await this.showCoverage();

    this.overlay = new CanvasOverlay(overlayBounds, this.canvas);
    this.overlay.setMap(this.map);
  }

  async showCoverage() {
    const width = this.data[0].length;
    const height = this.data.length;

    const imageData = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = this.data[y][x];

        if (value == 1) {
          imageData.data[idx] = 255;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = 125; // semi-transparent red
        } else {
          imageData.data[idx + 3] = 0; // transparent
        }
      }
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this.clear();
  }

  show() {
    this.canvas.style.display = "block";
  }

  clear() {
    this.canvas.style.display = "none";
  }
}

window.CoveragesLayer = CoveragesLayer;