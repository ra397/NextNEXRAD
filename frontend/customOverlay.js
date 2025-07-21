(function () {
    function createClass(name, rules) {
        const style = document.createElement('style');
        style.type = 'text/css';
        document.head.appendChild(style);
        if (!(style.sheet || {}).insertRule)
            (style.styleSheet || style.sheet).addRule(name, rules);
        else
            style.sheet.insertRule(name + "{" + rules + "}", 0);
    }

    createClass('.overlayDiv', "position: absolute; border-style: none; border-width: 0px; image-rendering: pixelated;");
    createClass('.overlayImg', "position: absolute; width: 100%; height: 100%;");
})();


geoOverlay.prototype = new google.maps.GroundOverlay();

function geoOverlay(image, bounds, map) {
    this.set("url", image);
    this.set("bounds", bounds);
    this.setMap(map);
    this.remove = function (){
        this.setMap(null)
    }

    this.setSource = function (src) {
        this.set("url", src);
        this.setMap(map)
    };

    this.animate = function (src) {
        this.set("url", src);
        this.setMap(map)
    };

}

function mercatorOverlay(image, bounds, map) {
    this._imgSrc = image;
    this._opacity = 1.0;
    this._bounds_ = bounds;

    this._div_ = document.createElement('div');
    this._div_.className = 'overlayDiv';

    this._img_ = new Image();
    this._img_.className = 'overlayImg';
    this._img_.src = this._imgSrc;
    this._img_.style.opacity = this._opacity;

    this._div_.appendChild(this._img_);
    this.style = this._div_.style;

    this.projection = null;
    this.naturalHeight = null;
    this.naturalWidth = null;

    if (map) {
        this.setMap(map);
    }
}

mercatorOverlay.prototype = new google.maps.OverlayView();

mercatorOverlay.prototype.onAdd = function () {
    if (!this._div_) {
        this._div_ = document.createElement('div');
        this._div_.className = 'overlayDiv';
        this._div_.style.opacity = this._opacity; // ✅ Apply persisted opacity

        this._img_ = new Image();
        this._img_.className = 'overlayImg';
        this._img_.src = this._imgSrc;
        this._img_.style.opacity = this._opacity; // ✅ Apply here too

        this._div_.appendChild(this._img_);
        this.style = this._div_.style;
    }

    const panes = this.getPanes();
    if (panes && panes.overlayLayer) {
        panes.overlayLayer.appendChild(this._div_);
    } else {
        console.error("Could not get overlayLayer.");
    }

    this.projection = this.getProjection();
};

mercatorOverlay.prototype.draw = function () {
    if (!this.projection) return;
    const sw = this.projection.fromLatLngToDivPixel(this._bounds_.getSouthWest());
    const ne = this.projection.fromLatLngToDivPixel(this._bounds_.getNorthEast());

    this.style.left = sw.x + 'px';
    this.style.top = ne.y + 'px';
    this.style.width = (ne.x - sw.x) + 'px';
    this.style.height = (sw.y - ne.y) + 'px';
};

mercatorOverlay.prototype.onRemove = function () {
    if (this._div_ && this._div_.parentNode) {
        this._div_.parentNode.removeChild(this._div_);
    }
    this._div_ = null;
};

mercatorOverlay.prototype.setMap = function (map) {
    google.maps.OverlayView.prototype.setMap.call(this, map);
};

mercatorOverlay.prototype.setOpacity = function (opacity) {
    this._opacity = opacity;
    if (this.style) this.style.opacity = opacity;
    if (this._img_) this._img_.style.opacity = opacity;
};

mercatorOverlay.prototype.setSource = function (src) {
    this._imgSrc = src;
    if (this._img_) this._img_.src = src;
};

mercatorOverlay.prototype.animate = function (src) {
    this.setSource(src);
};

mercatorOverlay.prototype.remove = function () {
    this.setMap(null);
};

mercatorOverlay.prototype.fromLatLngToColRow = function (_latLng) {
    if (!this._bounds_.contains(_latLng)) return [null, null];

    const nW = this._img_.naturalWidth, nH = this._img_.naturalHeight;
    this.naturalHeight = nH; this.naturalWidth = nW;

    const oL = this._div_.offsetLeft, oT = this._div_.offsetTop;
    const oW = this._div_.offsetWidth, oH = this._div_.offsetHeight;
    const xy = this.projection.fromLatLngToDivPixel(_latLng);

    const rW = nW / oW, rH = nH / oH;

    const col = Math.floor(Math.abs(oL - xy.x) * rW);
    const row = Math.floor(Math.abs(oT - xy.y) * rH);
    return [col, row];
};

function customOverlay(imgSrc, bounds, map, overlayType) {
    if (typeof bounds.extend !== "function" &&
        bounds.hasOwnProperty("sw") &&
        bounds.hasOwnProperty("ne")
    ) {
        bounds = new google.maps.LatLngBounds(bounds.sw, bounds.ne);
    }

    // Always use mercatorOverlay for 'OverlayView'
    if (overlayType === 'OverlayView') {
        return new mercatorOverlay(imgSrc, bounds, map);
    }

    // [Optional] fallback to GroundOverlay if ever needed
    if (overlayType === 'GroundOverlay') {
        return new google.maps.GroundOverlay(imgSrc, bounds, { opacity: 1.0 });
    }

    return null;
}