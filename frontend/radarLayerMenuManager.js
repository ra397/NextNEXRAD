// Initialize 2-way sliders

const steps = [0.5, 0.9, 1.3, 1.8, 2.4, 3.1, 4.0, 5.1, 6.4, 8.0, 10.0, 12.5, 15.6, 19.5]
const range = { min: steps[0], max: steps[steps.length - 1] };
steps.forEach((val, i) => {
    const pct = (i / (steps.length - 1)) * 100;
    range[`${pct}%`] = val;
});

const elevationAnglesSlider = document.getElementById('elevation-angles-slider');
noUiSlider.create(elevationAnglesSlider, {
    start: [steps[0], steps[steps.length - 1]],
    connect: true,
    range: range,
    snap: true,
    tooltips: [
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) },
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) }
    ],
    format: {
        to: v=> parseFloat(v).toFixed(1),
        from: v => Number(v)
    }
});

const elevationAnglesSlider_customRadarShow = document.getElementById('arbitrary-radar-show-elevation-angles-slider');
noUiSlider.create(elevationAnglesSlider_customRadarShow, {
    start: [steps[0], steps[steps.length - 1]],
    connect: true,
    range: range,
    snap: true,
    tooltips: [
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) },
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) }
    ],
    format: {
        to: v=> parseFloat(v).toFixed(1),
        from: v => Number(v)
    }
});

const elevationAnglesSlider_existingRadarShow = document.getElementById('existing-radar-show-elevation-angles-slider');
noUiSlider.create(elevationAnglesSlider_existingRadarShow, {
    start: [steps[0], steps[steps.length - 1]],
    connect: true,
    range: range,
    snap: true,
    tooltips: [
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) },
        { to: v => `${parseFloat(v).toFixed(1)}`, from: v => Number(v) }
    ],
    format: {
        to: v=> parseFloat(v).toFixed(1),
        from: v => Number(v)
    }
});

// Radar Fields Manager - DRY solution for shared field operations
class RadarFieldsManager {
    constructor() {
        // Define field mappings for each window type
        this.fieldMappings = {
            'arbitrary-radar': {
                lat: 'radarLat',
                lng: 'radarLng',
                towerHeight: 'towerHeight-input',
                aglThreshold: 'aglThreshold-input',
                elevationSlider: 'elevation-angles-slider',
                rangeSlider: null // Not present in create window
            },
            'arbitrary-radar-show': {
                lat: 'dynamic-radar-site-lat',
                lng: 'dynamic-radar-site-lng',
                towerHeight: 'dynamic-radar-site-tower-height',
                aglThreshold: 'dynamic-radar-site-max-alt',
                elevationSlider: 'arbitrary-radar-show-elevation-angles-slider',
                rangeSlider: 'dynamic-radar-range-slider'
            },
            'existing-radar-show': {
                lat: 'existing-radar-site-lat',
                lng: 'existing-radar-site-lng',
                towerHeight: 'existing-radar-site-tower-height',
                aglThreshold: 'existing-radar-site-max-alt',
                elevationSlider: 'existing-radar-show-elevation-angles-slider',
                rangeSlider: 'existing-radar-range-slider'
            }
        };
    }

    /**
     * Get all field values for a specific window
     * @param {string} windowType - 'arbitrary-create', 'arbitrary-show', or 'existing'
     * @returns {object} Object containing all field values
     */
    getFields(windowType) {
        const mapping = this.fieldMappings[windowType];
        if (!mapping) {
            throw new Error(`Unknown window type: ${windowType}`);
        }

        const values = {};

        // Get latitude and longitude (these are spans, not inputs)
        values.lat = this.getElementValue(mapping.lat);
        values.lng = this.getElementValue(mapping.lng);

        // Get tower height
        values.tower_height_m = this.getElementValue(mapping.towerHeight);

        // Get AGL threshold
        values.agl_threshold_m = this.getElementValue(mapping.aglThreshold);

        const selectedRange = document.getElementById(this.fieldMappings[windowType].elevationSlider).noUiSlider.get();
        const minSelected = parseFloat(selectedRange[0]);
        const maxSelected = parseFloat(selectedRange[1]);

        values.elevation_angles = {
            min: minSelected,
            max: maxSelected,
        }

        if (isNaN(values.lat) || 
            isNaN(values.lng) || 
            isNaN(values.tower_height_m) || 
            isNaN(values.agl_threshold_m) ||
            isNaN(minSelected) || 
            isNaN(maxSelected)) {
            return null;
        }

        return values;
    }

    /**
     * Set field values for a specific window
     * @param {string} windowType - 'arbitrary-create', 'arbitrary-show', or 'existing'
     * @param {object} values - Object containing field values to set
     */
    setFields(windowType, values) {
        const mapping = this.fieldMappings[windowType];
        if (!mapping) {
            throw new Error(`Unknown window type: ${windowType}`);
        }

        // Set latitude and longitude
        if (values.lat !== undefined) {
            this.setElementValue(mapping.lat, values.lat);
        }
        if (values.lng !== undefined) {
            this.setElementValue(mapping.lng, values.lng);
        }

        // Set tower height
        if (values.tower_height_m !== undefined) {
            console.log(values.tower_height_m);
            this.setElementValue(mapping.towerHeight, values.tower_height_m);
        }

        // Set AGL threshold
        if (values.agl_threshold_m !== undefined) {
            console.log(values.agl_threshold_m);
            this.setElementValue(mapping.aglThreshold, values.agl_threshold_m);
        }

        // Set the Elevation Angles
        if (values.elevation_angles.min !== undefined && values.elevation_angles.max !== undefined) {
            if (windowType == "arbitrary-radar-show") {
                elevationAnglesSlider_customRadarShow.noUiSlider.set([values.elevation_angles.min, values.elevation_angles.max]);
            }
        }

        console.log(values.id);
    }

    /**
     * Copy field values from one window to another
     * @param {string} fromWindowType - Source window type
     * @param {string} toWindowType - Target window type
     * @param {array} excludeFields - Optional array of field names to exclude from copy
     */
    copyFields(fromWindowType, toWindowType, excludeFields = []) {
        const sourceValues = this.getFields(fromWindowType);
        
        // Remove excluded fields
        excludeFields.forEach(field => {
            delete sourceValues[field];
        });

        this.setFields(toWindowType, sourceValues);
    }

    /**
     * Get value from an element (handles different element types)
     * @private
     */
    getElementValue(elementId) {
        if (!elementId) return null;
        
        const element = document.getElementById(elementId);
        if (!element) return null;

        // Handle different element types
        switch (element.tagName.toLowerCase()) {
            case 'input':
                if (element.type === 'number') {
                    if (element.value === '') return NaN;
                    const parsed = parseFloat(element.value);
                    return parsed < 0 ? NaN : parsed;
                }
                return element.value;
            case 'span':
                if (element.textContent == "Latitude" || element.textContent === "Longitude") return NaN;
                return parseFloat(element.textContent);
            case 'select':
                return element.value;
            default:
                return element.textContent || element.value;
        }
    }

    /**
     * Set value for an element (handles different element types)
     * @private
     */
    setElementValue(elementId, value) {
        if (!elementId) return;
        
        const element = document.getElementById(elementId);
        if (!element) return;

        // Handle different element types
        switch (element.tagName.toLowerCase()) {
            case 'input':
                element.value = value;
                // Trigger change event for any listeners
                element.dispatchEvent(new Event('change'));
                break;
            case 'span':
                element.textContent = value;
                break;
            case 'select':
                element.value = value;
                element.dispatchEvent(new Event('change'));
                break;
            default:
                if (element.hasAttribute('contenteditable')) {
                    element.textContent = value;
                } else {
                    element.textContent = value;
                }
        }
    }

    /**
     * Validate field values
     * @param {object} values - Field values to validate
     * @returns {object} Validation result with isValid boolean and errors array
     */
    validateFields(values) {
        const errors = [];
        
        // Validate latitude
        if (values.lat !== null && values.lat !== undefined) {
            const lat = parseFloat(values.lat);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                errors.push('Latitude must be between -90 and 90');
            }
        }

        // Validate longitude
        if (values.lng !== null && values.lng !== undefined) {
            const lng = parseFloat(values.lng);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                errors.push('Longitude must be between -180 and 180');
            }
        }

        // Validate tower height
        if (values.towerHeight !== null && values.towerHeight !== undefined) {
            const height = parseFloat(values.towerHeight);
            if (isNaN(height) || height < 0) {
                errors.push('Tower height must be a positive number');
            }
        }

        // Validate AGL threshold
        if (values.aglThreshold !== null && values.aglThreshold !== undefined) {
            const threshold = parseFloat(values.aglThreshold);
            if (isNaN(threshold) || threshold < 0) {
                errors.push('AGL threshold must be a positive number');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Reset all fields in a window to default values
     * @param {string} windowType - Window type to reset
     */
    resetFields(windowType) {
        const defaultValues = {
            lat: 'Latitude',
            lng: 'Longitude', 
            towerHeight: '',
            aglThreshold: '914.4',
            rangeSlider: 0
        };
        
        this.setFields(windowType, defaultValues);
    }
}

window.RadarFieldsManager = RadarFieldsManager;

const fieldManager = new RadarFieldsManager();

// Event listeners
document.getElementById("select-location-btn").addEventListener("click", () => {
    mapLocationSelector.setOnLocationSelected((location) => {
        document.getElementById("radarLat").textContent = location.lat;
        document.getElementById("radarLng").textContent = location.lng;
    });
    mapLocationSelector.start();
});

document.getElementById("radar-submit-btn").addEventListener("click", () => {
    const params = fieldManager.getFields("arbitrary-radar");
    if (params != null) {
        radarLayer.newRadarRequest(params);
        toggleWindow("arbitrary-radar-show");
        fieldManager.setFields('arbitrary-radar-show', params);
    }
});