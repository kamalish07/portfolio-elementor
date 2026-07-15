
/* ==================== FULLSCREEN PREVIEW ==================== */
(function () {
  const appearance = document.getElementById('appearance');
  const controls = document.querySelector('.appearance__controls');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  let isFullscreen = false;
  let closeBtn = null;
  let sidebarBtn = null;

  function enterFullscreen() {
    isFullscreen = true;
    appearance.classList.add('appearance--fullscreen');
    // Create close button
    closeBtn = document.createElement('button');
    closeBtn.className = 'fs-close';
    closeBtn.textContent = '✕ Exit';
    closeBtn.addEventListener('click', exitFullscreen);
    document.body.appendChild(closeBtn);
    // Create sidebar toggle
    sidebarBtn = document.createElement('button');
    sidebarBtn.className = 'fs-toggle-sidebar';
    sidebarBtn.textContent = '☰';
    sidebarBtn.title = 'Toggle sidebar';
    sidebarBtn.addEventListener('click', () => {
      controls.classList.toggle('collapsed');
    });
    document.body.appendChild(sidebarBtn);
    fullscreenBtn.textContent = '⊠ Exit Fullscreen';
  }

  function exitFullscreen() {
    isFullscreen = false;
    appearance.classList.remove('appearance--fullscreen');
    controls.classList.remove('collapsed');
    if (closeBtn) { closeBtn.remove(); closeBtn = null; }
    if (sidebarBtn) { sidebarBtn.remove(); sidebarBtn = null; }
    fullscreenBtn.textContent = '⛶ Fullscreen';
  }

  fullscreenBtn.addEventListener('click', () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) exitFullscreen();
  });
})();
