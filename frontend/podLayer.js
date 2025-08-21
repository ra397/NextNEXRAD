class PodLayer {
  constructor(map) {
    this.map = map;

    this.podOverlay = null;
    this.di = null;
    
    this.settings = {
      years: [],
      season: "All",
      stops: 32,
      vmin: 0,
      vmax: 50,
      palette: 'Spectral',
      opacity: 1.0
    };

    // Initialize POD range slider (2-way slider)
    this.podRangeSlider = document.getElementById('pod-range-slider');
    noUiSlider.create(this.podRangeSlider, {
      start: [this.settings.vmin, this.settings.vmax],
      connect: true,
      range: { min: 0, max: 100 },
      tooltips: [true, true],
      format: {
        to: v => Math.round(v),
        from: v => Number(v)
      }
    });
  }

  initUI() {
    // Exit btn
    document.getElementById("pod-settings-window-exit-btn").addEventListener("click", () => {
      document.getElementById("pod-settings-window-exit-btn").parentElement.parentElement.style.display = 'none';
    })

    // FETCH AND REDRAW
    // Years selection listener, updates this.settings.years live
    document.getElementById("pod-year-select").addEventListener("change", () => {
      this.settings.years = this.getSelectedYears();
      this.updateSelectedYearsDisplay();
    });

    // Sesaon selection listener, updates this.settings.season live
    document.getElementById("pod-season-select").addEventListener("change", (event) => {
      this.settings.season = event.target.value || "All";
    });

    // Submit btn
    document.getElementById("submit-pod-layer").addEventListener("click", () => {
      this.fetchAndDraw(this.getSeasonDates(this.settings.years, this.settings.season));
    });

    // Clear btn
    document.getElementById("clear-pod-layer").addEventListener("click", () => {
      if (this.podOverlay) {
        this.podOverlay.remove();
        this.podOverlay = null;
      }
    })

    // REDRAW STYLING ONLY
    // Number of colors listener, updates this.settings.stops live
    document.getElementById("pod-color-count").addEventListener("change", (event) => {
      this.settings.stops = parseInt(event.target.value);
      this.redrawStylingOnly();
    });

    // Min-Max listener, updates this.settings.vmin and this.settings.vmax live
    this.podRangeSlider.noUiSlider.on('update', vals => {
      this.settings.vmin = +vals[0];
      this.settings.vmax = +vals[1];
    });
    this.podRangeSlider.noUiSlider.on('set', () => {
      this.redrawStylingOnly();
    });

    // Color Palette 
    document.querySelectorAll('input[name="palette"]').forEach(r => r.addEventListener('change', e => {
      this.settings.palette = e.target.value.replace('-', '');
      this.redrawStylingOnly();
    }));

    // Opacity
    const opacitySlider = document.getElementById('pod-opacity');
    const opacityLabel = document.getElementById('pod-opacity-value');
    opacitySlider.addEventListener('input', e => {
      const pct = +e.target.value;
      opacityLabel.textContent = `${pct}%`;
      this.settings.opacity = pct / 100;
      if (this.podOverlay) this.podOverlay.setOpacity(this.settings.opacity);
    });
  }

  getSelectedYears() {
    const selectElement = document.getElementById('pod-year-select');
    return [...selectElement.selectedOptions].map(option => option.value);
  }

  updateSelectedYearsDisplay() {
    const yearTags = this.settings.years.map(year => 
        `<span class="year-tag" data-year="${year}">${year} <span class="year-tag-close">×</span></span>`
    ).join('');
    document.getElementById("selected-years-display").innerHTML = `<div class="year-tags">${yearTags}</div>`;
    
    // Add click event listeners to the close buttons
    document.querySelectorAll('.year-tag-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent event bubbling
        const yearTag = event.target.parentElement;
        const yearToRemove = yearTag.dataset.year;
        this.removeYear(yearToRemove);
      });
    });
  }

  removeYear(yearToRemove) {
    // Remove from settings
    this.settings.years = this.settings.years.filter(year => year !== yearToRemove);
    
    // Update the select element to reflect the change
    const selectElement = document.getElementById('pod-year-select');
    const optionToDeselect = selectElement.querySelector(`option[value="${yearToRemove}"]`);
    if (optionToDeselect) {
      optionToDeselect.selected = false;
    }
    
    // Update the display
    this.updateSelectedYearsDisplay();
  }

  getSeasonDates(years, season) {
      const output = [];
      
      // Define season mappings
      const seasonRanges = {
          "All": { begin: "010101", end: "123123" },
          "Winter": { begin: "010101", end: "033123" },
          "Spring": { begin: "040101", end: "063023" },
          "Summer": { begin: "070101", end: "093023" },
          "Fall": { begin: "100101", end: "123123" }
      };
      
      // Check if season is valid
      if (!seasonRanges[season]) {
          throw new Error(`Invalid season: ${season}. Must be one of: All, Winter, Spring, Summer, Fall`);
      }
      
      // Process each year
      for (const year of years) {
          const range = seasonRanges[season];
          
          output.push({
              "begin": `${year}${range.begin}`,
              "end": `${year}${range.end}`
          });
      }
      
      return output;
  }

  async fetchAndDraw(dateRanges) {
    showSpinner();

    const url = "https://s-iihr80.iihr.uiowa.edu/hyddatapp";
    const payload = {
      "product": "pod",
      "method": "aggregate",
      "datetime": dateRanges
    };

    console.log("Sending request to POD server: ", payload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });    
    const arrayBuffer = await response.arrayBuffer();
    if (!this.di) {
      this.di = new dynaImg();
      this.di.image = new Image();
      this.di.image.crossOrigin = '';
    }
    this.applyStyling();
    const blob = await this.di.loadFromArrayBuffer(arrayBuffer);

    if (this.podOverlay) this.podOverlay.remove();
    this.podOverlay = customOverlay(blob, window.constants.pod.POD_BBOX, this.map, 'OverlayView');
    this.podOverlay.setOpacity(this.settings.opacity);

    hideSpinner();
  }

  async redrawStylingOnly() {
    if (!this.di) return;
    this.applyStyling();
    const blob = await this.di.redraw();
    if (this.podOverlay) this.podOverlay.setSource(blob);
  }

  applyStyling() {
    this.di.setStops(this.settings.stops);
    this.di.setRange(this.settings.vmin / 100, this.settings.vmax / 100);
    this.di.setColors(this.settings.palette, window.constants.pod.POD_COLORS[this.settings.palette]);
  }
};

window.PodLayer = PodLayer;