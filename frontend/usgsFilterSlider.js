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

usgsFilterSlider.noUiSlider.on("change", () => {
    const { min, max } = fieldManager._getRangeFromSlider("usgsFilterSlider");
    filterUSGS(min, max);
})

function filterUSGS(min_area, max_area) {
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