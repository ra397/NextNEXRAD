class CoveragesLayer {
  constructor(map) {
    this.map = map;
    this.canvas = document.getElementById("coverage-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.data = [];
    this.bounds = null;
    this.overlay = null;

    this.showAllCheckbox = null;
    this.radioButtons = [];
    this.currentThreshold = "coverages_3k";

    this.preloadedData = {
      coverages_3k: null,
      coverages_6k: null,
      coverages_10k: null
    };
  }

  async init() {
    await this.preloadAllCoverages();
  }

  initUI() {
    this.showAllCheckbox = document.getElementById("show-all-coverage-checkbox");
    this.showAllCheckbox.checked = false;

    this.radioButtons = Array.from(document.querySelectorAll('input[name="precalculated-threshold-radiobuttons"]'));

    this.showAllCheckbox.addEventListener('change', () => {
      if (this.showAllCheckbox.checked) {
        this.loadAndShowSelectedCoverage();
      } else {
        this.clear();
      }
    });

    this.radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        if (this.showAllCheckbox.checked) {
          this.loadAndShowSelectedCoverage();
        }
      });
    });
  }

  async preloadAllCoverages() {
    const files = {
      coverages_3k: "combined_coverage_3k.json",
      coverages_6k: "combined_coverage_6k.json",
      coverages_10k: "combined_coverage_10k.json"
    };

    const fetches = Object.entries(files).map(async ([key, filename]) => {
      const response = await fetch(`public/data/${filename}`);
      const data = await response.json();
      this.preloadedData[key] = data;
    });

    await Promise.all(fetches);
  }

  getSelectedThresholdKey() {
    const selected = this.radioButtons.find(r => r.checked);
    if (!selected) return "coverages_3k";
    return selected.value;
  }

  loadAndShowSelectedCoverage() {
    const key = this.getSelectedThresholdKey();
    const data = this.preloadedData[key];
    if (!data) return;

    if (this.currentThreshold === key && this.data.length > 0) {
      this.show();
      return;
    }

    this.currentThreshold = key;
    this.data = data.data;
    this.bounds = [...data.bounds];

    this.applyCoverageData();
    this.showCoverage();
    this.show();
  }

  applyCoverageData() {
    const pixelSize = 1027.802671352157176; // 1km in meters
    const width = Math.round((this.bounds[2] - this.bounds[0]) / pixelSize);
    const height = Math.round((this.bounds[3] - this.bounds[1]) / pixelSize);

    this.canvas.width = width;
    this.canvas.height = height;

    const transformer = proj4("EPSG:3857", "EPSG:4326");
    const [west, south] = transformer.forward([this.bounds[0], this.bounds[1]]);
    const [east, north] = transformer.forward([this.bounds[2], this.bounds[3]]);
    const overlayBounds = { north, south, east, west };

    if (!this.overlay) {
      this.overlay = new CanvasOverlay(overlayBounds, this.canvas);
      this.overlay.setMap(this.map);
    } else {
      this.overlay.bounds = overlayBounds;
      this.overlay.draw();
    }
  }

  showCoverage() {
    if (!this.data || !this.data.length) return;

    const width = this.data[0].length;
    const height = this.data.length;

    const imageData = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = this.data[y][x];

        if (value === 1) {
          imageData.data[idx] = 255;
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

  show() {
    this.canvas.style.display = "block";
  }

  clear() {
    this.canvas.style.display = "none";
  }
}

window.CoveragesLayer = CoveragesLayer;