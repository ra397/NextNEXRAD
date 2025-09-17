class CoveragesLayer {
  static thresholds = ["3k_tiles", "6k_tiles", "10k_tiles"];
  
  static getSelectedThreshold(rangeSlider = null) {
    // If no slider passed, try to find it in the DOM by ID first, then by type
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
    this.tileLayerIndex = 0;
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

    console.log(this.currentThreshold);

    this.clear();
    this.map.overlayMapTypes.clear();

    if (!this.tileLayers[threshold]) {
      this.tileLayers[threshold] = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          // Call backend instead of direct file access
          const params = new URLSearchParams({
            layer_threshold: threshold,
            z: zoom,
            x: coord.x,
            y: coord.y,
            color: window.overlay_color,
          });
          
          return `${ window._env_prod.SERVER_URL}/tiles?${params.toString()}`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 12,
        minZoom: 5,
        name: threshold,
        opacity: 0.7
      });
    }

    this.tileLayerIndex = this.map.overlayMapTypes.getLength();
    this.map.overlayMapTypes.insertAt(this.tileLayerIndex, this.tileLayers[threshold]);
  }

  clear() {
    if (this.map.overlayMapTypes.getAt(this.tileLayerIndex)) {
      this.map.overlayMapTypes.removeAt(this.tileLayerIndex);
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