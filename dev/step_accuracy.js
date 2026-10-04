// Shader adım kuralının doğruluğu: yüksek hassasiyetli referansa göre kaçış yönü hatası
const P = require('../js/physics.js');
const a = 0.9, R = 26, th = 82 * Math.PI / 180;
const X = [Math.sqrt(R * R + a * a) * Math.sin(th), 0, R * Math.cos(th)];
const u = P.staticObserver(X, a);
const n = Math.hypot(...X);
const T = P.cameraTetrad(X, u, X.map(v => -v / n), [0, 0, 1], a);
const rh = P.horizon(a);
function trace(dl, stepK, growth, rule) {
  const q = [0, 1, 2, 3].map(i => T.Q0[i] + dl[0] * T.Q1[i] + dl[1] * T.Q2[i] + dl[2] * T.Q3[i]);
  const s = 1 / q[0];
  const st = new Float64Array([...X, q[1] * s, q[2] * s, q[3] * s, 0]);
  const d = new Float64Array(7);
  let steps = 0, crossings = [];
  let prevZ = st[2];
  for (let i = 0; i < 5000; i++) {
    const r = P.kerrR(st[0], st[1], st[2], a);
    P.deriv([st[0], st[1], st[2]], [st[3], st[4], st[5]], 1, a, d);
    const v = Math.hypot(d[0], d[1], d[2]);
    if (r < rh * 1.01 + 0.005) return { fate: 'cap', steps, crossings };
    if (r > 400 && (st[0] * d[0] + st[1] * d[1] + st[2] * d[2]) > 0) return { fate: 'esc', dir: [d[0] / v, d[1] / v, d[2] / v], steps, crossings };
    let ds = stepK * Math.max(r, 0.8) * (growth ? Math.min(Math.max(r * growth, 1), 3.5) : 1);
    ds = Math.min(ds, Math.max(0.6 * (r - rh), 0.035) + 0.02 * r);
    const x0 = st[0], y0 = st[1], z0 = st[2];
    P.rk4(st, 1, a, ds / v);
    steps++;
    if (z0 * st[2] < 0) {
      const f = z0 / (z0 - st[2]);
      const xh = x0 + (st[0] - x0) * f, yh = y0 + (st[1] - y0) * f;
      crossings.push(Math.sqrt(Math.max(xh * xh + yh * yh - a * a, 0)));
    }
  }
  return { fate: 'max', steps };
}
// ekran yönleri: kara deliğe yakın birkaç piksel çizgisi
const tanH = Math.tan(23 * Math.PI / 180);
const samples = [];
for (let i = 0; i <= 60; i++) {
  const x = -0.95 + 1.9 * i / 60;
  for (const y of [0.0, 0.12, 0.3]) samples.push([x * tanH * 1.77, y * tanH, 1]);
}
const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
const ref = samples.map(s => trace(norm(s), 0.004, 0, 0));
for (const [k, g] of [[0.065, 0.14], [0.085, 0.14], [0.1, 0.14], [0.12, 0.14], [0.085, 0.2], [0.1, 0.2]]) {
  let maxErr = 0, sumSteps = 0, mism = 0, crossErr = 0;
  samples.forEach((s, i) => {
    const t = trace(norm(s), k, g, 0);
    sumSteps += t.steps;
    if (t.fate !== ref[i].fate) { mism++; return; }
    if (t.fate === 'esc') {
      const e = Math.acos(Math.min(1, t.dir.reduce((acc, c, j) => acc + c * ref[i].dir[j], 0)));
      maxErr = Math.max(maxErr, e);
    }
    const nc = Math.min(t.crossings.length, ref[i].crossings.length);
    for (let c = 0; c < nc; c++) { const e = Math.abs(t.crossings[c] - ref[i].crossings[c]); crossErr = Math.max(crossErr, e); }
  });
  console.log(`stepK=${k} büyüme=${g}: ort. adım ${(sumSteps / samples.length).toFixed(1)}, kader uyuşmazlığı ${mism}, en büyük yön hatası ${(maxErr * 180 / Math.PI * 60).toFixed(2)} yay-dk, disk kesişim r hatası ${crossErr.toFixed(4)} M`);
}
