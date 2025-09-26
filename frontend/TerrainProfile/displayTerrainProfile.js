const canvas = document.getElementById("terrainProfileCanvas");
const ctx = canvas.getContext('2d');

// Make container containing canvas graph draggable
const canvasContainer = document.getElementById("terrainProfileCanvasContainer");
if (!canvasContainer?._dragger) {
    canvasContainer._dragger = new DragContainer(canvasContainer, ['drag-cnr tl-cnr', 'drag-cnr tr-cnr', 'drag-cnr bl-cnr', 'drag-cnr br-cnr']);
}

const width = canvas.width;
const height = canvas.height;

const margin = { left: 50, bottom: 30, right: 10, top: 10 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.bottom - margin.top;

let yMin = null;
let yMax = null;

function graphData(xValues, yValues, fill=false, fillColor=null, addLabels=false) {
    if (yMin === null || yMax === null) {
        console.error("You must first setYLimits before plotting data.")
        return;
    }
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    
    function getCanvasX(x) {
        return margin.left + (plotWidth * (x)) / (xMax - xMin);
    }
    function getCanvasY(y) {
        return margin.top + plotHeight - (((y - yMin) / (yMax - yMin)) * plotHeight);
    }
    
    ctx.beginPath();
    let x;
    for (let i = 0; i < xValues.length; i++) {
        x = getCanvasX(xValues[i]);
        const y = getCanvasY(yValues[i]);
        if (i === 0) {
            ctx.moveTo(x, y); 
        } else {
            ctx.lineTo(x, y); 
        }
    }
    if (fill) {
        const baseY = getCanvasY(yMin);
        ctx.lineTo(x, baseY);
        const firstX = getCanvasX(xValues[0]);
        ctx.lineTo(firstX, baseY);
        ctx.closePath();

        if (!fillColor) {
            const gradient = ctx.createLinearGradient(0, getCanvasY(Math.min(...yValues)), 0, getCanvasY(Math.max(...yValues)));
            gradient.addColorStop(0, '#2d5016');    
            gradient.addColorStop(0.5, '#a0522d');
            gradient.addColorStop(0.75, '#696969');
            gradient.addColorStop(1, '#f5f5f5');
            ctx.fillStyle = gradient;
            ctx.fill();
        } else {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
    } else {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    if (addLabels) {
        drawAxisLabels(xValues);
        drawBorders();
    }
}

function drawAxisLabels(xValues) {
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);

    ctx.fillStyle = '#000000';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';

    ctx.lineWidth = 0;

    const xStep = 25;
    const lastXIndex = Math.floor((xValues.length - 1) / xStep) * xStep;

    for (let i = 0; i < xValues.length; i += xStep) {
        const x = margin.left + (plotWidth * (xValues[i] - xMin)) / (xMax - xMin);
        const y = height - 5;
        const label = `${Math.round(xValues[i])}${i === lastXIndex ? ' km' : ''}`;
        ctx.fillText(label, x, y);
    }

    ctx.textAlign = 'right';
    const max = Math.round(yMax / 500) * 500;
    const min = Math.round(yMin / 500) * 500;

    for (let i = 0; i < 5; i++) {
        const yVal = min + (i * (max - min)) / 4;
        const x = margin.left - 5;
        const y = margin.top + plotHeight - (i * plotHeight) / 4 + 4;
        const label = `${Math.round(yVal)}${i === 4 ? ' m' : ''}`;
        ctx.fillText(label, x, y);
    }
}

function drawBorders() {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0;
    ctx.beginPath();
    
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    
    ctx.stroke();
}

function clearGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setYLimits(_yMin, _yMax) {
    yMin = _yMin;
    yMax = _yMax;
}