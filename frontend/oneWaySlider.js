const slider = document.getElementById('pod-opacity');
const valueSpan = document.getElementById('pod-opacity-value');

function updateSpanPosition() {
    const value = slider.value;
    const percentage = value / 100;
    const sliderWidth = 165;
    const thumbWidth = 20;
    const availableWidth = sliderWidth - thumbWidth;
    const leftPosition = (availableWidth * percentage) + (thumbWidth / 2) + 25;
    
    valueSpan.style.position = 'absolute';
    valueSpan.style.left = leftPosition + 'px';
    valueSpan.style.transform = 'translateX(-50%)';
}

function waitForSliderWidth() {
    if (slider.offsetWidth === 0) {
        requestAnimationFrame(waitForSliderWidth);
    } else {
        updateSpanPosition();
    }
}

slider.addEventListener('input', updateSpanPosition);

document.addEventListener("DOMContentLoaded", waitForSliderWidth);
