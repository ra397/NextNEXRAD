class RadarFieldsManager {
  constructor() {
    this.fieldMappings = {
      'arbitrary-radar': {
        lat: 'radarLat',
        lng: 'radarLng',
        towerHeight: 'towerHeight-input',
        aglThreshold: 'aglThreshold-input',
        elevationSlider: 'elevation-angles-slider',
      },
      'arbitrary-radar-show': {
        lat: 'dynamic-radar-site-lat',
        lng: 'dynamic-radar-site-lng',
        towerHeight: 'dynamic-radar-site-tower-height',
        aglThreshold: 'dynamic-radar-site-max-alt',
        elevationSlider: 'arbitrary-radar-show-elevation-angles-slider',
        extra: { id: 'dynamic-radar-site-id' }
      },
      'existing-radar-show': {
        lat: 'existing-radar-site-lat',
        lng: 'existing-radar-site-lng',
        towerHeight: 'existing-radar-site-tower-height',
        aglThreshold: 'existing-radar-site-max-alt',
        elevationSlider: 'existing-radar-show-elevation-angles-slider',
        extra: { id: 'existing-radar-site-id', name: 'existing-radar-site-name' }
      }
    };
  }

  /** @private */
  _getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`[RadarFieldsManager] Missing element #${id}`);
    return el;
  }

  /**
   * Read fields from the DOM for a given window type.
   * @param {"arbitrary-radar"|"arbitrary-radar-show"|"existing-radar-show"} windowType
   * @returns {{params: {lat:number, lng:number, tower_height_m:number, agl_threshold_m:number, elevation_angles:{min:number,max:number}}}}
   */
  getFields(windowType) {
    const map = this.fieldMappings[windowType];
    if (!map) {
      console.warn(`[RadarFieldsManager] Unknown windowType: ${windowType}`);
      return { params: this._emptyParams() };
    }

    const lat = this._getNumberFromSpan(map.lat);
    const lng = this._getNumberFromSpan(map.lng);
    let tower = this._getNumberFromInput(map.towerHeight);
    let agl = this._getNumberFromInput(map.aglThreshold);
    const { min, max } = this._getRangeFromSlider(map.elevationSlider);

    
    // Convert to meters if UI is imperial
    if (window.units === 'imperial') {
      tower = ft2m(tower);
      agl   = ft2m(agl);
    }

    return {
      lat,
      lng,
      tower_height_m: tower,
      agl_threshold_m: agl,
      elevation_angles: { min, max }
    };
  }

  /**
   * Set fields in the DOM for a given window type.
   * Extras:
   *  - arbitrary-radar-show: sets dynamic-radar-site-id (from values.id)
   *  - existing-radar-show: sets existing-radar-site-id (from values.id) and existing-radar-site-name (from values.name if present)
   * @param {"arbitrary-radar"|"arbitrary-radar-show"|"existing-radar-show"} windowType
   * @param {{id?:string|number|null, name?:string, params:{lat:number,lng:number,tower_height_m:number,agl_threshold_m:number,elevation_angles:{min:number,max:number}}, overlay?:any}} values
   */
  setFields(windowType, values) {
    const map = this.fieldMappings[windowType];
    if (!map || !values || !values.params) return;

    const { lat, lng, tower_height_m, agl_threshold_m, elevation_angles } = values.params;

    // Lat/Lng spans (format to 4 decimals)
    this._setSpanText(map.lat, this._fmt4(lat));
    this._setSpanText(map.lng, this._fmt4(lng));

    // Convert for display only if UI is imperial
    let towerDisplay = (window.units === 'imperial') ? m2ft(tower_height_m) : tower_height_m;
    let aglDisplay   = (window.units === 'imperial') ? m2ft(agl_threshold_m) : agl_threshold_m;

    towerDisplay = this._roundWhole(towerDisplay);
    aglDisplay = this._roundWhole(aglDisplay);

    // Number inputs
    this._setInputValue(map.towerHeight, this._numOrEmpty(towerDisplay));
    this._setInputValue(map.aglThreshold, this._numOrEmpty(aglDisplay));

    // Two-way slider
    this._setRangeOnSlider(map.elevationSlider, elevation_angles?.min, elevation_angles?.max);

    // Extras
    if (map.extra?.id && values.id != null) {
      this._setSpanText(map.extra.id, String(values.id));
    }
    if (map.extra?.name && values.name != null) {
      this._setSpanText(map.extra.name, String(values.name));
    }
  }

  /**
   * Validate values (either the whole object or just params).
   * @param {{params?: any} | {lat:number, lng:number, tower_height_m:number, agl_threshold_m:number, elevation_angles:{min:number,max:number}}} values
   * @returns {{ok:boolean, errors:string[]}}
   */
  validateFields(values) {
    const p = values?.params ?? values;
    const errors = [];

    // Required presence
    if (!_isNum(p?.lat)) errors.push('Latitude is required and must be a number.');
    if (!_isNum(p?.lng)) errors.push('Longitude is required and must be a number.');
    if (!_isNum(p?.tower_height_m)) errors.push('Tower height (m) is required and must be a number.');
    if (!_isNum(p?.agl_threshold_m)) errors.push('AGL threshold (m) is required and must be a number.');
    if (!_isNum(p?.elevation_angles?.min)) errors.push('Elevation min is required and must be a number.');
    if (!_isNum(p?.elevation_angles?.max)) errors.push('Elevation max is required and must be a number.');

    // Stop here if requireds are missing
    if (errors.length) return { ok: false, errors };

    // Ranges
    if (p.lat < -90 || p.lat > 90) errors.push('Latitude must be between -90 and 90.');
    if (p.lng < -180 || p.lng > 180) errors.push('Longitude must be between -180 and 180.');
    if (!(p.tower_height_m > 0)) errors.push('Tower height (m) must be > 0.');
    if (!(p.agl_threshold_m > 0)) errors.push('AGL threshold (m) must be > 0.');

    // Elevation angles
    const emin = p.elevation_angles.min;
    const emax = p.elevation_angles.max;
    if (emin < 0 || emax < 0) errors.push('Elevation angles must be ≥ 0.');
    if (emin > emax) errors.push('Elevation min must be ≤ max.');

    return { ok: errors.length === 0, errors };
  }

  /**
   * Reset the specific window’s DOM:
   * - Lat/Lng → placeholders
   * - Tower/AGL inputs → empty
   * - Elevation slider → [0, 19.5]
   * @param {"arbitrary-radar"|"arbitrary-radar-show"|"existing-radar-show"} windowType
   */
  resetFields(windowType) {
    const map = this.fieldMappings[windowType];
    if (!map) return;

    // Placeholders for lat/lng
    this._setSpanText(map.lat, 'Latitude');
    this._setSpanText(map.lng, 'Longitude');

    // Clear inputs
    this._setInputValue(map.towerHeight, '');
    this._setInputValue(map.aglThreshold, '');

    // Reset slider to default [0, 19.5]
    this._setRangeOnSlider(map.elevationSlider, 0, 19.5);

    // (We intentionally do not touch unrelated controls like range-ring sliders)
  }

  // ---------- Private helpers (DOM reads) ----------

  /** @private */
  _getNumberFromSpan(id) {
    const el = this._getEl(id);
    if (!el) return null;
    const raw = (el.textContent || '').trim();
    const num = parseFloat(raw);
    return isNaN(num) ? null : num;
  }

  /** @private */
  _getNumberFromInput(id) {
    const el = this._getEl(id);
    if (!el) return null;
    const v = (el.value ?? '').toString().trim();
    if (v === '') return null;
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
  }

  /** @private */
  _getRangeFromSlider(id) {
    const el = this._getEl(id);
    if (!el) return { min: null, max: null };
    if (el.noUiSlider && typeof el.noUiSlider.get === 'function') {
      const arr = el.noUiSlider.get(); // usually ["x","y"]
      const a = Array.isArray(arr) ? arr : [arr, arr];
      const min = parseFloat(a[0]);
      const max = parseFloat(a[1]);
      return {
        min: isNaN(min) ? null : min,
        max: isNaN(max) ? null : max
      };
    }
    // Fallback: datasets if slider not initialized yet
    const dmin = parseFloat(el.dataset.min);
    const dmax = parseFloat(el.dataset.max);
    return {
      min: isNaN(dmin) ? null : dmin,
      max: isNaN(dmax) ? null : dmax
    };
  }

  // ---------- Private helpers (DOM writes) ----------

  /** @private */
  _setSpanText(id, text) {
    const el = this._getEl(id);
    if (!el) return;
    el.textContent = text ?? '';
  }

  /** @private */
  _setInputValue(id, value) {
    const el = this._getEl(id);
    if (!el) return;
    el.value = value ?? '';
  }

  /** @private */
  _setRangeOnSlider(id, min, max) {
    const el = this._getEl(id);
    if (!el) return;
    if (_isNum(min) && _isNum(max) && el.noUiSlider && typeof el.noUiSlider.set === 'function') {
      // Your pattern:
      // element.noUiSlider.set([min, max])
      el.noUiSlider.set([min, max]);
    } else {
      // Fallback if not initialized yet
      if (_isNum(min)) el.dataset.min = String(min);
      if (_isNum(max)) el.dataset.max = String(max);
    }
  }

  // ---------- Private helpers (format) ----------

  /** @private */
  _fmt4(n) {
    return _isNum(n) ? Number(n).toFixed(4) : '';
  }

  /** @private */
  _numOrEmpty(n) {
    return _isNum(n) ? String(n) : '';
  }

  /** @private */
  _emptyParams() {
    return {
      lat: null,
      lng: null,
      tower_height_m: null,
      agl_threshold_m: null,
      elevation_angles: { min: null, max: null }
    };
  }

  _roundWhole(n) {
    return _isNum(n) ? Math.round(n) : n; // keep null/undefined as-is
  }
}

/** @private */
function _isNum(v) {
  return typeof v === 'number' && !isNaN(v);
}

window.RadarFieldsManager = RadarFieldsManager;