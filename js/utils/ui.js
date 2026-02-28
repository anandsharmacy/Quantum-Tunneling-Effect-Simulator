// utils/ui.js
// UI event handling and wiring for the Quantum Tunneling Simulator.
// This module imports core simulation functions and attaches DOM event listeners.

import {
  initSimulation,
  loop,
  stopSim,
  changeHeight,
  zoomIn,
  zoomOut,
  recenter,
  changeSpeed,
  applyWidth,
  applyMode,
  resetSim,
  k0,
  V0_,
  setRunning,
} from './simulation.js';

// Helper to display the height change toast (moved from original main.js)
function showHeightToast(delta) {
  const toast = document.getElementById('height-toast');
  const titleEl = document.getElementById('toast-title');
  const titleTxt = document.getElementById('toast-title-text');
  const body = document.getElementById('toast-body');
  const E = ((k0 * k0) / 2).toFixed(2);
  if (delta > 0) {
    titleEl.className = 'toast-title inc';
    titleTxt.textContent = 'Effect of increasing barrier height';
    body.innerHTML = `
      <div class="toast-section">
        <div class="toast-section-title">Step-by-step effect</div>
        <ul class="toast-list">
          <li><span class="num">1.</span> V₀ − E increases (now V₀ − E = ${(V0_ - E).toFixed(2)})</li>
          <li><span class="num">2.</span> κ = √(2m(V₀−E))/ℏ increases</li>
          <li><span class="num">3.</span> Wave decays faster inside barrier</li>
          <li><span class="num">4.</span> Less wave reaches other side</li>
          <li><span class="num">5.</span> <span class="toast-bold">Tunneling probability decreases exponentially</span></li>
        </ul>
        <div class="toast-bullet"><span class="icon">👉</span>Even small increases can strongly reduce probability.</div>
      </div>
      <div class="toast-section">
        <div class="toast-section-title">Physical intuition</div>
        <div class="toast-bullet"><span class="icon">🧱</span>Higher barrier = stronger "forbidden region"</div>
        <div class="toast-bullet"><span class="icon">📉</span>Wave cannot penetrate much → less transmission.</div>
      </div>`;
  } else {
    titleEl.className = 'toast-title dec';
    titleTxt.textContent = 'Effect of decreasing barrier height';
    body.innerHTML = `
      <div class="toast-section">
        <div class="toast-section-title">If V₀ decreases:</div>
        <ul class="toast-list">
          <li><span class="num">1.</span> V₀ − E decreases (now V₀ − E = ${(V0_ - E).toFixed(2)})</li>
          <li><span class="num">2.</span> κ decreases</li>
          <li><span class="num">3.</span> Wave decays slowly</li>
          <li><span class="num">4.</span> More amplitude reaches other side</li>
          <li><span class="num">5.</span> <span class="toast-bold">Tunneling probability increases</span></li>
        </ul>
      </div>
      <div class="toast-cond">If V₀ → E:</div>
      <div class="toast-bullet"><span class="icon">👉</span>Decay almost disappears</div>
      <div class="toast-bullet"><span class="icon">👉</span>Tunneling becomes high</div>
      <div class="toast-cond">If V₀ < E:</div>
      <div class="toast-bullet"><span class="icon">👉</span>Not tunneling anymore → normal transmission</div>`;
  }
  toast.classList.add('show');
  if (window.toastTimer) clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

// Wrap changeHeight to also show toast
function uiChangeHeight(delta) {
  changeHeight(delta);
  showHeightToast(delta);
}

// Initialize UI immediately since script is loaded with defer
(async function initUI() {
  // Load components first
  try {
    const headerRes = await fetch('components/header.html');
    if (headerRes.ok)
      document.getElementById('header-container').innerHTML =
        await headerRes.text();
    const footerRes = await fetch('components/footer.html');
    if (footerRes.ok)
      document.getElementById('footer-container').innerHTML =
        await footerRes.text();
  } catch (err) {
    console.error('Failed to load components', err);
  }

  // Initialise simulation core
  initSimulation();
  loop();

  // Navigation buttons
  document
    .getElementById('btn-info')
    .addEventListener('click', () => showPanel('info'));
  document
    .getElementById('btn-equation')
    .addEventListener('click', () => showPanel('equation'));
  document
    .getElementById('btn-working')
    .addEventListener('click', () => showPanel('working'));

  // Simulator control
  document.getElementById('btn-simulator').addEventListener('click', () => {
    setRunning(true);
    showSim();
  });
  document.getElementById('btn-stop').addEventListener('click', stopSim);

  // Height controls
  document
    .getElementById('btn-dec-height')
    .addEventListener('click', () => uiChangeHeight(-0.25));
  document
    .getElementById('btn-inc-height')
    .addEventListener('click', () => uiChangeHeight(+0.25));

  // Speed controls
  document
    .getElementById('btn-dec-speed')
    .addEventListener('click', () => changeSpeed(-1));
  document
    .getElementById('btn-inc-speed')
    .addEventListener('click', () => changeSpeed(+1));

  // Viewport controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) btnZoomIn.addEventListener('click', zoomIn);
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) btnZoomOut.addEventListener('click', zoomOut);
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  if (btnZoomReset) btnZoomReset.addEventListener('click', recenter);

  // Width modal
  document
    .getElementById('btn-open-width')
    .addEventListener('click', () => openM('width'));
  document
    .getElementById('btn-close-width')
    .addEventListener('click', () => closeM('width'));
  document
    .getElementById('btn-cancel-width')
    .addEventListener('click', () => closeM('width'));
  document.getElementById('btn-apply-width').addEventListener('click', () => {
    applyWidth();
    closeM('width');
  });

  // Mode modal
  document
    .getElementById('btn-open-mode')
    .addEventListener('click', () => openM('mode'));
  document
    .getElementById('btn-close-mode')
    .addEventListener('click', () => closeM('mode'));
  document
    .getElementById('btn-cancel-mode')
    .addEventListener('click', () => closeM('mode'));
  document.getElementById('btn-apply-mode').addEventListener('click', () => {
    applyMode();
    closeM('mode');
  });

  // Reset button
  document.getElementById('btn-reset').addEventListener('click', resetSim);

  // Toast close
  document.getElementById('btn-close-toast').addEventListener('click', () => {
    const toast = document.getElementById('height-toast');
    toast.classList.remove('show');
    if (window.toastTimer) {
      clearTimeout(window.toastTimer);
      window.toastTimer = null;
    }
  });

  // Live slider updates (same as original)
  document.getElementById('i-Vw').addEventListener('input', function () {
    document.getElementById('v-Vw').textContent = parseInt(this.value);
  });
  document.getElementById('i-k0').addEventListener('input', function () {
    document.getElementById('v-k0').textContent = parseFloat(
      this.value
    ).toFixed(2);
  });
  document.getElementById('i-sig').addEventListener('input', function () {
    document.getElementById('v-sig').textContent = parseFloat(
      this.value
    ).toFixed(1);
  });
  document.getElementById('i-spd').addEventListener('input', function () {
    document.getElementById('v-spd').textContent = parseInt(this.value);
    changeSpeed(0); // update internal stepsPerFrame via changeSpeed logic
    document.getElementById('spd-live').textContent = parseInt(this.value);
  });
})();

export function showPanel(id) {
  document
    .querySelectorAll('.panel')
    .forEach((e) => e.classList.remove('active'));
  document
    .querySelectorAll('.nav-item')
    .forEach((e) => e.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const items = document.querySelectorAll('.nav-item');
  const idx = { info: 0, equation: 1, working: 2 }[id];
  if (items[idx]) items[idx].classList.add('active');
}
export function showSim() {
  document
    .querySelectorAll('.panel')
    .forEach((e) => e.classList.remove('active'));
  document
    .querySelectorAll('.nav-item')
    .forEach((e) => e.classList.remove('active'));
}
export function openM(id) {
  document.getElementById('m-' + id).classList.add('open');
}
export function closeM(id) {
  document.getElementById('m-' + id).classList.remove('open');
}
