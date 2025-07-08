class PopulationLayer {
  constructor(map) {
    this.map = map;
    this.canvas = document.getElementById("pop-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.data = [];
    this.bounds = null;
    this.threshold = 0;
    this.overlay = null;
  }

  initUI() {
    const slider = document.getElementById("popThreshold-slider");
    const label = document.getElementById("popThreshold-value");

    slider.addEventListener("input", e => {
      this.threshold = +e.target.value;
      label.textContent = this.threshold.toLocaleString();
      this.canvas.style.display = "block";
      this.draw();
    });

    document.getElementById("clear-pop-layer").addEventListener("click", () => {
      this.clear();
    });
  }

  async load() {
    const res = await fetch("public/data/usa_ppp_2020_5km_epsg_3857_clipped.json");
    const json = await res.json();

    this.data = json.data;
    this.bounds = json.bounds;

    this.canvas.width = this.data[0].length;
    this.canvas.height = this.data.length;

    const transformer = proj4("EPSG:3857", "EPSG:4326");
    const [west, south] = transformer.forward([this.bounds[0], this.bounds[1]]);
    const [east, north] = transformer.forward([this.bounds[2], this.bounds[3]]);

    const overlayBounds = { north, south, east, west };
    this.overlay = new CanvasOverlay(overlayBounds, this.canvas);
    this.overlay.setMap(this.map);
  }

  draw() {
    if (!this.data.length || !this.ctx) return;

    const width = this.data[0].length;
    const height = this.data.length;

    const imageData = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = this.data[y][x];

        if (value > this.threshold) {
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = 125; // semi-transparent black
        } else {
          imageData.data[idx + 3] = 0; // transparent
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.canvas.style.display = "none";
  }
}

window.PopulationLayer = PopulationLayer;