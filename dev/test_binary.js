// İkili kara delik çekirdeğinin sayısal doğrulaması: node dev/test_binary.js
const B = require('../js/binary.js');

let fails = 0;
function check(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${got.toFixed(5)} (beklenen ${want.toFixed(5)}, tol ${tol})`);
}

// 1) Kalıntı dönüşü ve ışınan enerji — NR değerleri (SPEC)
check('af (q=1, chi=0)', B.finalSpin(0.5, 0.5, 0, 0), 0.686, 0.01);
check('Erad (q=1, chi=0)', B.radiatedEnergy(0.5, 0.5, 0, 0), 0.048, 0.005);
check('af (q=0.5, chi=0)', B.finalSpin(2 / 3, 1 / 3, 0, 0), 0.62, 0.01);
check('Erad (q=0.5, chi=0)', B.radiatedEnergy(2 / 3, 1 / 3, 0, 0), 0.038, 0.005);
check('af (q=0.25, chi=0)', B.finalSpin(0.8, 0.2, 0, 0), 0.47, 0.01);
check('Erad (q=0.25, chi=0)', B.radiatedEnergy(0.8, 0.2, 0, 0), 0.02, 0.005);
// hizalı yüksek dönme: SR ~%9–11 (ã'nın (1+q)² ile normalize edilmesi gerekir)
check('Erad (q=1, chi=0.9 hizalı)', B.radiatedEnergy(0.5, 0.5, 0.9, 0.9), 0.095, 0.015);
{
  const s = B.system({ q: 1, chi1: 0, chi2: 0, a0: 20 });
  check('system remnant.af = finalSpin', s.remnant.af, B.finalSpin(0.5, 0.5, 0, 0), 1e-12);
  check('system remnant.Erad = radiatedEnergy', s.remnant.Erad, B.radiatedEnergy(0.5, 0.5, 0, 0), 1e-12);
  check('system remnant.mf = 1 − Erad', s.remnant.mf, 1 - s.remnant.Erad, 1e-12);
}

// 2) QNM (Berti+ 2006): af = 0 ve eşit kütleli kalıntı (af ≈ 0.686)
{
  const z = B.qnm22(1, 0);
  // Uyum tam (Leaver) değerden ~%1.5 sapar: mf·ω = 0.3683 (tam 0.3737), τ/mf = 11.51 (tam ~11.2)
  check('QNM af=0: mf·ω ≈ 0.3737 (uyum sapması)', z.omega, 0.3737, 0.006);
  check('QNM af=0: τ/mf ≈ 11.3 (uyum sapması)', z.tau, 11.3, 0.25);
  const s = B.system({ q: 1, chi1: 0, chi2: 0, a0: 20 });
  check('QNM af≈0.686: mf·ω ≈ 0.5293', s.remnant.mf * s.qnm.omega, 0.5293, 0.001);
  // SPEC'teki "τ/mf ≈ 11.7" toplam-M birimindeki τ'ya karşılık gelir (τ/mf = 2Q/(mf·ω) ≈ 12.2)
  check('QNM af≈0.686: τ ≈ 11.7 M', s.qnm.tau, 11.7, 0.15);
  const Q = 0.7 + 1.4187 * Math.pow(1 - s.remnant.af, -0.499);
  check('QNM τ = 2Q/ω', s.qnm.tau * s.qnm.omega, 2 * Q, 1e-9);
}

// 3) a(t), φ(t): kapalı biçim ↔ RK4 sayısal integrali (bağıl hata < 1e−6 istenir)
{
  const s = B.system({ q: 0.5, chi1: 0.9, chi2: 0.7, a0: 14 });
  const f = (a, out) => { out[0] = -(64 / 5) * s.nu / (a * a * a); out[1] = Math.pow(a, -1.5); };
  const y = [s.a0, 0], k1 = [0, 0], k2 = [0, 0], k3 = [0, 0], k4 = [0, 0];
  const N = 200000, tEnd = 0.95 * s.tMerge, h = tEnd / N;
  for (let i = 0; i < N; i++) {
    f(y[0], k1);
    f(y[0] + 0.5 * h * k1[0], k2);
    f(y[0] + 0.5 * h * k2[0], k3);
    f(y[0] + h * k3[0], k4);
    y[0] += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y[1] += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  const st = B.state(s, tEnd);
  check('a(t): RK4/kapalı biçim − 1', y[0] / st.sep - 1, 0, 1e-9);
  check('φ(t): RK4/kapalı biçim − 1', y[1] / st.phase - 1, 0, 1e-9);
  check('Ω = a^{−3/2}', st.omega, Math.pow(st.sep, -1.5), 1e-12);
  check('v = Ω·a', st.v, st.omega * st.sep, 1e-12);
  check('fGW = Ω/π', st.fGW, st.omega / Math.PI, 1e-9);
  check('a(0) = a0', B.state(s, 0).sep, s.a0, 1e-12);
  check('φ(0) = 0', B.state(s, 0).phase, 0, 1e-12);
  check('a(tMerge⁻) → aMerge', B.state(s, s.tMerge - 1e-6).sep, s.aMerge, 1e-5);
}

// 4) Kütle merkezi orijinde; |x1 − x2| = a; delik sırası (0 = TON 618)
{
  const s = B.system({ q: 0.5, chi1: 0.9, chi2: 0.7, a0: 14 });
  let maxCom = 0, maxSep = 0;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100 * 0.999 * s.tMerge;
    const st = B.state(s, t);
    const p1 = st.holes[0].pos, p2 = st.holes[1].pos;
    maxCom = Math.max(maxCom, Math.hypot(s.m1 * p1[0] + s.m2 * p2[0], s.m1 * p1[1] + s.m2 * p2[1]));
    maxSep = Math.max(maxSep, Math.abs(Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]) - st.sep));
  }
  check('kütle merkezi sapması', maxCom, 0, 1e-12);
  check('|x1−x2| = a sapması', maxSep, 0, 1e-12);
  const st = B.state(s, 10);
  check('delik 0 kütlesi = m1 (TON 618)', st.holes[0].m, s.m1, 0);
  check('delik 1 kütlesi = m2 (Kerr)', st.holes[1].m, s.m2, 0);
  check('delik 0 ufku rh1', st.holes[0].rh, B.horizonRadius(s.m1, s.chi1), 0);
  check('delik 1 ufku rh2', st.holes[1].rh, B.horizonRadius(s.m2, s.chi2), 0);
}

// 5) h, tMerge'de sürekli (genlik + faz); sonrasında üstel sönümlü
{
  const s = B.system({ q: 0.5, chi1: 0.9, chi2: 0.7, a0: 14 });
  const e = 1e-7, A = 4 * s.nu / s.aMerge;
  const a = B.state(s, s.tMerge - e), b = B.state(s, s.tMerge + e);
  check('|Δh+| @ tMerge', Math.abs(a.hPlus - b.hPlus), 0, 1e-6);
  check('|Δh×| @ tMerge', Math.abs(a.hCross - b.hCross), 0, 1e-6);
  check('|h| @ tMerge⁻ = 4ν/aMerge', Math.hypot(a.hPlus, a.hCross), A, 1e-6);
  check('|h| @ tMerge⁺ = 4ν/aMerge', Math.hypot(b.hPlus, b.hCross), A, 1e-6);
  check('faz sürekliliği @ tMerge', Math.abs(a.phase - b.phase), 0, 1e-6);
  for (const n of [1, 3, 8]) {
    const r = B.state(s, s.tMerge + n * s.qnm.tau);
    check(`|h| @ tMerge + ${n}τ (sönüm)`, Math.hypot(r.hPlus, r.hCross), A * Math.exp(-n), 1e-9);
  }
}

// 6) state() sonlu: t = 0, tMerge, tMerge+10τ, çok sonrası; kalıntı yerinde kalır
{
  const s = B.system({});
  const nf = (v) => {
    if (typeof v === 'number') return isFinite(v) ? 0 : 1;
    if (Array.isArray(v)) return v.reduce((acc, x) => acc + nf(x), 0);
    if (v && typeof v === 'object') return Object.keys(v).reduce((acc, k) => acc + nf(v[k]), 0);
    return 0;
  };
  for (const t of [0, s.tMerge, s.tMerge + 10 * s.qnm.tau, s.tMerge + 1e6]) {
    check(`state(t = ${t.toExponential(2)}) sonlu değerler`, nf(B.state(s, t)), 0, 0);
  }
  const r = B.state(s, s.tMerge + 1e4);
  check('birleşme sonrası delik sayısı', r.holes.length, 1, 0);
  check('kalıntı kütlesi', r.holes[0].m, s.remnant.mf, 0);
  check('kalıntı dönüşü', r.holes[0].chi, s.remnant.af, 0);
  check('kalıntı orijinde', Math.hypot(r.holes[0].pos[0], r.holes[0].pos[1], r.holes[0].pos[2]), 0, 0);
  check('kalıntı ufku', r.holes[0].rh, B.horizonRadius(s.remnant.mf, s.remnant.af), 0);
  check('tToMerger = 0 (sonra)', r.tToMerger, 0, 0);
  check('fGW = ω/2π (sonra)', r.fGW, r.omega / (2 * Math.PI), 1e-12);
  console.log(`  varsayılan sistem: aMerge=${s.aMerge.toFixed(3)}, tMerge=${s.tMerge.toFixed(1)}, af=${s.remnant.af.toFixed(4)}, mf=${s.remnant.mf.toFixed(4)}, ω=${s.qnm.omega.toFixed(4)}, τ=${s.qnm.tau.toFixed(2)}`);
}

// 7) Varsayılanlar, giriş kırpma, sabitler
{
  const d = B.system({});
  check('varsayılan q', d.q, 0.5, 0);
  check('varsayılan chi1', d.chi1, 0.9, 0);
  check('varsayılan chi2', d.chi2, 0.7, 0);
  check('varsayılan a0', d.a0, 14, 0);
  check('m1 + m2 = 1', d.m1 + d.m2, 1, 1e-12);
  check('SEC_PER_MSUN', B.SEC_PER_MSUN, 4.925490947e-6, 0);
  check('horizonRadius(1, 0) = 2', B.horizonRadius(1, 0), 2, 1e-12);
  check('horizonRadius(1, 0.6) = 1.8', B.horizonRadius(1, 0.6), 1.8, 1e-12);
  const c = B.system({ q: 5, chi1: 2, chi2: -3, a0: 0.5 });
  check('q → [0.1, 1]', c.q, 1, 0);
  check('chi1 → [0, 0.998]', c.chi1, 0.998, 0);
  check('chi2 → [0, 0.998]', c.chi2, 0, 0);
  check('a0 alt sınırı 1.5·aMerge', c.a0, 1.5 * c.aMerge, 1e-12);
  check('tMerge > 0', c.tMerge > 0 ? 1 : 0, 1, 0);
  check('a0 üst sınırı 60', B.system({ q: 0.1, a0: 1e4 }).a0, 60, 0);
}

// 8) strainSeries: boyut, uç noktalar, değerler state() ile aynı
{
  const s = B.system({});
  const n = 512, t0 = 0, t1 = s.tMerge + 8 * s.qnm.tau;
  const w = B.strainSeries(s, t0, t1, n);
  check('t dizisi uzunluğu', w.t.length, n, 0);
  check('h dizisi uzunluğu', w.h.length, n, 0);
  check('t[0] = t0', w.t[0], t0, 1e-6);
  check('t[n−1] = t1 (float32)', w.t[n - 1], t1, 1e-3);
  const dt = (t1 - t0) / (n - 1);
  let bad = 0, maxd = 0;
  for (let i = 0; i < n; i++) {
    const hp = B.state(s, t0 + i * dt).hPlus;
    maxd = Math.max(maxd, Math.abs(hp - w.h[i]));
    if (!isFinite(w.h[i])) bad++;
  }
  check('h(i) = state(t).h+ (float32)', maxd, 0, 1e-6);
  check('h değerleri sonlu', bad, 0, 0);
}

console.log(fails ? `\n${fails} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fails ? 1 : 0);
