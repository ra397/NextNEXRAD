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
    
    // Store the current color (default black)
    this.currentColor = "#000000";
  }

  sliderKeyValueObject = {
  1: 1,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
  6: 25,
  7: 30,
  8: 35,
  9: 40,
  10: 45,
  11: 50,
  12: 55,
  13: 60,
  14: 65,
  15: 70,
  16: 75,
  17: 80,
  18: 85,
  19: 90,
  20: 95,
  21: 100,
  22: 125,
  23: 150,
  24: 175,
  25: 200,
  26: 225,
  27: 250,
  28: 275,
  29: 300,
  30: 325,
  31: 350,
  32: 375,
  33: 400,
  34: 425,
  35: 450,
  36: 475,
  37: 500,
  38: 550,
  39: 600,
  40: 650,
  41: 700,
  42: 750,
  43: 800,
  44: 850,
  45: 900,
  46: 950,
  47: 1000,
  48: 1250,
  49: 1500,
  50: 1750,
  51: 2000,
  52: 2250,
  53: 2500,
  54: 2750,
  55: 3000,
  56: 3250,
  57: 3500,
  58: 3750,
  59: 4000,
  60: 4250,
  61: 4500,
  62: 4750,
  63: 5000,
  64: 5500,
  65: 6000,
  66: 6500,
  67: 7000,
  68: 7500,
  69: 8000,
  70: 8500,
  71: 9000,
  72: 9500,
  73: 10000,
  74: 11250,
  75: 12500,
  76: 13750,
  77: 15000,
  78: 16250,
  79: 17500,
  80: 18750,
  81: 20000,
  82: 21250,
  83: 22500,
  84: 23750,
  85: 25000
};

  initUI() {
    const slider = document.getElementById("popThreshold-slider");
    const label = document.getElementById("popThreshold-value");

    slider.addEventListener("input", e => {
      console.log(e.target.value);
      this.threshold = +this.sliderKeyValueObject[e.target.value];
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

    // Parse hex color to RGB
    const hex = this.currentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const imageData = this.ctx.createImageData(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;
        const value = this.data[i];
        const idx = i * 4;

        if (value >= this.threshold) {
          imageData.data[idx] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
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

  // Get the current color
  getColor() {
    return this.currentColor;
  }

  // Set a new color and redraw if visible
  setColor(hexColor) {
    this.currentColor = hexColor;
    
    // Redraw if canvas is visible
    if (this.canvas.style.display !== "none" && this.data) {
      this.draw();
    }
  }
}

window.PopulationLayer = PopulationLayer;