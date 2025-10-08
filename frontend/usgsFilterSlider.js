const steps = [
  100, 105, 111, 117, 123, 129, 136, 143, 150, 157,
  165, 173, 182, 191, 200, 210, 220, 230, 241, 253,
  265, 278, 291, 305, 319, 334, 349, 365, 381, 398,
  415, 433, 452, 471, 491, 512, 533, 555, 578, 601,
  625, 650, 675, 701, 728, 755, 783, 812, 841, 871,
  902, 934, 967, 1000, 1034, 1069, 1105, 1141, 1179, 1217,
  1256, 1296, 1337, 1379, 1422, 1466, 1511, 1556, 1603, 1650,
  1699, 1748, 1798, 1849, 1901, 1954, 2008, 2063, 2119, 2176,
  2234, 2293, 2353, 2414, 2476, 2539, 2603, 2668, 2734, 2801,
  2869, 2938, 3008, 3079, 3151, 3224, 3298, 3373, 3449, 3526,
  3604, 3683, 3763, 3844, 3926, 4009, 4093, 4178, 4264, 4351,
  4439, 4528, 4618, 4709, 4801, 4894, 4988, 5083, 5179, 5276,
  5374, 5473, 5573, 5674, 5776, 5879, 5983, 6088, 6194, 6301,
  6409, 6518, 6628, 6739, 6851, 6964, 7078, 7193, 7309, 7426,
  7544, 7663, 7783, 7904, 8026, 8149, 8273, 8398, 8524, 8651,
  8779, 8908, 9038, 9169, 9301, 9434, 9568, 9703, 9839, 9976,
  10114, 10253, 10393, 10534, 10676, 10819, 10963, 11108, 11254, 11401,
  11549, 11698, 11848, 11999, 12151, 12304, 12458, 12613, 12769, 12926,
  13084, 13243, 13403, 13564, 13726, 13889, 14053, 14218, 14384, 14551,
  14719, 14888, 15058, 15229, 15401, 15574, 15748, 15923, 16099, 16276,
  16454, 16633, 16813, 16994, 17176, 17359, 17543, 17728, 17914, 18101,
  18289, 18478, 18668, 18859, 19051, 19244, 19438, 19633, 19829, 20026,
  20224, 20423, 20623, 20824, 21026, 21229, 21433, 21638, 21844, 22051,
  22259, 22468, 22678, 22889, 23101, 23314, 23528, 23743, 23959, 24176,
  24394, 24613, 24833, 25054, 25276, 25499, 25723, 25948, 26174, 26401,
  26629, 26858, 27088, 27319, 27551, 27784, 28018, 28253, 28489, 28726,
  28964, 29203, 29443, 29684, 29926, 3000000
];
const range = { min: steps[0], max: steps[steps.length - 1] };
steps.forEach((val, i) => {
    const pct = (i / (steps.length - 1)) * 100;
    range[`${pct}`] = val;
})

const usgsFilterSlider = document.getElementById("usgsFilterSlider");
noUiSlider.create(usgsFilterSlider, {
    start: [steps[0], steps[steps.length - 1]],
    connect: true,
    range: range,
    snap: true,
    tooltips: [
        { to: v => `${parseInt(v)}`, from: v => Number(v) },
        { to: v => `${parseInt(v)}`, from: v => Number(v) }
    ],
    format: {
        to: v=> parseInt(v),
        from: v => Number(v)
    }
})

mergeTooltips(usgsFilterSlider, 30, '-');

usgsFilterSlider.noUiSlider.on("change", () => {
    const { min, max } = fieldManager._getRangeFromSlider("usgsFilterSlider");
    filterUSGS(min, max);
    usgsLayer.min_area = min;
    usgsLayer.max_area = max;
})

function filterUSGS(min_area, max_area) {
    if (!document.getElementById("usgsSites-checkbox").checked) return;
    for (let i = 0; i < usgsLayer.usgsSitesMarkers.markers.length; i ++) {
        const marker =  usgsLayer.usgsSitesMarkers.markers[i];
        const area = usgsLayer.usgsSitesMarkers.markers[i].properties.drainage_area;
        if (area < min_area || area > max_area) {
            marker.setMap(null);
        } else {
            marker.setMap(window.map);
        }
    }
}

document.addEventListener("units_changed", () => {
    const isImperial = window.units === 'imperial';

    const label = document.getElementById("usgsFilterLabel");

    isImperial ? label.innerHTML = "USGS Filter (mi<sup>2</sup>)" : label.innerHTML = "USGS Filter (km<sup>2</sup>)";

    usgsFilterSlider.noUiSlider.updateOptions({
        tooltips: [
            {
                to: v => isImperial ? `${km2ToMi2(v).toFixed(0)}`: `${parseFloat(v).toFixed(0)}`,
                from: v => parseFloat(v)
            },
            {
                to: v => isImperial ? `${km2ToMi2(v).toFixed(0)}` : `${parseFloat(v).toFixed(0)}`,
                from: v => parseFloat(v)
            }
        ]
    }, true);

    mergeTooltips(usgsFilterSlider, 30, '-');
});

function mergeTooltips(slider, threshold, separator) {

    var textIsRtl = getComputedStyle(slider).direction === 'rtl';
    var isRtl = slider.noUiSlider.options.direction === 'rtl';
    var isVertical = slider.noUiSlider.options.orientation === 'vertical';

    if (slider._mergeFunction) {
        slider.noUiSlider.off('update', slider._mergeFunction);
    }

    slider._mergeFunction = function (values, handle, unencoded, tap, positions) {
        var tooltips = slider.noUiSlider.getTooltips();
        var origins = slider.noUiSlider.getOrigins();
        var options = slider.noUiSlider.options;

        var pools = [[]];
        var poolPositions = [[]];
        var poolValues = [[]];
        var atPool = 0;

        if (tooltips[0]) {
            pools[0][0] = 0;
            poolPositions[0][0] = positions[0];
            poolValues[0][0] = options.tooltips[0].to(unencoded[0]);
        }

        for (var i = 1; i < positions.length; i++) {
            if (!tooltips[i] || (positions[i] - positions[i - 1]) > threshold) {
                atPool++;
                pools[atPool] = [];
                poolValues[atPool] = [];
                poolPositions[atPool] = [];
            }

            if (tooltips[i]) {
                pools[atPool].push(i);
                poolValues[atPool].push(options.tooltips[i].to(unencoded[i]));
                poolPositions[atPool].push(positions[i]);
            }
        }

        pools.forEach(function (pool, poolIndex) {
            var handlesInPool = pool.length;

            for (var j = 0; j < handlesInPool; j++) {
                var handleNumber = pool[j];

                if (j === handlesInPool - 1) {
                    var direction = isVertical ? 'bottom' : 'right';
                    
                    // Only merge and reposition if there are multiple handles in this pool
                    if (handlesInPool > 1) {
                        // Calculate average position of merged handles
                        var avgPosition = 0;
                        poolPositions[poolIndex].forEach(function (value) {
                            avgPosition += value;
                        });
                        avgPosition = avgPosition / handlesInPool;
                        
                        // Calculate offset from the rightmost handle's position to the average position
                        var rightmostPosition = poolPositions[poolIndex][poolPositions[poolIndex].length - 1];
                        var offsetPixels = ((rightmostPosition - avgPosition) / 1000) * slider.offsetWidth;
                        
                        tooltips[handleNumber].innerHTML = poolValues[poolIndex].join(separator);
                        tooltips[handleNumber].style.display = 'block';
                        
                        tooltips[handleNumber].style.left = '-3px';
                        tooltips[handleNumber].style.bottom = '120%';
                    } else {
                        // Not merged, restore default CSS styling
                        tooltips[handleNumber].innerHTML = poolValues[poolIndex][0];
                        tooltips[handleNumber].style.display = 'block';
                        tooltips[handleNumber].style.transform = '';
                        tooltips[handleNumber].style.left = '';
                        tooltips[handleNumber].style.bottom = '';
                    }
                } else {
                    tooltips[handleNumber].style.display = 'none';
                }
            }
        });
    };
    slider.noUiSlider.on('update', slider._mergeFunction);
}