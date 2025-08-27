class PodLegend {
    width = 400;
    height = 25;
    
    colors = [];
    stops = 0;
    
    offCanvas = new OffscreenCanvas(0, 0);
    clampedArray = [];
    imageData = null;
    blobUrl = null;
    image = null;
    
    constructor(width = 400, height = 25) {
        this.setSize(width, height);
    }
    
    setSize(w, h) {
        this.width = w;
        this.height = h;
        
        this.offCanvas.width = this.width;
        this.offCanvas.height = this.height;
        this.clampedArray = new Uint8ClampedArray(4 * this.width * this.height);
        this.imageData = new ImageData(this.clampedArray, this.width, this.height);
    }
    
    // Method to receive colors from dynaImg
    setColors(colorArray) {
        this.colors = colorArray.slice(); // Make a copy
        this.stops = colorArray.length - 1; // Subtract 1 for transparent color at index 0
    }
    
    // Alternative method to receive colors directly from dynaImg instance
    setColorsFromDynaImg(dynaImgInstance) {
        if (dynaImgInstance.clrs && dynaImgInstance.clrs.length > 0) {
            this.setColors(dynaImgInstance.clrs);
        } else {
            console.warn('PodLegend: dynaImg instance has no colors');
        }
    }
    
    async draw() {
        if (this.colors.length === 0) {
            console.warn('PodLegend: No colors to draw');
            return null;
        }
        
        // Calculate how many pixels per color stop
        const pixelsPerStop = this.width / this.stops;
        
        // Fill the canvas
        for (let x = 0; x < this.width; x++) {
            // Determine which color stop this pixel belongs to
            let colorIndex = Math.floor(x / pixelsPerStop) + 1; // +1 to skip transparent color at index 0
            
            // Clamp to valid range
            colorIndex = Math.min(colorIndex, this.colors.length - 1);
            colorIndex = Math.max(colorIndex, 1); // Don't use index 0 (transparent)
            
            const color = this.colors[colorIndex];
            
            // Fill entire vertical column with this color
            for (let y = 0; y < this.height; y++) {
                const pixelIndex = (y * this.width + x) * 4;
                
                this.clampedArray[pixelIndex] = color[0];     // R
                this.clampedArray[pixelIndex + 1] = color[1]; // G
                this.clampedArray[pixelIndex + 2] = color[2]; // B
                this.clampedArray[pixelIndex + 3] = color[3]; // A
            }
        }
        
        // Render to canvas and create blob
        this.offCanvas.getContext('2d').putImageData(this.imageData, 0, 0);
        const blob = await this.offCanvas.convertToBlob();
        
        // Clean up previous blob URL
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
        }
        
        this.blobUrl = URL.createObjectURL(blob);
        
        // Update image if it exists
        if (this.image !== null) {
            this.image.src = this.blobUrl;
        }
        
        return this.blobUrl;
    }
    
    // Create and return an HTML img element
    createImageElement() {
        this.image = new Image();
        this.image.width = this.width;
        this.image.height = this.height;
        
        if (this.blobUrl) {
            this.image.src = this.blobUrl;
        }
        
        return this.image;
    }
    
    // Clean up resources
    destroy() {
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
            this.blobUrl = null;
        }

        const container = document.getElementById("pod-legend-container");
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Hide the entire legend window when legend is cleared
        const legendWindow = document.getElementById("pod-legend-window");
        if (legendWindow) {
            legendWindow.style.display = 'none';
        }
    }

    calculateTickValues(stops, vmin, vmax) {
        // Determine number of ticks based on stops (max 5 ticks)
        const numTicks = Math.min(stops, 5);
        
        // Always need at least 2 ticks (min and max)
        const actualTicks = Math.max(numTicks, 2);
        
        const tickValues = [];
        
        if (actualTicks === 1) {
            // Edge case: just return the middle value
            const value = (vmin + vmax) / 2;
            tickValues.push(parseFloat(value.toFixed(2)));
        } else {
            // Calculate step size between ticks
            const step = (vmax - vmin) / (actualTicks - 1);
            
            // Generate evenly spaced values
            for (let i = 0; i < actualTicks; i++) {
                const value = vmin + (step * i);
                tickValues.push(parseFloat(value.toFixed(2)));
            }
        }
        return tickValues;
    }

    renderTickLabels(tickValues) {
        const labelContainer = document.getElementById('pod-legend-label-container');
        if (!labelContainer) {
            console.warn('Legend label container not found');
            return;
        }
        // Clear existing tick labels
        labelContainer.innerHTML = '';
        // Create and position each tick label
        tickValues.forEach((value, index) => {
            const tickLabel = document.createElement('span');
            tickLabel.className = 'pod-legend-tick';
            tickLabel.textContent = value.toString();            
            labelContainer.appendChild(tickLabel);
        });
    }
}