// Global settings variables

window.overlay_color = "green";

document.addEventListener('DOMContentLoaded', function() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Get the color value
            const selectedColor = this.getAttribute('data-color');
            window.overlay_color = selectedColor;

            // Reload tiles with the new color if a threshold is selected (not "hide")
            const currentThreshold = coveragesLayer.getSelectedThreshold();
            if (currentThreshold !== "hide") {
                coveragesLayer.loadAndShowSelectedCoverage();
            }

            // Also reload fixed distance tiles if a threshold is selected (not "none")
            const currentFixedDistanceThreshold = fixedDistanceCoveragesLayer.getSelectedThreshold();
            if (currentFixedDistanceThreshold !== "none") {
                fixedDistanceCoveragesLayer.loadAndShowSelectedCoverage();
            }

            triggerReportGeneration(); // Need to redraw report with the new colors
        });
    });
    
    // Set default selection (green)
    document.querySelector('.color-option[data-color="green"]').classList.add('selected');
});

window.units = "metric";
document.addEventListener('DOMContentLoaded', function() {
    const unitOptions = document.querySelectorAll(".unit-option");

    unitOptions.forEach(option => {
        option.addEventListener('click', function() {
            unitOptions.forEach(opt => opt.classList.remove('selected'));

            this.classList.add('selected');

            const selectedUnit = this.getAttribute('data-unit');
            window.units = selectedUnit;
            updateUnitLabels();

            radarLayer.rangeRings.setUnit(window.units);
            relabelAllRangeSliders(window.units);
        })
    });

    document.querySelector('.unit-option[data-unit="metric"]').classList.add('selected');
});

function setLabelFor(inputId, metricText, imperialText){
  const input = document.getElementById(inputId);
  if(!input) return;
  const label = input.closest('.settings-input')?.previousElementSibling;
  if(label) label.textContent = (window.units === 'metric') ? metricText : imperialText;
}

function updateUnitLabels(){
  setLabelFor('threshold-range-slider',              'AGL Threshold (m):', 'AGL Threshold (ft):');
  setLabelFor('fixed-distance-range-slider',         'Distnace (km):', 'Distance (mi):');
  setLabelFor('towerHeight-input',                   'Tower Height (m):',  'Tower Height (ft):');
  setLabelFor('aglThreshold-input',                  'AGL Threshold (m):', 'AGL Threshold (ft):');
  setLabelFor('dynamic-radar-site-tower-height',     'Tower Height (m):',  'Tower Height (ft):');
  setLabelFor('dynamic-radar-site-max-alt',          'AGL Threshold (m):', 'AGL Threshold (ft):');
  setLabelFor('existing-radar-site-tower-height',    'Tower Height (m):',  'Tower Height (ft):');
  setLabelFor('existing-radar-site-max-alt',         'AGL Threshold (m):', 'AGL Threshold (ft):');

  updateTickLabels();
  updateFixedDistanceTickLabels();
  updatePopulationLabel();
  updateBasinStatsWindowUnits();
}

function updateTickLabels(){
  const wrap = document.querySelector('.tick-labels');
  if (!wrap) return;
  const spans = wrap.querySelectorAll('span');
  const metric   = ['None', '1,000', '2,000', '3,000'];
  const imperial = ['None', '3,000', '6,000', '10,000'];
  const labels = (window.units === 'metric') ? metric : imperial;
  spans.forEach((el, i) => { if (labels[i]) el.textContent = labels[i]; });
}

function updateFixedDistanceTickLabels(){
  const wrap = document.getElementById('fixed-distance-tick-labels');
  if (!wrap) return;
  const spans = wrap.querySelectorAll('span');
  const metric   = ['None', '100', '150', '230'];
  const imperial = ['None', '60', '90', '140'];
  const labels = (window.units === 'metric') ? metric : imperial;
  spans.forEach((el, i) => { if (labels[i]) el.textContent = labels[i]; });
}

function updatePopulationLabel() {
  const el = document.getElementById('popThreshold-value');
  if (!el) return;

  // keep the current people count (formatted) from the label
  const m = (el.textContent || '').match(/^\s*([\d,.]+)/);
  const countNum = m ? Number(m[1].replace(/,/g, '')) : 0;
  const peopleText = isNaN(countNum) ? '0' : countNum.toLocaleString();

  if (window.units === 'metric') {
    el.textContent = `${peopleText} people / 25 km²`;
  } else {
    const mi2 = 25 * 0.386102; // km² → mi²
    el.textContent = `${peopleText} people / ${mi2.toFixed(2)} mi²`;
  }
}

// UI config only (text/ticks shown to the user)
const RANGE_UI = {
  metric: { labels: ['None', '50', '100', '150', '200', '230'], suffix: 'km' },
  imperial: { labels: ['None', '50', '100', '150'], suffix: 'mi' }
};

/**
 * Update one slider's ticks + title "(km)/(mi)" and clamp its value to the new max.
 * Assumes the markup:
 *   <span class="settings-label">Range Rings (km)</span>
 *   <div class="settings-input">
 *     <input type="range" ...>
 *     <div class="range-slider-labels"> ... </div>
 *   </div>
 */
function relabelRangeSlider(sliderId, unit) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;

  const cfg = RANGE_UI[unit];
  const labelsDiv = slider.parentElement.querySelector('.range-slider-labels');

  // Update the title next to this slider
  const title = slider.parentElement.previousElementSibling;
  if (title && title.classList.contains('settings-label')) {
    title.textContent = `Range Rings (${cfg.suffix})`;
  }

  // Update slider max and clamp current value if needed
  const newMax = cfg.labels.length - 1;
  slider.max = newMax;
  const cur = parseInt(slider.value, 10) || 0;
  if (cur > newMax) slider.value = newMax;

  // Rebuild tick labels
  if (labelsDiv) {
    labelsDiv.innerHTML = cfg.labels.map(txt => `<span>${txt}</span>`).join('');
  }
}

/**
 * Convenience: update multiple sliders for the chosen unit.
 */
function relabelAllRangeSliders(unit) {
  [
    'dynamic-radar-range-slider',
    'existing-radar-range-slider'
  ].forEach(id => relabelRangeSlider(id, unit));
}

function updateBasinStatsWindowUnits() {
  if (currentlySelectedUsgsBasin === null || coverage === null) return;
  const area_km_2 = usgs_sites[currentlySelectedUsgsBasin].area_km2.toFixed(0);
  const area_mi_2 = km2ToMi2(area_km_2).toFixed(0);
  if (units === "metric") {
    document.getElementById("area-heading").innerHTML = `Area: ${area_km_2} km<sup>2</sup>`;
  } else {
    document.getElementById("area-heading").innerHTML = `Area: ${area_mi_2} mi<sup>2</sup>`;
  }
  const useMetric = units === "metric";
  document.querySelectorAll("#area-legend .area-value").forEach(el => {
    el.innerHTML = useMetric ? el.dataset.metric : el.dataset.imperial;
  });
}