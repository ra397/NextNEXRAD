(function () {
    const overlay = document.getElementById('error-overlay');
    const modal = document.getElementById('error-modal');
    const messageEl = document.getElementById('error-message');
    const closeEl = document.getElementById('error-close');

    window.showError = function (messages) {
        // Clear old messages
        messageEl.innerHTML = '';

        // Make sure we always work with an array
        const errs = Array.isArray(messages) ? messages : [messages];

        errs.forEach(msg => {
            const span = document.createElement('span');
            span.textContent = msg;
            span.classList.add('error-span'); // style each line if needed
            messageEl.appendChild(span);
            messageEl.appendChild(document.createElement('br')); // line break
        });

        overlay.classList.add('visible');
    };

    window.hideError = function () {
        overlay.classList.remove('visible');
    };

    closeEl.addEventListener('click', hideError);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideError();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
            hideError();
        }
    });
})();