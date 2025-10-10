class CoveragesLayer {
  static thresholds = ["hide", "3k_tiles", "6k_tiles", "10k_tiles"];
  
  static getSelectedThreshold(rangeSlider = null) {
    const slider = rangeSlider || 
                   document.getElementById("threshold-range-slider") || 
                   document.querySelector('input[type="range"]');
    
    if (!slider) {
      console.warn("Range slider not found, returning default threshold");
      return "hide";
    }
    
    const sliderValue = parseInt(slider.value);
    return this.thresholds[sliderValue] || "hide";
  }

  constructor(map) {
    this.map = map;
    this.tileLayers = {};
    this.currentTileLayer = null;
    this.currentThreshold = "hide";
    this.rangeSlider = null;
  }

  initUI() {
    this.rangeSlider = document.querySelector('input[type="range"]');
    
    if (!this.rangeSlider) {
      console.error("Range slider not found");
      return;
    }

    this.rangeSlider.addEventListener('input', () => {
      const threshold = this.getSelectedThreshold();
      if (threshold === "hide") {
        this.clear();
      } else {
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
    
    if (threshold === "hide") {
      this.clear();
      return;
    }
    
    this.currentThreshold = threshold;

    this.clear();

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
          
          return `${config.APP_API}/tiles?${params.toString()}`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 12,
        minZoom: 5,
        name: threshold,
        opacity: 0.7
      });
    }

    this.currentTileLayer = this.tileLayers[threshold];
    this.map.overlayMapTypes.push(this.currentTileLayer);
  }

  clear() {
    if (this.currentTileLayer) {
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
    const thresholdSlider = document.querySelector('input[type="range"]');
    if (thresholdSlider) {
      thresholdSlider.value = "0";
      const event = new Event('change', { bubbles: true });
      thresholdSlider.dispatchEvent(event);
    }
  }
}

window.CoveragesLayer = CoveragesLayer;