class CoveragesLayer {
  static thresholds = ["3k_tiles", "6k_tiles", "10k_tiles"];
  
  static getSelectedThreshold(rangeSlider = null) {
    const slider = rangeSlider || 
                   document.getElementById("threshold-range-slider") || 
                   document.querySelector('input[type="range"]');
    
    if (!slider) {
      console.warn("Range slider not found, returning default threshold");
      return "3k_tiles";
    }
    
    const sliderValue = parseInt(slider.value);
    return this.thresholds[sliderValue] || "3k_tiles";
  }

  constructor(map) {
    this.map = map;
    this.tileLayers = {};
    this.currentTileLayer = null; // Track the currently active tile layer
    this.currentThreshold = "3k_tiles";

    this.showAllCheckbox = null;
    this.rangeSlider = null;
  }

  initUI() {
    this.showAllCheckbox = document.getElementById("show-all-coverage-checkbox");
    this.showAllCheckbox.checked = false;

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

    document.getElementById("radar-settings-window-exit-btn").addEventListener("click", () => {
      document.getElementById("radar-settings-window-exit-btn").parentElement.parentElement.style.display = 'none';
    })
  }

  getSelectedThreshold() {
    return CoveragesLayer.getSelectedThreshold(this.rangeSlider);
  }

  loadAndShowSelectedCoverage() {
    const threshold = this.getSelectedThreshold();
    this.currentThreshold = threshold;

    // First, clear any existing coverage layer
    this.clear();

    // Create the tile layer if it doesn't exist
    if (!this.tileLayers[threshold]) {
      this.tileLayers[threshold] = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const params = new URLSearchParams({
            layer_threshold: threshold,
            z: zoom,
            x: coord.x,
            y: coord.y,
            color: window.overlay_color,
          });
          
          return `${window._env_prod.SERVER_URL}/tiles?${params.toString()}`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 12,
        minZoom: 5,
        name: threshold,
        opacity: 0.7
      });
    }

    // Add the new coverage layer
    this.currentTileLayer = this.tileLayers[threshold];
    this.map.overlayMapTypes.push(this.currentTileLayer);
  }

  clear() {
    if (this.currentTileLayer) {
      // Find and remove only our coverage layer
      const overlayMapTypes = this.map.overlayMapTypes;
      for (let i = overlayMapTypes.getLength() - 1; i >= 0; i--) {
        if (overlayMapTypes.getAt(i) === this.currentTileLayer) {
          overlayMapTypes.removeAt(i);
          break;
        }
      }
      this.currentTileLayer = null;
    }
  }

  reset() {
    this.clear();
    // Reset coverage controls
    document.getElementById("show-all-coverage-checkbox").checked = false;
    // Reset threshold range slider to first position (3k)
    const thresholdSlider = document.querySelector('input[type="range"]');
    if (thresholdSlider) {
      thresholdSlider.value = "0";
      const event = new Event('change', { bubbles: true });
      thresholdSlider.dispatchEvent(event);
    }
  }
}

window.CoveragesLayer = CoveragesLayer;