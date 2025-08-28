class TerrainOverlay {
    constructor(tileSize) {
        this.tileSize = tileSize;
        this.maxZoom = 19;
        this.name = "Terrain Overlay";
        this.alt = "Terrain Overlay";
        this.tiles = [];
        this.display = 'block'; // Start visible
    }

    getTile(coord, zoom, ownerDocument) {
        const div = ownerDocument.createElement("div");
        const img = ownerDocument.createElement("img");
        div.className = "terrain-overlay";
        div.style.display = this.display;
        img.src = `https://mt1.google.com/vt/lyrs=t&x=${coord.x}&y=${coord.y}&z=${zoom}`;
        div.appendChild(img);
        this.tiles.push(div);
        return div;
    }

    releaseTile(tile) {
        tile.innerHTML = '';
        const index = this.tiles.indexOf(tile);
        if (index > -1) {
            this.tiles.splice(index, 1);
        }
    }

    setMap(map = null) {
        this.display = map === null ? 'none' : 'block';
        this.tiles.forEach(tile => tile.style.display = this.display);
    }
}

function addTerrainStyles() {
    const style = document.createElement('style');
    style.textContent = `
        div.terrain-overlay {
            width: 256px;
            height: 256px;     
            filter: brightness(5) sepia(1) invert(1);
            opacity: 0.2;
        }
        div.terrain-overlay > img {
            image-rendering: smooth;
        }
    `;
    document.head.appendChild(style);
}

window.TerrainOverlay = TerrainOverlay;
window.addTerrainStyles = addTerrainStyles;