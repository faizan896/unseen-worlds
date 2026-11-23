import {exposureRenderer} from './exposure.js';

export const fmt = (n, d = 1) => Number(n.toFixed(d)).toString();
export const xy = p => '(' + p.map(x => fmt(x)).join(', ') + ')';

export function field(trial) {
  const p = trial.scene[0], [x, y] = trial.film.at(-1)[0];
  return [(x - p.x - 2 * p.vx) / 2, (y - p.y - 2 * p.vy) / 2];
}

export function scopeMarkup(title) {
  return `<figure class="chamber">
    <figcaption><span>Probe trajectories</span><span class="figure-state">${title}</span></figcaption>
    <div class="scope">
      <div class="scope-readout"><span class="telemetry"><b>A</b><span>Position</span> <span id="position"></span></span><span class="axes">X → east &nbsp; Y ↓ south</span></div>
      <canvas class="stage" aria-label="Two-second motion of probe A and references B and C"></canvas>
      <div class="legend"><span>Probe A</span><span>Reference B</span><span>Reference C</span></div>
    </div>
    <div class="scopeFoot"><button class="iconbtn" id="play">Pause</button>
      <input id="scrub" type="range" min="0" max="2" value="0" step=".01" aria-label="Simulation time">
      <output id="time">0.00 / 2 s</output>
    </div></figure>`;
}

let cleanup;
export function stop() {
  cleanup?.();
  cleanup = null;
}

export function animate(trial, base) {
  stop();
  const canvas = document.querySelector('.stage');
  const ctx = canvas.getContext('2d');
  const scrub = document.querySelector('#scrub'), play = document.querySelector('#play');
  const clock = document.querySelector('#time'), position = document.querySelector('#position');
  const style = getComputedStyle(canvas);
  const color = name => style.getPropertyValue('--' + name).trim();
  const hues = ['a', 'b', 'c'].map(color);
  const strokes = ['a-ink', 'b-ink', 'c-ink'].map(color);
  const exposure = document.querySelector('.exposure-film');
  const drawExposure = exposure && exposureRenderer(exposure, trial.film, hues, strokes);
  const ink = color('scope'), grid = color('grid'), paper = color('chamber');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = base.duration;
  // Keep the opening in view when comparing a trial, using the same units on both axes.
  const positions = [...base.film, ...trial.film].flat();
  const xs = positions.map(([x]) => x), ys = positions.map(([, y]) => y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const visibleCanvases = new Set();
  let active = true, paused = reduce.matches, elapsed = 0, last = null, frame = 0;

  function paint() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const plotWidth = w - Math.min(86, w / 2);
    const plotHeight = h - Math.min(68, h / 2);
    const scale = Math.min(plotWidth / Math.max(1,right-left), plotHeight / Math.max(1,bottom-top));
    const X = x => w / 2 + (x - (left + right)/2) * scale;
    const Y = y => h / 2 + (y - (top + bottom)/2) * scale;
    const phase = Math.min(elapsed, duration);
    const sample = (trial.film.length - 1) * phase / duration;
    const i = Math.min(trial.film.length - 2, Math.floor(sample)), frac = sample - i;
    drawExposure?.(i, frac);

    function line(x, y, u, v, stroke, width = 1) {
      ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(u, v); ctx.stroke();
    }
    function ring(x, y, radius, stroke) {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = ink;
    const spacing = 10 * 2 ** Math.ceil(Math.log2(32 / (10 * scale)));
    const rulerX = 26, rulerY = h - 18;
    line(rulerX, 0, rulerX, rulerY, grid);
    line(rulerX, rulerY, w, rulerY, grid);
    for (let n = Math.ceil((rulerX-X(0))/(spacing*scale))*spacing; X(n) <= w; n += spacing) {
      line(X(n), 0, X(n), rulerY, grid, .55);
      line(X(n), rulerY, X(n), rulerY+3, ink);
      if (X(n) < w-17) ctx.fillText(n, X(n)-3, h-2);
    }
    for (let n = Math.ceil(-Y(0)/(spacing*scale))*spacing; Y(n) <= rulerY; n += spacing) {
      line(rulerX, Y(n), w, Y(n), grid, .55);
      line(rulerX-3, Y(n), rulerX, Y(n), ink);
      if (Y(n) > 7) ctx.fillText(n, 0, Y(n)+3);
    }
    function track(film, j, end, stroke, width, dash, tip) {
      ctx.beginPath(); ctx.setLineDash(dash);
      for (let k = 0; k <= end; k++) {
        const [x, y] = film[k][j];
        if (k === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y));
      }
      if (tip) ctx.lineTo(...tip);
      ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); ctx.setLineDash([]);
    }
    if (trial !== base) track(base.film, 0, base.film.length-1, ink, 1, [5, 5]);
    for (let j = 0; j < hues.length; j++) {
      const hue = hues[j];
      const stroke = strokes[j];
      const [a, b] = trial.film[i][j], [c, d] = trial.film[i+1][j];
      const px = a + (c-a)*frac, py = b + (d-b)*frac;
      const x = X(px), y = Y(py);
      const [sx, sy] = trial.film[0][j], [ex, ey] = trial.film.at(-1)[j];
      if (j === 0) position.textContent = xy([px, py]);
      ctx.save();
      if (j === 0 && paused) {
        ctx.globalAlpha = .4; ctx.setLineDash([2, 5]);
        line(rulerX, y, x, y, stroke);
        line(x, y, x, rulerY, stroke);
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = .55;
      track(trial.film, j, trial.film.length-1, stroke, 1.2, [2, 4]);
      line(X(sx)-4, Y(sy), X(sx)+4, Y(sy), stroke);
      line(X(sx), Y(sy)-4, X(sx), Y(sy)+4, stroke);
      ring(X(ex), Y(ey), 5, stroke);
      if (j === 0 && phase < .45 && !reduce.matches) {
        const release = phase / .45;
        ctx.globalAlpha = .65 * (1 - release);
        ring(X(sx), Y(sy), 6 + 34*release, hue);
      }
      ctx.globalAlpha = 1;
      track(trial.film, j, i, stroke, 2, [], [x, y]);
      const r = w < 440 ? 4.5 : 6;
      ctx.translate(x, y);
      ctx.fillStyle = hue; ctx.beginPath();
      if (j === 0) ctx.arc(0, 0, r, 0, Math.PI*2);
      else if (j === 1) { ctx.moveTo(0,-r); ctx.lineTo(r,0); ctx.lineTo(0,r); ctx.lineTo(-r,0); ctx.closePath(); }
      else ctx.rect(-r*.8, -r*.8, r*1.6, r*1.6);
      ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
      if (j === 0) {
        ring(0, 0, r+4, stroke);
        if (elapsed >= duration) {
          const fade = Math.min(1, (elapsed-duration)/.55);
          ctx.globalAlpha = 1-fade; ring(0, 0, r+4+fade*22, hue); ctx.globalAlpha = 1;
        }
      }
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.lineWidth = 3; ctx.strokeStyle = paper;
      ctx.strokeText('ABC'[j], r+6, -r-4);
      ctx.fillStyle = stroke; ctx.fillText('ABC'[j], r+6, -r-4);
      ctx.restore();
    }
    scrub.value = phase.toFixed(2);
    scrub.style.setProperty('--progress', (phase / duration * 100) + '%');
    clock.textContent = phase.toFixed(2) + ' / ' + duration + ' s';
  }

  function tick(now) {
    if (last !== null) elapsed = (elapsed + (now-last)/1000) % (duration+.55);
    last = now;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!active) return;
    cancelAnimationFrame(frame);
    last = null;
    play.textContent = paused ? '▶ Play' : 'Ⅱ Pause';
    paint();
    if (!paused && visibleCanvases.size && !document.hidden) frame = requestAnimationFrame(tick);
  }
  play.onclick = () => { paused = !paused; sync(); };
  scrub.oninput = () => { paused = true; elapsed = Number(scrub.value); sync(); };
  function preferenceChanged() { if (reduce.matches) { paused = true; sync(); } }
  const size = new ResizeObserver(paint);
  size.observe(canvas);
  if (exposure) size.observe(exposure);
  const visibility = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visibleCanvases.add(target);
      else visibleCanvases.delete(target);
    }
    sync();
  });
  visibility.observe(canvas);
  if (exposure) visibility.observe(exposure);
  reduce.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', sync);
  cleanup = () => {
    active = false;
    cancelAnimationFrame(frame); size.disconnect(); visibility.disconnect();
    reduce.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', sync);
  };
  sync();
}
