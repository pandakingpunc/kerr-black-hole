// Kaçan ışınlarda |q| en çok ne kadar büyüyor? (yakalama eşiği için)
const P = require('../js/physics.js');
function run(a, R, incl, limitQ) {
  const th = incl * Math.PI / 180, ph = 0.66;
  const rr = Math.sqrt(R * R + a * a);
  const X = [rr * Math.sin(th) * Math.cos(ph), rr * Math.sin(th) * Math.sin(ph), R * Math.cos(th)];
  const u = P.staticObserver(X, a);
  const n = Math.hypot(...X);
  const T = P.cameraTetrad(X, u, X.map(v => -v / n), [0, 0, 1], a);
  const rh = P.horizon(a);
  let maxEsc = 0, stats = { esc: 0, cap: 0, max: 0, qcap: 0 };
  const N = 220, span = Math.asin(Math.min(1, 7.5 / R)) * 1.3;
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const dl = [Math.tan(span) * (2 * ix / (N - 1) - 1), Math.tan(span) * (2 * iy / (N - 1) - 1), 1];
    const l = Math.hypot(...dl);
    const q = [0, 1, 2, 3].map(i => T.Q0[i] + dl[0] / l * T.Q1[i] + dl[1] / l * T.Q2[i] + dl[2] / l * T.Q3[i]);
    const s = 1 / q[0];
    const st = new Float64Array([...X, q[1] * s, q[2] * s, q[3] * s, 0]);
    const dv = new Float64Array(7);
    let qmax = 0, fate = 'max';
    for (let i = 0; i < 800; i++) {
      const r = P.kerrR(st[0], st[1], st[2], a);
      P.deriv([st[0], st[1], st[2]], [st[3], st[4], st[5]], 1, a, dv);
      let ds = 0.065 * Math.max(r, 0.8) * Math.min(Math.max(r * 0.14, 1), 3.5);
      ds = Math.min(ds, Math.max(0.6 * (r - rh), 0.035) + 0.02 * r);
      let h = ds / Math.hypot(dv[0], dv[1], dv[2]);
      if (limitQ) { const qq = Math.hypot(st[3], st[4], st[5]), dq = Math.hypot(dv[3], dv[4], dv[5]); h = Math.min(h, 0.1 * qq / Math.max(dq, 1e-9)); }
      P.rk4(st, 1, a, h);
      const rn = P.kerrR(st[0], st[1], st[2], a);
      const qm = Math.hypot(st[3], st[4], st[5]);
      qmax = Math.max(qmax, qm);
      if (rn < rh * 1.01 + 0.005) { fate = 'cap'; break; }
      if (limitQ && qm > 60) { fate = 'qcap'; break; }
      P.deriv([st[0], st[1], st[2]], [st[3], st[4], st[5]], 1, a, dv);
      if (rn > 90 && (st[0] * dv[0] + st[1] * dv[1] + st[2] * dv[2]) > 0) { fate = 'esc'; break; }
    }
    if (fate === 'esc') { stats.esc++; stats.max = Math.max(stats.max, qmax); }
    else if (fate === 'cap') stats.cap++; else if (fate === 'qcap') stats.qcap++;
    else stats.maxsteps = (stats.maxsteps || 0) + 1;
  }
  console.log(`a=${a} R=${R} i=${incl} limitQ=${limitQ}:`, JSON.stringify(stats));
}
for (const lim of [false, true]) { run(0.99, 22, 87, lim); run(0.9, 28, 82, lim); run(0.0, 20, 60, lim); run(0.998, 12, 30, lim); }
