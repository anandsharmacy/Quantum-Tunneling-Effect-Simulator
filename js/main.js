// ═══════════════════════════════════════════════════
//  Quantum Tunneling — Crank–Nicolson Engine
// ═══════════════════════════════════════════════════

// Wait for DOM to load before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');

  const hbar = 1, m_ = 1, x_min = -160, x_max = 160;
  let view_x_min = x_min, view_x_max = x_max;
  let Nx = 700, dt = 0.05, step = 0, running = true, stepsPerFrame = 4, timeDependent = true;
  let k0 = 1.2, sigma = 5.0, x0_ = -100, pot_type = 'single', V0_ = 1.0, Vw_ = 20;
  let dx, x_, psiR, psiI, V_;
  let A_dR, A_dI, B_dR, B_dI, A_oI, B_oI, cpR, cpI, rhsR, rhsI;

  function buildGrid() {
    dx = (x_max - x_min) / (Nx - 1); x_ = new Float64Array(Nx);
    for (let i = 0; i < Nx; i++) x_[i] = x_min + i * dx;
  }
  function buildV() {
    V_ = new Float64Array(Nx);
    if (pot_type === 'none') return;
    if (pot_type === 'single') { for (let i = 0; i < Nx; i++) if (Math.abs(x_[i]) < Vw_ / 2) V_[i] = V0_; }
    else if (pot_type === 'double') {
      let g = 30, w = Math.min(Vw_, 14);
      for (let i = 0; i < Nx; i++) if (Math.abs(x_[i] + g / 2) < w / 2 || Math.abs(x_[i] - g / 2) < w / 2) V_[i] = V0_;
    }
    else if (pot_type === 'step') { for (let i = 0; i < Nx; i++) if (x_[i] > 0) V_[i] = V0_; }
    else if (pot_type === 'delta') { let w = Math.max(0.3, dx * 2); for (let i = 0; i < Nx; i++) if (Math.abs(x_[i]) < w / 2) V_[i] = V0_ * 5; }
  }
  function buildCN() {
    let coef = -hbar * hbar / (2 * m_ * dx * dx), bt = dt / (2 * hbar);
    A_dR = new Float64Array(Nx); A_dI = new Float64Array(Nx);
    B_dR = new Float64Array(Nx); B_dI = new Float64Array(Nx);
    for (let i = 0; i < Nx; i++) {
      let Hd = -2 * coef + V_[i];
      A_dR[i] = 1; A_dI[i] = bt * Hd; B_dR[i] = 1; B_dI[i] = -bt * Hd;
    }
    A_oI = bt * coef; B_oI = -bt * coef;
    cpR = new Float64Array(Nx - 1); cpI = new Float64Array(Nx - 1);
    let br = A_dR[0], bi = A_dI[0], mg = br * br + bi * bi;
    cpR[0] = (A_oI * bi) / mg; cpI[0] = (A_oI * br) / mg;
    for (let i = 1; i < Nx - 1; i++) {
      let dr = A_dR[i] - (-A_oI * cpI[i - 1]), di = A_dI[i] - (A_oI * cpR[i - 1]);
      mg = dr * dr + di * di;
      cpR[i] = (A_oI * di) / mg; cpI[i] = (A_oI * dr) / mg;
    }
    rhsR = new Float64Array(Nx); rhsI = new Float64Array(Nx);
  }
  function initPsi() {
    psiR = new Float64Array(Nx); psiI = new Float64Array(Nx);
    let nm = Math.pow(1 / (2 * Math.PI * sigma * sigma), .25), s = 0;
    for (let i = 0; i < Nx; i++) {
      let e = Math.exp(-(x_[i] - x0_) * (x_[i] - x0_) / (4 * sigma * sigma));
      psiR[i] = nm * e * Math.cos(k0 * x_[i]); psiI[i] = nm * e * Math.sin(k0 * x_[i]);
      s += psiR[i] * psiR[i] + psiI[i] * psiI[i];
    }
    s = Math.sqrt(s * dx);
    for (let i = 0; i < Nx; i++) { psiR[i] /= s; psiI[i] /= s; }
  }
  function applyB(pR, pI, oR, oI) {
    for (let i = 0; i < Nx; i++) {
      oR[i] = B_dR[i] * pR[i] - B_dI[i] * pI[i];
      oI[i] = B_dR[i] * pI[i] + B_dI[i] * pR[i];
      if (i > 0) { oR[i] += (-B_oI * pI[i - 1]); oI[i] += (B_oI * pR[i - 1]); }
      if (i < Nx - 1) { oR[i] += (-B_oI * pI[i + 1]); oI[i] += (B_oI * pR[i + 1]); }
    }
    oR[0] = oI[0] = oR[Nx - 1] = oI[Nx - 1] = 0;
  }
  function thomas() {
    let dpR = new Float64Array(Nx), dpI = new Float64Array(Nx);
    let br = A_dR[0], bi = A_dI[0], mg = br * br + bi * bi;
    dpR[0] = (rhsR[0] * br + rhsI[0] * bi) / mg;
    dpI[0] = (rhsI[0] * br - rhsR[0] * bi) / mg;
    for (let i = 1; i < Nx; i++) {
      let dr = A_dR[i] - (-A_oI * cpI[i - 1]), di = A_dI[i] - (A_oI * cpR[i - 1]);
      mg = dr * dr + di * di;
      let nr = rhsR[i] - (-A_oI * dpI[i - 1]), ni = rhsI[i] - (A_oI * dpR[i - 1]);
      dpR[i] = (nr * dr + ni * di) / mg; dpI[i] = (ni * dr - nr * di) / mg;
    }
    psiR[Nx - 1] = dpR[Nx - 1]; psiI[Nx - 1] = dpI[Nx - 1];
    for (let i = Nx - 2; i >= 0; i--) {
      psiR[i] = dpR[i] - (cpR[i] * psiR[i + 1] - cpI[i] * psiI[i + 1]);
      psiI[i] = dpI[i] - (cpR[i] * psiI[i + 1] + cpI[i] * psiR[i + 1]);
    }
  }
  function stepSim() {
    applyB(psiR, psiI, rhsR, rhsI); thomas();
    if (step % 40 === 0) {
      let s = 0;
      for (let i = 0; i < Nx; i++) s += psiR[i] * psiR[i] + psiI[i] * psiI[i];
      s = Math.sqrt(s * dx); if (s > 0) for (let i = 0; i < Nx; i++) { psiR[i] /= s; psiI[i] /= s; }
    }
    step++;
  }

  // ─── Draw ───
  const ML = 58, MR = 20, MT = 18, MB = 38;
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const PW = W - ML - MR, PH = H - MT - MB;
    ctx.fillStyle = '#f0f4f8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef5'; ctx.fillRect(ML, MT, PW, PH);

    let maxAmp = 0;
    for (let i = 0; i < Nx; i++) {
      let ar = Math.abs(psiR[i]), ai = Math.abs(psiI[i]);
      if (ar > maxAmp) maxAmp = ar; if (ai > maxAmp) maxAmp = ai;
    }
    let maxV = 0; for (let i = 0; i < Nx; i++) if (V_[i] > maxV) maxV = V_[i];
    if (maxAmp < 0.001) maxAmp = 0.25;
    let ymax = Math.ceil(maxAmp * 10) / 10 + 0.02; ymax = Math.max(ymax, 0.1);
    let ymin = -ymax;
    const toX = xi => ML + ((xi - view_x_min) / (view_x_max - view_x_min)) * PW;
    const toY = v => MT + PH - ((v - ymin) / (ymax - ymin)) * PH;

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    let xTS = 40;
    for (let xi = Math.ceil(view_x_min / xTS) * xTS; xi <= view_x_max; xi += xTS) { let px = toX(xi); ctx.beginPath(); ctx.moveTo(px, MT); ctx.lineTo(px, MT + PH); ctx.stroke(); }
    let yTS = ymax > 0.15 ? 0.1 : 0.05;
    for (let yv = Math.ceil(ymin / yTS) * yTS; yv <= ymax + 0.001; yv += yTS) { let py = toY(yv); ctx.beginPath(); ctx.moveTo(ML, py); ctx.lineTo(ML + PW, py); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(100,120,150,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(ML, MT, PW, PH);

    // y-axis labels
    ctx.fillStyle = '#333'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let yv = Math.ceil(ymin / yTS) * yTS; yv <= ymax + 0.001; yv += yTS) {
      let py = toY(yv); let lbl = Math.abs(yv) < 0.001 ? '0.0' : yv.toFixed(1);
      ctx.fillText(lbl, ML - 6, py);
    }
    // x-axis labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let xi = Math.ceil(view_x_min / xTS) * xTS; xi <= view_x_max; xi += xTS) {
      if (xi >= view_x_min && xi <= view_x_max) {
        ctx.fillText(Math.round(xi), toX(xi), MT + PH + 6);
      }
    }

    // V(x)
    if (maxV > 0) {
      ctx.save(); ctx.strokeStyle = '#7c9ec5'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < Nx; i++) {
        let px = toX(x_[i]);
        // Render potential static anchored to the center line
        let py = (MT + PH / 2) - (V_[i] / maxV) * (PH / 2 * 0.75);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.restore();
    }

    // Im(ψ) — dark blue
    ctx.save(); ctx.strokeStyle = '#1a3fbf'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < Nx; i++) { let px = toX(x_[i]), py = toY(psiI[i]); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke(); ctx.restore();

    // Re(ψ) — red
    ctx.save(); ctx.strokeStyle = '#d62728'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < Nx; i++) { let px = toX(x_[i]), py = toY(psiR[i]); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke(); ctx.restore();

    // zero line
    ctx.save(); ctx.strokeStyle = 'rgba(60,80,110,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ML, toY(0)); ctx.lineTo(ML + PW, toY(0)); ctx.stroke(); ctx.restore();

    // Legend
    const legItems = [{ color: '#7c9ec5', label: 'V(x)' }, { color: '#d62728', label: 'ℜ(ψ)' }, { color: '#1a3fbf', label: 'ℑ(ψ)' }];
    ctx.font = '12px Inter,sans-serif';
    let maxLW = 0; legItems.forEach(it => { let lw = ctx.measureText(it.label).width; if (lw > maxLW) maxLW = lw; });
    let legW = maxLW + 36, legH = legItems.length * 20 + 12, bx = ML + PW - legW - 8, by = MT + 8;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.strokeStyle = 'rgba(160,180,210,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, legW, legH, 5); ctx.fill(); ctx.stroke();
    legItems.forEach((it, idx) => {
      let iy = by + 10 + idx * 20;
      ctx.strokeStyle = it.color; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(bx + 8, iy + 5); ctx.lineTo(bx + 26, iy + 5); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = 'italic 12px Crimson Pro,Georgia,serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(it.label, bx + 30, iy + 5);
    });
    ctx.restore();

    // Stats
    let prob = new Float64Array(Nx);
    for (let i = 0; i < Nx; i++) prob[i] = psiR[i] * psiR[i] + psiI[i] * psiI[i];
    let iL = Math.max(0, Math.min(Nx - 1, Math.floor(((-50 - x_min) / (x_max - x_min)) * Nx)));
    let iR = Math.max(0, Math.min(Nx - 1, Math.floor(((50 - x_min) / (x_max - x_min)) * Nx)));
    let pL = 0, pRr = 0, pT = 0;
    for (let i = 0; i < Nx; i++) { if (i < iL) pL += prob[i]; if (i > iR) pRr += prob[i]; pT += prob[i]; }
    pL *= dx; pRr *= dx; pT *= dx;
    document.getElementById('sT').textContent = pRr.toFixed(4);
    document.getElementById('sR').textContent = pL.toFixed(4);
    document.getElementById('sN').textContent = pT.toFixed(4);
    document.getElementById('sE').textContent = (k0 * k0 / 2).toFixed(3);
    let tr = pL + pRr;
    if (tr > .01) { document.getElementById('bT').style.width = (pRr / tr * 100).toFixed(1) + '%'; document.getElementById('bR').style.width = (pL / tr * 100).toFixed(1) + '%'; }
    document.getElementById('tDisp').textContent = (step * dt).toFixed(1);
    document.getElementById('stDisp').textContent = step;
  }

  function init() { buildGrid(); buildV(); buildCN(); initPsi(); step = 0; running = true; }
  function resize() { const r = canvas.parentElement.getBoundingClientRect(); canvas.width = Math.floor(r.width); canvas.height = Math.floor(r.height); }
  function loop() { if (running && timeDependent) for (let s = 0; s < stepsPerFrame; s++)stepSim(); draw(); requestAnimationFrame(loop); }

  function stopSim() {
    running = false;
  }

  // ─── Height Control ───
  let toastTimer = null;

  function changeSpeed(delta) {
    stepsPerFrame = Math.max(1, Math.min(16, stepsPerFrame + delta));
    document.getElementById('spd-live').textContent = stepsPerFrame;
    document.getElementById('i-spd').value = stepsPerFrame;
    document.getElementById('v-spd').textContent = stepsPerFrame;
  }

  // ─── Viewport Controls ───
  function zoomIn() {
    let range = view_x_max - view_x_min;
    let shrink = range * 0.125; // 25% total reduction (12.5% each side)
    // Prevent zooming in too far
    if (range - shrink * 2 > 20) {
      view_x_min += shrink;
      view_x_max -= shrink;
    }
  }

  function zoomOut() {
    let range = view_x_max - view_x_min;
    let grow = range * 0.166; // approx 25% total increase mapped to current frame
    view_x_min = Math.max(x_min, view_x_min - grow);
    view_x_max = Math.min(x_max, view_x_max + grow);
  }

  function recenter() {
    view_x_min = x_min;
    view_x_max = x_max;
  }

  function changeHeight(delta) {
    let oldV0 = V0_;
    V0_ = Math.round(Math.max(0.1, Math.min(10.0, V0_ + delta)) * 100) / 100;
    document.getElementById('v0-live').textContent = V0_.toFixed(2);

    // Rebuild potential and CN matrices (keep wavefunction intact — no reset)
    buildV(); buildCN();

    showHeightToast(delta > 0 ? 'increase' : 'decrease');
  }

  function showHeightToast(direction) {
    const toast = document.getElementById('height-toast');
    const titleEl = document.getElementById('toast-title');
    const titleTxt = document.getElementById('toast-title-text');
    const body = document.getElementById('toast-body');
    const E = (k0 * k0 / 2).toFixed(2);

    if (direction === 'increase') {
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
            <div class="toast-bullet"><span class="icon">👉</span><span>Even small increases can strongly reduce probability.</span></div>
          </div>
          <div class="toast-section">
            <div class="toast-section-title">Physical intuition</div>
            <div class="toast-bullet"><span class="icon">🧱</span><span>Higher barrier = stronger "forbidden region"</span></div>
            <div class="toast-bullet"><span class="icon">📉</span><span>Wave cannot penetrate much → less transmission.</span></div>
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
          <div class="toast-bullet"><span class="icon">👉</span><span>Decay almost disappears</span></div>
          <div class="toast-bullet"><span class="icon">👉</span><span>Tunneling becomes high</span></div>
          <div class="toast-cond">If V₀ &lt; E:</div>
          <div class="toast-bullet"><span class="icon">👉</span><span>Not tunneling anymore → normal transmission</span></div>`;
    }

    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
  }

  function closeToast() {
    document.getElementById('height-toast').classList.remove('show');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }

  // ─── Other UI ───
  function showPanel(id) {
    document.querySelectorAll('.panel').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
    document.querySelectorAll('.nav-item')[{ info: 0, equation: 1, working: 2 }[id]].classList.add('active');
  }
  function showSim() {
    document.querySelectorAll('.panel').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  }
  function openM(id) { document.getElementById('m-' + id).classList.add('open'); }
  function closeM(id) { document.getElementById('m-' + id).classList.remove('open'); }

  function applyWidth() {
    pot_type = document.getElementById('i-pot').value;
    Vw_ = parseFloat(document.getElementById('i-Vw').value);
    k0 = parseFloat(document.getElementById('i-k0').value);
    sigma = parseFloat(document.getElementById('i-sig').value);
    stepsPerFrame = parseInt(document.getElementById('i-spd').value);
    document.getElementById('spd-live').textContent = stepsPerFrame;
    buildV(); buildCN(); initPsi(); step = 0;
  }
  function applyMode() {
    timeDependent = document.getElementById('i-mode').value === 'td';
    document.getElementById('modeBadge').textContent = timeDependent ? 'T-DEPENDENT' : 'T-INDEPENDENT';
  }
  function resetSim() {
    // Reset underlying variables to defaults
    V0_ = 1.0;
    Vw_ = 20;
    stepsPerFrame = 4;
    k0 = 1.2;
    sigma = 5.0;
    pot_type = 'single';
    recenter(); // Reset zoom as well

    // Update UI elements for Height and Speed displays
    document.getElementById('v0-live').textContent = V0_.toFixed(2);
    document.getElementById('spd-live').textContent = stepsPerFrame;

    // Update Modal input elements
    document.getElementById('i-pot').value = pot_type;
    document.getElementById('i-Vw').value = Vw_;
    document.getElementById('v-Vw').textContent = Vw_;
    document.getElementById('i-k0').value = k0;
    document.getElementById('v-k0').textContent = k0.toFixed(2);
    document.getElementById('i-sig').value = sigma;
    document.getElementById('v-sig').textContent = sigma.toFixed(1);
    document.getElementById('i-spd').value = stepsPerFrame;
    document.getElementById('v-spd').textContent = stepsPerFrame;

    // Rebuild simulation state
    buildV();
    buildCN();
    initPsi();
    step = 0;
  }

  document.querySelectorAll('.backdrop').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });

  // ─── Event Listeners Setup ───
  document.getElementById('btn-info').addEventListener('click', () => showPanel('info'));
  document.getElementById('btn-equation').addEventListener('click', () => showPanel('equation'));
  document.getElementById('btn-working').addEventListener('click', () => showPanel('working'));

  document.getElementById('btn-simulator').addEventListener('click', () => {
    running = true;
    showSim();
  });
  document.getElementById('btn-stop').addEventListener('click', stopSim);
  document.getElementById('btn-dec-height').addEventListener('click', () => changeHeight(-0.25));
  document.getElementById('btn-inc-height').addEventListener('click', () => changeHeight(+0.25));

  document.getElementById('btn-dec-speed').addEventListener('click', () => changeSpeed(-1));
  document.getElementById('btn-inc-speed').addEventListener('click', () => changeSpeed(+1));

  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => zoomIn());
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => zoomOut());
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => recenter());

  document.getElementById('btn-open-width').addEventListener('click', () => openM('width'));
  document.getElementById('btn-close-width').addEventListener('click', () => closeM('width'));
  document.getElementById('btn-cancel-width').addEventListener('click', () => closeM('width'));
  document.getElementById('btn-apply-width').addEventListener('click', () => { applyWidth(); closeM('width'); });

  document.getElementById('btn-reset').addEventListener('click', resetSim);

  document.getElementById('btn-open-mode').addEventListener('click', () => openM('mode'));
  document.getElementById('btn-close-mode').addEventListener('click', () => closeM('mode'));
  document.getElementById('btn-cancel-mode').addEventListener('click', () => closeM('mode'));
  document.getElementById('btn-apply-mode').addEventListener('click', () => { applyMode(); closeM('mode'); });

  document.getElementById('btn-close-toast').addEventListener('click', closeToast);

  // Range slider live value updates
  document.getElementById('i-Vw').addEventListener('input', function () { document.getElementById('v-Vw').textContent = parseInt(this.value); });
  document.getElementById('i-k0').addEventListener('input', function () { document.getElementById('v-k0').textContent = parseFloat(this.value).toFixed(2); });
  document.getElementById('i-sig').addEventListener('input', function () { document.getElementById('v-sig').textContent = parseFloat(this.value).toFixed(1); });
  document.getElementById('i-spd').addEventListener('input', function () {
    document.getElementById('v-spd').textContent = parseInt(this.value);
    stepsPerFrame = parseInt(this.value);
    document.getElementById('spd-live').textContent = stepsPerFrame;
  });

  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);
  init(); loop();
});
