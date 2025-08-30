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

        return values;
    }

    /**
     * Set field values for a specific window
     * @param {string} windowType - 'arbitrary-create', 'arbitrary-show', or 'existing'
     * @param {object} values - Object containing field values to set
     */
    setFields(windowType, values, id) {
        if (windowType == "arbitrary-radar-show") {
            document.getElementById("dynamic-radar-site-id").textContent = id;
        }

        const params = values;

        console.log(params);

        const mapping = this.fieldMappings[windowType];
        if (!mapping) {
            throw new Error(`Unknown window type: ${windowType}`);
        }

        // Set latitude and longitude
        if (params.lat !== undefined) {
            this.setElementValue(mapping.lat, params.lat);
        }
        if (params.lng !== undefined) {
            this.setElementValue(mapping.lng, params.lng);
        }

        // Set tower height
        if (params.tower_height_m !== undefined) {
            this.setElementValue(mapping.towerHeight, params.tower_height_m);
        }

        // Set AGL threshold
        if (params.agl_threshold_m !== undefined) {
            this.setElementValue(mapping.aglThreshold, params.agl_threshold_m);
        }

        // Set the Elevation Angles
        if (params.elevation_angles.min !== undefined && params.elevation_angles.max !== undefined) {
            if (windowType == "arbitrary-radar-show") {
                elevationAnglesSlider_customRadarShow.noUiSlider.set([params.elevation_angles.min, params.elevation_angles.max]);
            } else if (windowType == "arbitrary-radar") {
                elevationAnglesSlider.noUiSlider.set([params.elevation_angles.min, params.elevation_angles.max]);
            }
        }
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
        if (values.tower_height_m !== null && values.tower_height_m !== undefined) {
            const height = parseFloat(values.tower_height_m);
            if (isNaN(height) || height <= 0) {
                console.log("NEW ERROR")
                errors.push('Tower height must be a positive number');
            }
        }

        // Validate AGL threshold
        if (values.agl_threshold_m !== null && values.agl_threshold_m !== undefined) {
            const threshold = parseFloat(values.agl_threshold_m);
            if (isNaN(threshold) || threshold <= 0) {
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
        console.log("here");
        const defaultValues = {
            lat: 'Latitude',
            lng: 'Longitude', 
            tower_height_m: '',
            agl_threshold_m: '',
            elevation_angles: {
                min: 0.5,
                max: 19.5
            }
        };
        
        this.setFields(windowType, defaultValues);
    }
}

window.RadarFieldsManager = RadarFieldsManager;