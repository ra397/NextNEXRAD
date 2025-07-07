infoTool.prototype = new google.maps.OverlayView();

function infoTool(map, latLng, content = undefined) {
    this.latLng = latLng;
    this.gmLayer = null;
    this.container = null;
    this.map = map;
    this.content = content;
    this.ready = false;

    this.setMap(map);
}

infoTool.prototype.onAdd = function () {
    this.gmLayer = this.getPanes().floatPane;
    this.ready = true;
    this.setContent(this.content);
};

infoTool.prototype.setContent = function (content) {
    // Don't proceed until gmLayer is ready
    if (!this.ready || !this.gmLayer) {
        this.content = content; // store for later
        return;
    }

    if (this.container) {
        this.remove();
    }

    if (typeof content === 'object' && content !== null) {
        this.container = content;
    } else {
        this.container = document.createElement('div');
        this.container.innerHTML = content ?? '';
    }

    this.container.style.position = 'absolute';
    this.gmLayer.appendChild(this.container);
    this.draw();
};

infoTool.prototype.updateContent = function (content) {
    this.setContent(content);
};

infoTool.prototype.draw = function () {
    if (!this.container || !this.latLng) return;

    const dxy = this.getProjection().fromLatLngToDivPixel(this.latLng);
    this.container.style.left = `${dxy.x}px`;
    this.container.style.top = `${dxy.y}px`;
};

infoTool.prototype.remove = function () {
    if (!this.gmLayer || !this.container) return;

    this.gmLayer.removeChild(this.container);
    this.container = null;
    this.latLng = null;
    this.ready = false;
};