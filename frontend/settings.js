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

            // Reload tiles with the new color
            if (document.getElementById("show-all-coverage-checkbox").checked == true) {
                coveragesLayer.loadAndShowSelectedCoverage();
            }
        });
    });
    
    // Set default selection (blue)
    document.querySelector('.color-option[data-color="green"]').classList.add('selected');
})