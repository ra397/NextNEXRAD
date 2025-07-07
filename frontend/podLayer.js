class PodLayer {
  constructor(map) {
    this.map = map;

    this.podOverlay = null;
    this.di = null;
    this.currentURL = null;

    this.settings = {
      year: null,
      season: 'All',
      stops: 32,
      vmin: 0,
      vmax: 50,
      palette: 'Spectral',
      opacity: 1.0
    };
  }

  initUI() {
    // Range slider
    const podRangeSlider = document.getElementById('pod-range-slider');
    noUiSlider.create(podRangeSlider, {
      start: [this.settings.vmin, this.settings.vmax],
      connect: true,
      range: { min: 0, max: 100 },
      tooltips: [true, true],
      format: {
        to: v => Math.round(v),
        from: v => Number(v)
      }
    });

    podRangeSlider.noUiSlider.on('update', vals => {
      this.settings.vmin = +vals[0];
      this.settings.vmax = +vals[1];
    });
    podRangeSlider.noUiSlider.on('set', () => this.redrawStylingOnly());

    // Year selector
    document.getElementById('pod-year-select')
      .addEventListener('change', e => {
        const y = parseInt(e.target.value, 10);
        this.settings.year = isNaN(y) ? null : y;
        if (this.settings.year) this.fetchAndDraw();
      });

    // Season selector
    document.getElementById('pod-season-select')
      .addEventListener('change', e => {
        this.settings.season = e.target.value || 'All';
        if (this.settings.year) this.fetchAndDraw();
      });

    // Stops
    document.getElementById('pod-color-count')
      .addEventListener('change', e => {
        this.settings.stops = +e.target.value;
        this.redrawStylingOnly();
      });

    // Palette
    document.querySelectorAll('input[name="palette"]')
      .forEach(r => r.addEventListener('change', e => {
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

    // Clear button
    document.getElementById("clear-pod-layer").addEventListener('click', () => {
      this.clear();
    });
  }

  clear() {
    if (this.podOverlay) {
      this.podOverlay.remove();
      this.podOverlay = null;
    }
  }

  getSeasonDates(year, season) {
    let start, end;
    switch (season) {
      case 'Winter': start = new Date(year, 0, 1);  end = new Date(year, 2, 31); break;
      case 'Spring': start = new Date(year, 3, 1);  end = new Date(year, 5, 30); break;
      case 'Summer': start = new Date(year, 6, 1);  end = new Date(year, 8, 30); break;
      case 'Fall':   start = new Date(year, 9, 1);  end = new Date(year, 11, 31); break;
      default:       start = new Date(year, 0, 1);  end = new Date(year, 11, 31);
    }
    return { start, end };
  }

  async fetchAndDraw() {
    showSpinner(); isLoading = true;

    const { start, end } = this.getSeasonDates(this.settings.year, this.settings.season);
    const url = new POD().getUrl(start, end);

    if (url === this.currentURL && this.di) {
      isLoading = false;
      hideSpinner();
      return this.redrawStylingOnly();
    }

    this.currentURL = url;

    if (!this.di) {
      this.di = new dynaImg();
      this.di.image = new Image();
      this.di.image.crossOrigin = '';
    }

    this.applyStyling();
    const blob = await this.di.load(url);

    if (this.podOverlay) this.podOverlay.remove();
    this.podOverlay = customOverlay(blob, window.constants.pod.POD_BBOX, this.map, 'GroundOverlay');
    this.podOverlay.setOpacity(this.settings.opacity);

    isLoading = false; hideSpinner();
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
}

window.PodLayer = PodLayer;