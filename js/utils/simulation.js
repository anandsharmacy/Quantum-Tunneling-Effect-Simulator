// utils/simulation.js
// Core simulation engine functions extracted from main.js
// Exported functions and state for UI module to use.

let canvas, ctx;
const hbar = 1,
  m_ = 1,
  x_min = -160,
  x_max = 160;
let view_x_min = x_min,
  view_x_max = x_max;
let Nx = 700,
  dt = 0.05,
  step = 0,
  running = true,
  stepsPerFrame = 4,
  timeDependent = true;
export let k0 = 1.2,
  sigma = 5.0,
  x0_ = -100,
  pot_type = 'single',
  V0_ = 1.0,
  Vw_ = 20;
let dx, x_, psiR, psiI, V_;
let A_dR, A_dI, B_dR, B_dI, A_oI, B_oI, cpR, cpI, rhsR, rhsI;
let cssWidth = 0,
  cssHeight = 0;

export function initCanvas() {
  canvas = document.getElementById('simCanvas');
  ctx = canvas.getContext('2d');
  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);
}

export function buildGrid() {
  dx = (x_max - x_min) / (Nx - 1);
  x_ = new Float64Array(Nx);
  for (let i = 0; i < Nx; i++) x_[i] = x_min + i * dx;
}

export function buildV() {
  V_ = new Float64Array(Nx);
  if (pot_type === 'none') return;
  if (pot_type === 'single') {
    for (let i = 0; i < Nx; i++) if (Math.abs(x_[i]) < Vw_ / 2) V_[i] = V0_;
  } else if (pot_type === 'double') {
    const g = 30,
      w = Math.min(Vw_, 14);
    for (let i = 0; i < Nx; i++)
      if (Math.abs(x_[i] + g / 2) < w / 2 || Math.abs(x_[i] - g / 2) < w / 2)
        V_[i] = V0_;
  } else if (pot_type === 'step') {
    for (let i = 0; i < Nx; i++) if (x_[i] > 0) V_[i] = V0_;
  } else if (pot_type === 'delta') {
    const w = Math.max(0.3, dx * 2);
    for (let i = 0; i < Nx; i++) if (Math.abs(x_[i]) < w / 2) V_[i] = V0_ * 5;
  }
}

export function buildCN() {
  const coef = (-hbar * hbar) / (2 * m_ * dx * dx),
    bt = dt / (2 * hbar);
  A_dR = new Float64Array(Nx);
  A_dI = new Float64Array(Nx);
  B_dR = new Float64Array(Nx);
  B_dI = new Float64Array(Nx);
  for (let i = 0; i < Nx; i++) {
    const Hd = -2 * coef + V_[i];
    A_dR[i] = 1;
    A_dI[i] = bt * Hd;
    B_dR[i] = 1;
    B_dI[i] = -bt * Hd;
  }
  A_oI = bt * coef;
  B_oI = -bt * coef;
  cpR = new Float64Array(Nx - 1);
  cpI = new Float64Array(Nx - 1);
  let br = A_dR[0],
    bi = A_dI[0],
    mg = br * br + bi * bi;
  cpR[0] = (A_oI * bi) / mg;
  cpI[0] = (A_oI * br) / mg;
  for (let i = 1; i < Nx - 1; i++) {
    const dr = A_dR[i] - -A_oI * cpI[i - 1],
      di = A_dI[i] - A_oI * cpR[i - 1];
    mg = dr * dr + di * di;
    cpR[i] = (A_oI * di) / mg;
    cpI[i] = (A_oI * dr) / mg;
  }
  rhsR = new Float64Array(Nx);
  rhsI = new Float64Array(Nx);
}

export function initPsi() {
  psiR = new Float64Array(Nx);
  psiI = new Float64Array(Nx);
  const nm = Math.pow(1 / (2 * Math.PI * sigma * sigma), 0.25);
  for (let i = 0; i < Nx; i++) {
    const e = Math.exp((-(x_[i] - x0_) * (x_[i] - x0_)) / (4 * sigma * sigma));
    psiR[i] = nm * e * Math.cos(k0 * x_[i]);
    psiI[i] = nm * e * Math.sin(k0 * x_[i]);
  }
  // Normalise
  let sum = 0;
  for (let i = 0; i < Nx; i++) sum += psiR[i] * psiR[i] + psiI[i] * psiI[i];
  const norm = Math.sqrt(sum * dx);
  for (let i = 0; i < Nx; i++) {
    psiR[i] /= norm;
    psiI[i] /= norm;
  }
}

export function applyB(pR, pI, oR, oI) {
  for (let i = 0; i < Nx; i++) {
    oR[i] = B_dR[i] * pR[i] - B_dI[i] * pI[i];
    oI[i] = B_dR[i] * pI[i] + B_dI[i] * pR[i];
    if (i > 0) {
      oR[i] += -B_oI * pI[i - 1];
      oI[i] += B_oI * pR[i - 1];
    }
    if (i < Nx - 1) {
      oR[i] += -B_oI * pI[i + 1];
      oI[i] += B_oI * pR[i + 1];
    }
  }
  oR[0] = oI[0] = oR[Nx - 1] = oI[Nx - 1] = 0;
}

export function thomas() {
  const dpR = new Float64Array(Nx),
    dpI = new Float64Array(Nx);
  let br = A_dR[0],
    bi = A_dI[0],
    mg = br * br + bi * bi;
  dpR[0] = (rhsR[0] * br + rhsI[0] * bi) / mg;
  dpI[0] = (rhsI[0] * br - rhsR[0] * bi) / mg;
  for (let i = 1; i < Nx; i++) {
    const dr = A_dR[i] - -A_oI * cpI[i - 1],
      di = A_dI[i] - A_oI * cpR[i - 1];
    mg = dr * dr + di * di;
    const nr = rhsR[i] - -A_oI * dpI[i - 1],
      ni = rhsI[i] - A_oI * dpR[i - 1];
    dpR[i] = (nr * dr + ni * di) / mg;
    dpI[i] = (ni * dr - nr * di) / mg;
  }
  psiR[Nx - 1] = dpR[Nx - 1];
  psiI[Nx - 1] = dpI[Nx - 1];
  for (let i = Nx - 2; i >= 0; i--) {
    psiR[i] = dpR[i] - (cpR[i] * psiR[i + 1] - cpI[i] * psiI[i + 1]);
    psiI[i] = dpI[i] - (cpR[i] * psiI[i + 1] + cpI[i] * psiR[i + 1]);
  }
}

export function stepSim() {
  applyB(psiR, psiI, rhsR, rhsI);
  thomas();
  if (step % 40 === 0) {
    let s = 0;
    for (let i = 0; i < Nx; i++) s += psiR[i] * psiR[i] + psiI[i] * psiI[i];
    s = Math.sqrt(s * dx);
    if (s > 0)
      for (let i = 0; i < Nx; i++) {
        psiR[i] /= s;
        psiI[i] /= s;
      }
  }
  step++;
}

export function draw() {
  const W = cssWidth || canvas.width,
    H = cssHeight || canvas.height;
  ctx.clearRect(0, 0, W, H);
  const PW = W - 58 - 20,
    PH = H - 18 - 38;
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(58, 18, PW, PH);

  // Determine scaling
  let maxAmp = 0,
    maxV = 0;
  for (let i = 0; i < Nx; i++) {
    const ar = Math.abs(psiR[i]),
      ai = Math.abs(psiI[i]);
    if (ar > maxAmp) maxAmp = ar;
    if (ai > maxAmp) maxAmp = ai;
    if (V_[i] > maxV) maxV = V_[i];
  }
  if (maxAmp < 0.001) maxAmp = 0.25;
  let ymax = Math.ceil(Math.max(maxAmp, maxV) * 10) / 10 + 0.02;
  ymax = Math.max(ymax, 0.1);
  const ymin = -ymax;
  const toX = (xi) => 58 + ((xi - view_x_min) / (view_x_max - view_x_min)) * PW;
  const toY = (v) => 18 + PH - ((v - ymin) / (ymax - ymin)) * PH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1;
  const xTS = 40;
  for (
    let xi = Math.ceil(view_x_min / xTS) * xTS;
    xi <= view_x_max;
    xi += xTS
  ) {
    const px = toX(xi);
    ctx.beginPath();
    ctx.moveTo(px, 18);
    ctx.lineTo(px, 18 + PH);
    ctx.stroke();
  }
  const yTS = ymax > 0.15 ? 0.1 : 0.05;
  for (let yv = Math.ceil(ymin / yTS) * yTS; yv <= ymax + 0.001; yv += yTS) {
    const py = toY(yv);
    ctx.beginPath();
    ctx.moveTo(58, py);
    ctx.lineTo(58 + PW, py);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(100,120,150,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 18, PW, PH);

  // Axis labels
  ctx.fillStyle = '#333';
  ctx.font = '11px Inter,sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let yv = Math.ceil(ymin / yTS) * yTS; yv <= ymax + 0.001; yv += yTS) {
    const py = toY(yv);
    const lbl = Math.abs(yv) < 0.001 ? '0.0' : yv.toFixed(1);
    ctx.fillText(lbl, 58 - 6, py);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (
    let xi = Math.ceil(view_x_min / xTS) * xTS;
    xi <= view_x_max;
    xi += xTS
  ) {
    if (xi >= view_x_min && xi <= view_x_max) {
      ctx.fillText(Math.round(xi), toX(xi), 18 + PH + 6);
    }
  }

  // Potential V(x)
  if (maxV > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(124,158,197,0.18)';
    ctx.beginPath();
    const y0 = toY(0);
    for (let i = 0; i < Nx; i++) {
      const px = toX(x_[i]),
        py = toY(V_[i]);
      if (i === 0) ctx.moveTo(px, y0);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(toX(x_[Nx - 1]), y0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c9ec5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < Nx; i++) {
      const px = toX(x_[i]),
        py = toY(V_[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Im(ψ)
  ctx.save();
  ctx.strokeStyle = '#1a3fbf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < Nx; i++) {
    const px = toX(x_[i]),
      py = toY(psiI[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Re(ψ)
  ctx.save();
  ctx.strokeStyle = '#d62728';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < Nx; i++) {
    const px = toX(x_[i]),
      py = toY(psiR[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Zero line
  ctx.save();
  ctx.strokeStyle = 'rgba(60,80,110,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(58, toY(0));
  ctx.lineTo(58 + PW, toY(0));
  ctx.stroke();
  ctx.restore();

  // Legend (simplified)
  const legItems = [
    { color: '#7c9ec5', label: 'V(x)' },
    { color: '#d62728', label: 'ℜ(ψ)' },
    { color: '#1a3fbf', label: 'ℑ(ψ)' },
  ];
  ctx.font = '12px Inter,sans-serif';
  let maxLW = 0;
  legItems.forEach((it) => {
    const lw = ctx.measureText(it.label).width;
    if (lw > maxLW) maxLW = lw;
  });
  const legW = maxLW + 36,
    legH = legItems.length * 20 + 12,
    bx = 58 + PW - legW - 8,
    by = 18 + 8;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.strokeStyle = 'rgba(160,180,210,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, legW, legH, 5);
  ctx.fill();
  ctx.stroke();
  legItems.forEach((it, idx) => {
    const iy = by + 10 + idx * 20;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx + 8, iy + 5);
    ctx.lineTo(bx + 26, iy + 5);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.font = 'italic 12px Crimson Pro,Georgia,serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, bx + 30, iy + 5);
  });
  ctx.restore();

  // Stats updates (UI elements)
  const prob = new Float64Array(Nx);
  for (let i = 0; i < Nx; i++) prob[i] = psiR[i] * psiR[i] + psiI[i] * psiI[i];
  const iL = Math.max(
    0,
    Math.min(Nx - 1, Math.floor(((-50 - x_min) / (x_max - x_min)) * Nx))
  );
  const iR = Math.max(
    0,
    Math.min(Nx - 1, Math.floor(((50 - x_min) / (x_max - x_min)) * Nx))
  );
  let pL = 0,
    pRr = 0,
    pT = 0;
  for (let i = 0; i < Nx; i++) {
    if (i < iL) pL += prob[i];
    if (i > iR) pRr += prob[i];
    pT += prob[i];
  }
  pL *= dx;
  pRr *= dx;
  pT *= dx;
  document.getElementById('sT').textContent = pRr.toFixed(4);
  document.getElementById('sR').textContent = pL.toFixed(4);
  document.getElementById('sN').textContent = pT.toFixed(4);
  document.getElementById('sE').textContent = ((k0 * k0) / 2).toFixed(3);
  const tr = pL + pRr;
  if (tr > 0.01) {
    document.getElementById('bT').style.width =
      ((pRr / tr) * 100).toFixed(1) + '%';
    document.getElementById('bR').style.width =
      ((pL / tr) * 100).toFixed(1) + '%';
  }
  document.getElementById('tDisp').textContent = (step * dt).toFixed(1);
  document.getElementById('stDisp').textContent = step;
}

export function resize() {
  if (!canvas) return;
  const r = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cssWidth = Math.floor(r.width);
  cssHeight = Math.floor(r.height);

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

export function loop() {
  if (running && timeDependent)
    for (let s = 0; s < stepsPerFrame; s++) stepSim();
  draw();
  requestAnimationFrame(loop);
}

export function stopSim() {
  running = false;
}

export function setRunning(val) {
  running = val;
}

export function changeHeight(delta) {
  V0_ = Math.round(Math.max(0.1, Math.min(10.0, V0_ + delta)) * 100) / 100;
  document.getElementById('v0-live').textContent = V0_.toFixed(2);
  buildV();
  buildCN();
  // showHeightToast is defined in ui module; we will call it via UI after import.
}

export function zoomIn() {
  const range = view_x_max - view_x_min;
  const shrink = range * 0.125;
  if (range - shrink * 2 > 20) {
    view_x_min += shrink;
    view_x_max -= shrink;
  }
}

export function zoomOut() {
  const range = view_x_max - view_x_min;
  const grow = range * 0.166;
  view_x_min = Math.max(x_min, view_x_min - grow);
  view_x_max = Math.min(x_max, view_x_max + grow);
}

export function recenter() {
  view_x_min = x_min;
  view_x_max = x_max;
}

// Initialization entry point for UI to call after setting up event listeners
export function initSimulation() {
  initCanvas();
  buildGrid();
  buildV();
  buildCN();
  initPsi();
  step = 0;
  running = true;
}

export function changeSpeed(delta) {
  stepsPerFrame = Math.max(1, Math.min(16, stepsPerFrame + delta));
  document.getElementById('spd-live').textContent = stepsPerFrame;
  document.getElementById('i-spd').value = stepsPerFrame;
  document.getElementById('v-spd').textContent = stepsPerFrame;
}

export function applyWidth() {
  pot_type = document.getElementById('i-pot').value;
  Vw_ = parseFloat(document.getElementById('i-Vw').value);
  k0 = parseFloat(document.getElementById('i-k0').value);
  sigma = parseFloat(document.getElementById('i-sig').value);
  stepsPerFrame = parseInt(document.getElementById('i-spd').value);
  document.getElementById('spd-live').textContent = stepsPerFrame;
  buildV();
  buildCN();
  initPsi();
  step = 0;
}

export function applyMode() {
  timeDependent = document.getElementById('i-mode').value === 'td';
  document.getElementById('modeBadge').textContent = timeDependent
    ? 'T-DEPENDENT'
    : 'T-INDEPENDENT';
}

export function resetSim() {
  V0_ = 1.0;
  Vw_ = 20;
  stepsPerFrame = 4;
  k0 = 1.2;
  sigma = 5.0;
  pot_type = 'single';
  recenter(); // Reset zoom

  document.getElementById('v0-live').textContent = V0_.toFixed(2);
  document.getElementById('spd-live').textContent = stepsPerFrame;

  document.getElementById('i-pot').value = pot_type;
  document.getElementById('i-Vw').value = Vw_;
  document.getElementById('v-Vw').textContent = Vw_;
  document.getElementById('i-k0').value = k0;
  document.getElementById('v-k0').textContent = k0.toFixed(2);
  document.getElementById('i-sig').value = sigma;
  document.getElementById('v-sig').textContent = sigma.toFixed(1);
  document.getElementById('i-spd').value = stepsPerFrame;
  document.getElementById('v-spd').textContent = stepsPerFrame;

  buildV();
  buildCN();
  initPsi();
  step = 0;
}
