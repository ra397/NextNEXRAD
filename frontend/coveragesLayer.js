class CoveragesLayer {
  constructor(map) {
    this.map = map;
    this.tileLayers = {
      coverages_3k: null,
      coverages_6k: null,
      coverages_10k: null
    };
    this.tileLayerIndex = 0;
    this.currentThreshold = "3k_tiles";

    this.showAllCheckbox = null;
    this.rangeSlider = null;
    
    // Mapping slider values to coverage keys
    this.sliderMapping = {
      0: { key: "3k_tiles", value: "coverages_3k" },
      1: { key: "6k_tiles", value: "coverages_6k" },
      2: { key: "10k_tiles", value: "coverages_10k" }
    };
  }

  initUI() {
    this.showAllCheckbox = document.getElementById("show-all-coverage-checkbox");
    this.showAllCheckbox.checked = false;

    // Get the range slider element
    this.rangeSlider = document.querySelector('input[type="range"]');
    
    if (!this.rangeSlider) {
      console.error("Range slider not found");
      return;
    }

    this.showAllCheckbox.addEventListener('change', () => {
      if (this.showAllCheckbox.checked) {
        this.loadAndShowSelectedCoverage();
      } else {
        this.clear();
      }
    });

    this.rangeSlider.addEventListener('input', () => {
      if (this.showAllCheckbox.checked) {
        this.loadAndShowSelectedCoverage();
      }
    });
  }

  getSelectedThresholdKey() {
    const sliderValue = parseInt(this.rangeSlider.value);
    const mapping = this.sliderMapping[sliderValue];
    
    if (mapping) {
      return mapping.key;
    } else {
      return "3k_tiles"; // default fallback
    }
  }

  getSelectedCoverageValue() {
    const sliderValue = parseInt(this.rangeSlider.value);
    const mapping = this.sliderMapping[sliderValue];
    
    if (mapping) {
      return mapping.value;
    } else {
      return "coverages_3k"; // default fallback
    }
  }

  loadAndShowSelectedCoverage() {
    const key = this.getSelectedThresholdKey();
    const coverageValue = this.getSelectedCoverageValue();
    this.currentThreshold = key;

    console.log(this.currentThreshold);

    // Remove all layers first
    this.clear();

    if (!this.tileLayers[coverageValue]) {
      this.tileLayers[coverageValue] = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return `public/data/nexrad_coverages/${key}/${zoom}/${coord.x}/${coord.y}.png`; // adjust path as needed
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 12,
        minZoom: 5,
        name: key,
        opacity: 0.4
      });
    }

    this.tileLayerIndex = this.map.overlayMapTypes.getLength();
    this.map.overlayMapTypes.insertAt(this.tileLayerIndex, this.tileLayers[coverageValue]);
  }

  clear() {
    if (this.map.overlayMapTypes.getAt(this.tileLayerIndex)) {
      this.map.overlayMapTypes.removeAt(this.tileLayerIndex);
    }
  }
}

window.CoveragesLayer = CoveragesLayer;