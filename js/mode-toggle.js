// js/mode-toggle.js
// Handles navigation toggle between simulator (index.html) and numerical mode (numerical-mode.html).

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('modeToggle');
  if (!toggle) return;

  const onNumericalPage = window.location.pathname.includes('numerical-mode');
  toggle.checked = onNumericalPage;

  toggle.addEventListener('change', () => {
    const target = toggle.checked ? 'numerical-mode.html' : 'index.html';
    if (!window.location.pathname.endsWith(target)) {
      window.location.href = target;
    }
  });
});
