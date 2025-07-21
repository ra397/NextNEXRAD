class markerTip extends google.maps.OverlayView {
    position;
    containerDiv;

    constructor(position, cssClass, content) {
        super();
        this.position = position;

        const anchor = document.createElement("div");

        anchor.classList.add(cssClass);
        anchor.appendChild(content);

        this.containerDiv = anchor
        markerTip.preventMapHitsAndGesturesFrom(this.containerDiv);
    }

    onAdd = () => this.getPanes().floatPane.appendChild(this.containerDiv);

    onRemove = () => {
        if (this.containerDiv.parentElement) {
            this.containerDiv.parentElement.removeChild(this.containerDiv);
        }
    }

    draw = () => {
        const divPosition = this.getProjection().fromLatLngToDivPixel(
            this.position,
        );

        const display =
            Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000
                ? "block"
                : "none";

        if (display === "block") {
            this.containerDiv.style.left = divPosition.x + "px";
            this.containerDiv.style.top = divPosition.y + "px";
        }

        if (this.containerDiv.style.display !== display) {
            this.containerDiv.style.display = display;
        }
    }
}

window.markerTip = markerTip;