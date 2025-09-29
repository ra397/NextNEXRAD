class FixedDistanceCoveragesLayer {
  static thresholds = ["none", "100km", "150km", "230km"];
  
  static getSelectedThreshold(rangeSlider = null) {
    const slider = rangeSlider || 
                   document.getElementById("fixed-distance-range-slider") || 
                   document.querySelector('#fixed-distance-range-slider');
    
    if (!slider) {
      console.warn("Fixed distance range slider not found, returning default threshold");
      return "none";
    }
    
    const sliderValue = parseInt(slider.value);
    return this.thresholds[sliderValue] || "none";
  }

  constructor(map) {
    this.map = map;
    this.tileLayers = {};
    this.currentTileLayer = null;
    this.currentThreshold = "none";
    this.rangeSlider = null;
  }

  initUI() {
    this.rangeSlider = document.getElementById("fixed-distance-range-slider");
    
    if (!this.rangeSlider) {
      console.error("Fixed distance range slider not found");
      return;
    }

    this.rangeSlider.addEventListener('input', () => {
      const threshold = this.getSelectedThreshold();
      if (threshold === "none") {
        this.clear();
      } else {
        this.loadAndShowSelectedCoverage();
      }
    });
  }

  getSelectedThreshold() {
    return FixedDistanceCoveragesLayer.getSelectedThreshold(this.rangeSlider);
  }

  loadAndShowSelectedCoverage() {
    const threshold = this.getSelectedThreshold();
    
    if (threshold === "none") {
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
          
          return `${window._env_prod.SERVER_URL}/fixed-distance-tiles?${params.toString()}`;
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
    const thresholdSlider = document.getElementById("fixed-distance-range-slider");
    if (thresholdSlider) {
      thresholdSlider.value = "0";
      const event = new Event('change', { bubbles: true });
      thresholdSlider.dispatchEvent(event);
    }
  }
}

window.FixedDistanceCoveragesLayer = FixedDistanceCoveragesLayer;