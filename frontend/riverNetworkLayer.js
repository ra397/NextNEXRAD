class RiverNetworkLayer {
    constructor(map) {
        this.map = map;
        this.tileLayer = null;
        this.currentColor = "#46bcec"; // Store the current color
        this.isLayerVisible = false; // Track visibility state
        this.loadRiverNetwork();
    }

    initUI() {
        const riverNetworkCheckbox = document.getElementById("riverNetwork-checkbox");
        riverNetworkCheckbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                this.show();
            } else {
                this.hide();
            }
        });

        // Initialize the visibility based on the checkbox state
        if (riverNetworkCheckbox.checked) {
            this.show();
        } else {
            this.hide();
        }
    }

    loadRiverNetwork() {
        this.tileLayer = new pbfLayer(
            {
                map: this.map,
                extent: {
                    west: -124.642,
                    south: 25.41,
                    east: -67.058,
                    north: 49.364
                },
                z_min: 5,
                z_max: 12,
                data: null,
                check_exists: true,
                tileURL: (_zxy) => {
                    return `//s-iihr80.iihr.uiowa.edu/hm_devel3/static/nhd_gauge_conn/vtiles/getVtile/?zxy=${_zxy}`;
                }
            },
            this.map,
        );

        let use_style = this.tileLayer.defaultStyle();
        use_style.strokeColor = this.currentColor;

        this.tileLayer.tileStyle = (f) => {
            let style = this.tileLayer.defaultStyle();
            style.strokeColor = this.currentColor;
            return style;
        }
    }

    show() {
        if (this.tileLayer) {
            this.tileLayer.show();
            this.isLayerVisible = true;
        }
    }

    hide() {
        if (this.tileLayer) {
            this.tileLayer.hide();
            this.isLayerVisible = false;
        }
    }

    reset() {
        this.hide();
        document.getElementById("riverNetwork-checkbox").checked = false;
    }

    // Get the current color of the tiles
    getColor() {
        return this.currentColor;
    }

    // Set a new color and reload the tiles
    setColor(newColor) {
        this.currentColor = newColor;
        
        // Store current visibility state
        const wasVisible = this.isLayerVisible;
        
        // Hide current tiles
        this.hide();
        
        // Reload the river network with new color
        this.loadRiverNetwork();
        
        // Restore visibility state
        if (wasVisible) {
            this.show();
        }
    }
}