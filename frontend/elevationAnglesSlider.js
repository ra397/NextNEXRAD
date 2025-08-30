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