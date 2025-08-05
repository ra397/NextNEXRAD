class RiverNetworkLayer {
    constructor(map) {
        this.map = map;
        this.tileLayer = null;
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
        console.log("Adding River Network Layer");
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
        use_style.strokeColor = "#46bcec";

        this.tileLayer.tileStyle = (f) => {
            return this.tileLayer.defaultStyle();
        }
    }

    show() {
        if (this.tileLayer) {
            this.tileLayer.show();
        }
    }

    hide() {
        if (this.tileLayer) {
            this.tileLayer.hide();
        }
    }   
}