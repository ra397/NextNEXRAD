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
    this.radioButtons = [];
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

  getSelectedThresholdKey() {
    const selected = this.radioButtons.find(r => r.checked).value;
    if (selected == "coverages_3k") {
      return "3k_tiles";
    } else if (selected == "coverages_6k") {
      return "6k_tiles";
    } else if (selected == "coverages_10k") {
      return "10k_tiles";
    } else {
      return "3k_tiles";
    }
  }

  loadAndShowSelectedCoverage() {
    const key = this.getSelectedThresholdKey();
    this.currentThreshold = key;

    console.log(this.currentThreshold);

    // Remove all layers first
    this.clear();

    if (!this.tileLayers[key]) {
      this.tileLayers[key] = new google.maps.ImageMapType({
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
    this.map.overlayMapTypes.insertAt(this.tileLayerIndex, this.tileLayers[key]);
  }

  clear() {
    if (this.map.overlayMapTypes.getAt(this.tileLayerIndex)) {
      this.map.overlayMapTypes.removeAt(this.tileLayerIndex);
    }
  }
}

window.CoveragesLayer = CoveragesLayer;