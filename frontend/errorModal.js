(function () {
    const overlay = document.getElementById('error-overlay');
    const modal = document.getElementById('error-modal');
    const messageEl = document.getElementById('error-message');
    const closeEl = document.getElementById('error-close');

    window.showError = function (message) {
        messageEl.textContent = message;
        overlay.classList.add('visible');
    };

    window.hideError = function () {
        overlay.classList.remove('visible');
    };

    // Close via clickable span
    closeEl.addEventListener('click', hideError);

    // Close on click outside the panel
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideError();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
        hideError();
        }
    });
})();