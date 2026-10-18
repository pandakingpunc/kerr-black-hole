/*
 * İkili kara delik fiziği (G = c = M_toplam = 1, geometrik birimler)
 *
 * Delik 1 = TON 618 (ağır): m1 = 1/(1+q);  delik 2 = Kerr: m2 = q/(1+q).
 * q = m2/m1 ∈ [0.1, 1]; ν = m1 m2 (simetrik kütle oranı). Dönmeler +z ile
 * hizalı, yörünge z = 0 düzleminde (+z'den saat yönünün tersine), kütle
 * merkezi orijinde. Uzunluk ve zamanlar M biriminde.
 *
 * İlham: yuvarlak yörünge, baş-mertebe Peters sönümü
 *   da/dt = −(64/5) ν / a³  →  a(t) = (a0⁴ − (256/5) ν t)^{1/4}
 *   Ω = a^{−3/2} (Kepler),  φ(t) = (a0^{5/2} − a^{5/2}) / (32ν)   (tam integral)
 * Birleşme a = aMerge = rh1 + rh2'de (dış ufuklar). Kalıntı: Rezzalla+ 2008
 * (af) ve Barausse–Morozova–Rezzolla 2012 (Erad) uyumları; sönme l = m = 2,
 * n = 0 kuasinormal modu (Berti+ 2006). h+ + i h× = (4ν/a) e^{2iφ} (ilham)
 * → A e^{−Δt/τ} e^{i(ωΔt + 2φ_b)} (sönme); genlik ve faz kesintisiz.
 * KerrPhysics'e bağımlılık yok (yükleme sırası garanti değil): ISCO enerjisi
 * Bardeen–Press–Teukolsky formülüyle burada da var.
 */
(function (root) {
  'use strict';

  const SEC_PER_MSUN = 4.925490947e-6;              // GM☉/c³ [s]
  // Rezzalla+ 2008 son-dönme uyumu
  const S4 = -0.1229, S5 = 0.4537, T0 = -2.8904, T2 = -3.5171, T3 = 2.5763;
  // Barausse+ 2012 ışınan-enerji uyumu
  const P0 = 0.04827, P1 = 0.01707;

  function num(v, dflt) { const x = +v; return isFinite(x) ? x : dflt; }
  function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

  // İleri yönlü ISCO yarıçapı (Bardeen–Press–Teukolsky), |a| ≤ 1
  function iscoRadius(a) {
    const s = a < 0 ? -1 : 1;
    const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
    const z2 = Math.sqrt(3 * a * a + z1 * z1);
    return 3 + z2 - s * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  }

  // ISCO'daki dairesel yörüngenin özgül enerjisi (M = 1)
  function iscoEnergy(a) {
    const r = iscoRadius(a);
    const sr = Math.sqrt(r), r15 = r * sr;
    const den = Math.pow(r, 0.75) * Math.sqrt(r15 - 3 * sr + 2 * a);
    return (r15 - 2 * sr + a) / den;
  }

  // Dış ufuk yarıçapı: rh = m (1 + √(1 − χ²))
  function horizonRadius(m, chi) {
    const c = clamp(num(chi, 0), -1, 1);
    return num(m, 0) * (1 + Math.sqrt(1 - c * c));
  }

  /*
   * Kalıntı uyumlarının ortak büyüklükleri. Kütleler ağır → hafif sıralı
   * (uyum etki alanı qq = m2/m1 ≤ 1), ν = m1 m2/(m1+m2)², ã = dönme karışımı.
   */
  function remnantParams(m1, m2, chi1, chi2) {
    m1 = num(m1, 0); m2 = num(m2, 0);
    chi1 = num(chi1, 0); chi2 = num(chi2, 0);
    if (m2 > m1) { const tm = m1, tc = chi1; m1 = m2; m2 = tm; chi1 = chi2; chi2 = tc; }
    const qq = m1 > 0 ? m2 / m1 : 0;
    const M = m1 + m2;
    const nu = M > 0 ? m1 * m2 / (M * M) : 0;
    const ah = clamp((chi1 + chi2 * qq * qq) / (1 + qq * qq), -0.9999, 0.9999);
    return { nu, ah };
  }

  // Kalıntı dönüşü (Rezzalla+ 2008)
  function finalSpin(m1, m2, chi1, chi2) {
    const { nu, ah } = remnantParams(m1, m2, chi1, chi2);
    const af = ah + ah * nu * (S4 * ah + S5 * nu + T0) + nu * (2 * Math.sqrt(3) + T2 * nu + T3 * nu * nu);
    return clamp(af, -0.9999, 0.9999);
  }

  // Işınan enerji kesri (Barausse–Morozova–Rezzolla 2012, hizalanmış dönme)
  function radiatedEnergy(m1, m2, chi1, chi2) {
    const { nu } = remnantParams(m1, m2, chi1, chi2);
    // BMR 2012'de ã = (χ₁ + χ₂q²)/(1+q)² (dönme formülündeki (1+q²) değil)
    if (m2 > m1) { const tm = m1, tc = chi1; m1 = m2; m2 = tm; chi1 = chi2; chi2 = tc; }
    const qq = m1 > 0 ? m2 / m1 : 0;
    const ah = clamp((chi1 + chi2 * qq * qq) / ((1 + qq) * (1 + qq)), -0.9999, 0.9999);
    const Ei = iscoEnergy(ah);   // ISCO özgül enerjisi (dönme ã)
    return clamp((1 - Ei) * nu + 4 * nu * nu * (4 * P0 + 16 * P1 * ah * (ah + 1) + Ei - 1), 0, 0.5);
  }

  // l = m = 2, n = 0 kuasinormal modu (Berti+ 2006); ω [1/M], τ [M], toplam kütle birimi
  function qnm22(mf, af) {
    mf = Math.max(1e-9, num(mf, 1));
    af = clamp(num(af, 0), 0, 0.9999);
    const x = 1 - af;
    const w = (1.5251 - 1.1568 * Math.pow(x, 0.1292)) / mf;   // mf·ω = 1.5251 − 1.1568(1−af)^0.1292
    const Q = 0.7 + 1.4187 * Math.pow(x, -0.499);              // kalite; τ = 2Q/ω
    return { omega: w, tau: 2 * Q / w };
  }

  /*
   * Sistem: q ∈ [0.1, 1], chi ∈ [0, 0.998], a0 ∈ [1.5·aMerge, 60] (kırpılır).
   */
  function system(opts) {
    opts = opts || {};
    const q = clamp(num(opts.q, 0.5), 0.1, 1);
    const chi1 = clamp(num(opts.chi1, 0.9), 0, 0.998);
    const chi2 = clamp(num(opts.chi2, 0.7), 0, 0.998);
    const m1 = 1 / (1 + q), m2 = q / (1 + q);
    const nu = m1 * m2;
    const rh1 = horizonRadius(m1, chi1), rh2 = horizonRadius(m2, chi2);
    const aMerge = rh1 + rh2;
    const a0 = clamp(num(opts.a0, 14), 1.5 * aMerge, 60);
    const tMerge = (a0 * a0 * a0 * a0 - aMerge * aMerge * aMerge * aMerge) / ((256 / 5) * nu);
    const af = finalSpin(m1, m2, chi1, chi2);
    const Erad = radiatedEnergy(m1, m2, chi1, chi2);
    const mf = 1 - Erad;
    return { q, m1, m2, nu, chi1, chi2, a0, rh1, rh2, aMerge, tMerge,
      remnant: { mf, af, Erad }, qnm: qnm22(mf, af) };
  }

  /*
   * t anındaki durum (her karede çağrılır — kapalı biçim, ucuz). t ≥ 0.
   * Birleşmeden önce 2 delik; sonra orijinde tek kalıntı + halkalı sönme.
   */
  function state(sys, t) {
    t = Math.max(0, num(t, 0));
    const nu = sys.nu;
    if (t < sys.tMerge) {
      const a4 = sys.a0 * sys.a0 * sys.a0 * sys.a0 - (256 / 5) * nu * t;
      const a = Math.pow(a4 > 0 ? a4 : 1e-12, 0.25);
      const om = 1 / (a * Math.sqrt(a));                                   // Ω = a^{−3/2}
      const ph = (Math.pow(sys.a0, 2.5) - Math.pow(a, 2.5)) / (32 * nu);   // tam integral
      const c2 = Math.cos(2 * ph), s2 = Math.sin(2 * ph);
      const cp = Math.cos(ph), sp = Math.sin(ph);
      const hA = 4 * nu / a;
      const d1 = sys.m2 * a, d2 = sys.m1 * a;
      return {
        t, merged: false, sep: a, phase: ph, omega: om, v: om * a,
        fGW: om / Math.PI, hPlus: hA * c2, hCross: hA * s2,
        holes: [
          { m: sys.m1, chi: sys.chi1, pos: [d1 * cp, d1 * sp, 0], rh: sys.rh1 },
          { m: sys.m2, chi: sys.chi2, pos: [-d2 * cp, -d2 * sp, 0], rh: sys.rh2 }
        ],
        tToMerger: sys.tMerge - t
      };
    }
    // birleşme sonrası: h+ + i h× = A e^{−Δt/τ} e^{i(ωΔt + 2φ_b)}, A = 4ν/aMerge
    const dt = t - sys.tMerge;
    const phM = (Math.pow(sys.a0, 2.5) - Math.pow(sys.aMerge, 2.5)) / (32 * nu);
    const A = 4 * nu / sys.aMerge;
    const env = Math.exp(-dt / sys.qnm.tau);
    const ang = sys.qnm.omega * dt + 2 * phM;
    const { mf, af } = sys.remnant;
    return {
      t, merged: true, sep: 0, phase: phM, omega: sys.qnm.omega, v: 0,
      fGW: sys.qnm.omega / (2 * Math.PI),
      hPlus: A * env * Math.cos(ang), hCross: A * env * Math.sin(ang),
      holes: [{ m: mf, chi: af, pos: [0, 0, 0], rh: horizonRadius(mf, af) }],
      tToMerger: 0
    };
  }

  // h+ zaman serisi (grafik için): n nokta, t0..t1 dahil
  function strainSeries(sys, t0, t1, n) {
    n = Math.max(0, Math.floor(num(n, 0)));
    const T = new Float32Array(n), H = new Float32Array(n);
    if (n > 0) {
      t0 = num(t0, 0); t1 = num(t1, t0);
      const dt = n > 1 ? (t1 - t0) / (n - 1) : 0;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * dt;
        T[i] = t;
        H[i] = state(sys, t).hPlus;
      }
    }
    return { t: T, h: H };
  }

  const api = {
    system, state, strainSeries, finalSpin, radiatedEnergy, qnm22, horizonRadius,
    SEC_PER_MSUN
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BinaryPhysics = api;
})(typeof window !== 'undefined' ? window : this);
