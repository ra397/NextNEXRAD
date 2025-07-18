class PopulationLayer {
  constructor(map) {
    this.map = map;
    this.canvas = document.getElementById("pop-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.data = null; // will be a flat Int32Array
    this.width = 0;
    this.height = 0;
    this.bounds = null;
    this.threshold = 0;
    this.overlay = null;
  }

  initUI() {
    const slider = document.getElementById("popThreshold-slider");
    const label = document.getElementById("popThreshold-value");

    slider.addEventListener("input", e => {
      this.threshold = +e.target.value;
      label.textContent = `${this.threshold.toLocaleString()} people / 25 km²`;
      this.canvas.style.display = "block";
      this.draw();
    });

    document.getElementById("clear-pop-layer").addEventListener("click", () => {
      this.clear();
    });
  }

  async load() {
    // Load bounds in EPSG:4326
    const boundsRes = await fetch("public/data/popRaster_bounds.json");
    const boundsArray = await boundsRes.json(); // [west, south, east, north]
    this.bounds = boundsArray;

    // Load and decompress binary raster
    const gzRes = await fetch("public/data/usa_ppp_2020_5km_epsg3857_clipped.bin.gz");
    const compressed = new Uint8Array(await gzRes.arrayBuffer());
    const decompressed = fflate.decompressSync(compressed); 

    const view = new DataView(decompressed.buffer);
    this.width = view.getUint32(0, true);
    this.height = view.getUint32(4, true);

    this.data = new Int32Array(decompressed.buffer, 8, this.width * this.height);

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.overlay = new CanvasOverlay(this.bounds, this.canvas);
    this.overlay.setMap(this.map);
  }

  draw() {
    if (!this.data || !this.ctx) return;

    const imageData = this.ctx.createImageData(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;
        const value = this.data[i];
        const idx = i * 4;

        if (value > this.threshold) {
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = 125;
        } else {
          imageData.data[idx + 3] = 0;
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