const steps = [0, 1, 3, 5, 15, 30, 50, 80, 115, 165, 230, 305, 395, 500, 625, 770, 935, 1120, 1330, 1565, 1825, 2115, 2430, 2780, 3160, 3570, 4015, 4495, 5015, 5570, 6165, 6805, 7485, 8210, 8975, 9795, 10655, 11570, 12535, 13550, 14620, 15740, 16920, 18160, 19455, 20815, 22230, 23715, 25260, 26870, 28550, 30300, 32115, 34005, 35965, 38000, 40110, 42300, 44565, 46910, 49335, 51845, 54435, 57115, 59875, 62725, 65665, 68695, 71820, 75035, 78345, 81750, 85255, 88855, 92555, 96360, 100265, 104275, 108390, 112615, 116945, 121385, 125935, 130600, 135380, 140270, 145280, 150410, 155655, 161020, 166510, 172120, 177860, 183720, 189715, 195830, 202080, 208465, 214975, 221625, 228410, 235330, 242390, 249590, 256930, 264410, 272040, 279810, 287730, 295795, 304010, 312380, 320900, 329570, 338400, 347380, 356525, 365825, 375285, 384905, 394690, 404640, 414755, 425040, 435490, 446110, 456905, 467870, 479010, 490325, 501815, 513485, 525335, 537365, 549575, 561970, 574555, 587320, 600275, 613420, 626755, 640280, 654000, 667915, 682025, 696335, 710840, 725545, 740455, 755565, 770880, 786400, 802130, 818065, 834210, 850565, 867135, 883920, 900915, 918130, 935565, 953215, 971085, 989180, 1007500, 1026040, 1044810, 1063805, 1083030, 1102485, 1122175, 1142095, 1162245, 1182635, 1203265, 1224130, 1245235, 1266580, 1288170, 1310005, 1332080, 1354405, 1376980, 1399800, 1422875, 1446200, 1469780, 1493615, 1517705, 1542050, 1566660, 1591525, 1616655, 1642045, 1667700, 1693625, 1719815, 1746270, 1773000, 1800000]
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