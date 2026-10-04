// Fizik çekirdeğinin sayısal doğrulaması: node dev/test_physics.js
const P = require('../js/physics.js');

function H(X, Pv, Pt, a) {
  const gi = P.invMetric(X, a);
  const p = [Pt, Pv[0], Pv[1], Pv[2]];
  let s = 0;
  for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) s += gi[m * 4 + n] * p[m] * p[n];
  return 0.5 * s;
}

// Işını izle; 'capture' | 'escape'
function trace(X0, P0, Pt, a, stepK = 0.02, maxSteps = 200000, outside = true) {
  const s = new Float64Array([X0[0], X0[1], X0[2], P0[0], P0[1], P0[2], 0]);
  const rh = P.horizon(a);
  const d = new Float64Array(7);
  for (let i = 0; i < maxSteps; i++) {
    const r = P.kerrR(s[0], s[1], s[2], a);
    P.deriv([s[0], s[1], s[2]], [s[3], s[4], s[5]], Pt, a, d);
    const v = Math.hypot(d[0], d[1], d[2]);
    if (outside && r < rh + 0.01) return { res: 'capture', s, i };
    if (r > 3000 && (s[0] * d[0] + s[1] * d[1] + s[2] * d[2]) > 0) return { res: 'escape', s, i, dir: [d[0] / v, d[1] / v, d[2] / v] };
    const h = stepK * Math.max(r, 0.5) / v;
    P.rk4(s, Pt, a, h);
  }
  return { res: 'maxsteps', s };
}

let fails = 0;
function check(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${got.toFixed(5)} (beklenen ${want.toFixed(5)}, tol ${tol})`);
}

// 1) Null koşulunun korunması
{
  const a = 0.9;
  const X = [-40, 4.0, 1.5];
  // düz uzaya yakın başlangıç; null normalize et: p_t = -1, uzaysal yönü H=0 olacak şekilde ölçekle
  let dir = [1, 0.02, -0.01];
  // H(λ p⃗) = 0 çöz: ikinci derece denklem
  const f = (lam) => H(X, dir.map(v => v * lam), -1, a);
  let lo = 0.1, hi = 5;
  for (let i = 0; i < 100; i++) { const m = 0.5 * (lo + hi); if (f(m) > 0) hi = m; else lo = m; }
  const Pv = dir.map(v => v * 0.5 * (lo + hi));
  const H0 = H(X, Pv, -1, a);
  const s = new Float64Array([...X, ...Pv, 0]);
  const d = new Float64Array(7);
  let maxH = 0;
  for (let i = 0; i < 3000; i++) {
    const r = P.kerrR(s[0], s[1], s[2], a);
    if (r < P.horizon(a) + 0.01 || r > 200) break;
    P.deriv([s[0], s[1], s[2]], [s[3], s[4], s[5]], -1, a, d);
    const v = Math.hypot(d[0], d[1], d[2]);
    P.rk4(s, -1, a, 0.05 * r / v);
    maxH = Math.max(maxH, Math.abs(H([s[0], s[1], s[2]], [s[3], s[4], s[5]], -1, a)));
  }
  check('null kısıtı sapması |H|', maxH, 0, 1e-4);
  check('başlangıç H', H0, 0, 1e-9);
}

// 2) Ekvatoral kritik etki parametresi (ileri zamanda, uzaktan gelen foton)
function critB(a, prograde) {
  // foton +x yönünde, y = ∓b konumunda: L = x p_y − y p_x = −y (p_x=1)
  // ileri yönlü (prograde, L>0) için y = −b
  let lo = 1, hi = 10;
  for (let it = 0; it < 40; it++) {
    const b = 0.5 * (lo + hi);
    const y = prograde ? -b : b;
    const R = trace([-2000, y, 0], [1, 0, 0], -1, a, 0.01);
    if (R.res === 'capture') lo = b; else hi = b;
  }
  return 0.5 * (lo + hi);
}
for (const a of [0, 0.5, 0.9, 0.99]) {
  check(`kritik b (a=${a}, ileri)`, critB(a, true), P.criticalImpact(a, true), 0.02);
  check(`kritik b (a=${a}, geri)`, critB(a, false), P.criticalImpact(a, false), 0.02);
}

// 3) Durağan kamera + tetrad + geriye izleme: Schwarzschild gölge açısı
function shadowEdge(a, ro, incl, sideSign) {
  // kamera x ekseninde değil; genel: konum (küresel)
  const th = incl, ph = 0;
  const rr = ro;
  const X = [Math.sqrt(rr * rr + a * a) * Math.sin(th) * Math.cos(ph), Math.sqrt(rr * rr + a * a) * Math.sin(th) * Math.sin(ph), rr * Math.cos(th)];
  const u = P.staticObserver(X, a);
  const n = Math.hypot(...X);
  const fwd = X.map(v => -v / n);
  const up = [0, 0, 1];
  const T = P.cameraTetrad(X, u, fwd, up, a);
  // yatay eksende açı ara: d = (sin α, 0, cos α)
  let lo = 0, hi = 0.8;
  for (let it = 0; it < 40; it++) {
    const al = 0.5 * (lo + hi);
    const d = [sideSign * Math.sin(al), 0, Math.cos(al)];
    const q = [0, 1, 2, 3].map(i => T.Q0[i] + d[0] * T.Q1[i] + d[1] * T.Q2[i] + d[2] * T.Q3[i]);
    const sc = 1 / q[0];
    const R = trace(X, [q[1] * sc, q[2] * sc, q[3] * sc], 1, a, 0.01);
    if (R.res === 'capture') lo = al; else hi = al;
  }
  return 0.5 * (lo + hi);
}
{
  for (const ro of [10, 30]) {
    const al = shadowEdge(0, ro, Math.PI / 2, 1);
    const want = Math.asin(3 * Math.sqrt(3) / ro * Math.sqrt(1 - 2 / ro));
    check(`Schwarzschild gölge yarıçapı r_o=${ro} (rad)`, al, want, 2e-4);
  }
  // Kerr, uzak gözlemci, ekvatoral bakış: gölge kenarları ≈ b_crit / r_o
  const a = 0.9, ro = 2000;
  const aR = shadowEdge(a, ro, Math.PI / 2, 1) * ro;
  const aL = shadowEdge(a, ro, Math.PI / 2, -1) * ro;
  console.log(`Kerr a=0.9 uzak gözlemci gölge kenarları: sağ ${aR.toFixed(3)}, sol ${aL.toFixed(3)}  (ileri ${P.criticalImpact(a, true).toFixed(3)}, geri ${P.criticalImpact(a, false).toFixed(3)})`);
  const lo = Math.min(aR, aL), hi = Math.max(aR, aL);
  check('Kerr gölge (yakın kenar = ileri yönlü)', lo, P.criticalImpact(a, true), 0.03);
  check('Kerr gölge (uzak kenar = geri yönlü)', hi, P.criticalImpact(a, false), 0.03);
}

// 4) Karakteristik yarıçaplar
check('ISCO a=0', P.isco(0), 6, 1e-9);
check('ISCO a=0.9', P.isco(0.9), 2.32088, 1e-4);
check('foton yörüngesi a=0.9 ileri', P.photonOrbit(0.9, true), 1.55785, 1e-4);

// 5) Disk sıcaklık profili: a=0 için tepe noktası ≈ (49/36) r_isco (Newton sınırı değil, GR ile biraz farklı)
{
  const prof = P.diskTemperatureProfile(0, 40, 256);
  console.log(`NT profili a=0: r_in=${prof.rin.toFixed(3)} r_peak=${prof.rPeak.toFixed(3)} (Newton: ${(49 / 36 * 6).toFixed(3)})`);
  const prof9 = P.diskTemperatureProfile(0.9, 40, 256);
  console.log(`NT profili a=0.9: r_in=${prof9.rin.toFixed(3)} r_peak=${prof9.rPeak.toFixed(3)}`);
}

// 6) Serbest düşüş: ufku geçer mi, özzaman
{
  const a = 0;
  const X = [20, 0, 0.0];
  const u = P.staticObserver(X, a);
  const g = P.metric(X, a).g;
  const Pl = P.lower(g, u);
  const s = new Float64Array([X[0], X[1], X[2], Pl[1], Pl[2], Pl[3], 0]);
  let tau = 0, crossed = null;
  const d = new Float64Array(7);
  for (let i = 0; i < 200000; i++) {
    const r = P.kerrR(s[0], s[1], s[2], a);
    if (crossed === null && r < 2) crossed = tau;
    if (r < 0.05) break;
    P.deriv([s[0], s[1], s[2]], [s[3], s[4], s[5]], Pl[0], a, d);
    const h = 0.002 * Math.max(r, 0.05);
    P.rk4(s, Pl[0], a, h);
    tau += h;
  }
  // Durgun halden r0'dan düşüş: τ(r0→0) = π/2 · r0^{3/2} / √2  (Schwarzschild, M=1)
  const r0 = 20;
  check('serbest düşüş özzamanı r0→0', tau, Math.PI / 2 * Math.pow(r0, 1.5) / Math.sqrt(2), 0.05);
  console.log(`  ufuk geçişi τ=${crossed.toFixed(3)}`);
}

console.log(fails ? `\n${fails} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fails ? 1 : 0);
