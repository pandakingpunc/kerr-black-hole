/*
 * Kerr kara deliği fiziği (G = c = M = 1, geometrik birimler)
 *
 * Koordinatlar: Kartezyen Kerr-Schild (x, y, z), dönme ekseni +z.
 *   g_{μν} = η_{μν} + f k_μ k_ν
 *   k_μ    = (1, (r x + a y)/(r²+a²), (r y − a x)/(r²+a²), z/r)
 *   f      = 2 r³ / (r⁴ + a² z²)
 * Bu koordinatlar olay ufkunda tekil değildir; kamera ufkun içine düşebilir.
 *
 * Jeodezikler Hamilton biçiminde çözülür: H = ½ g^{μν} p_μ p_ν,
 * dx/dλ = ∂H/∂p,  dp/dλ = −∂H/∂x (analitik türevlerle).
 * Aynı türev fonksiyonu GLSL ışın izleyicide birebir kullanılır.
 */
(function (root) {
  'use strict';

  function kerrR(x, y, z, a) {
    const a2 = a * a;
    const w = x * x + y * y + z * z - a2;
    return Math.sqrt(0.5 * (w + Math.sqrt(w * w + 4 * a2 * z * z)));
  }

  /*
   * Hamilton türevleri. X = [x,y,z], P = [p_x,p_y,p_z] (kovaryant), Pt = p_t (korunur).
   * Dönüş: [dx, dy, dz, dpx, dpy, dpz, dt]  (dt = dt/dλ)
   */
  function deriv(X, P, Pt, a, out) {
    const x = X[0], y = X[1], z = X[2];
    const px = P[0], py = P[1], pz = P[2];
    const a2 = a * a, z2 = z * z;
    const w = x * x + y * y + z2 - a2;
    const r2 = 0.5 * (w + Math.sqrt(w * w + 4 * a2 * z2));
    const r = Math.sqrt(r2);
    const Dn = r2 * r2 + a2 * z2;
    const iDn = 1 / Dn;
    const A = r2 + a2;
    const iA = 1 / A;
    // ∇r
    const grx = x * r2 * r * iDn, gry = y * r2 * r * iDn, grz = z * r * A * iDn;
    // k (uzaysal)
    const kx = (r * x + a * y) * iA, ky = (r * y - a * x) * iA, kz = z / r;
    const f = 2 * r2 * r * iDn;
    // ∇f = 2 r²/Dn² [ (3a²z² − r⁴) ∇r − 2a² r z ẑ ]
    const cf = 2 * r2 * iDn * iDn;
    const m = 3 * a2 * z2 - r2 * r2;
    const gfx = cf * m * grx, gfy = cf * m * gry, gfz = cf * (m * grz - 2 * a2 * r * z);
    const kp = kx * px + ky * py + kz * pz;
    const S = kp - Pt; // k^μ p_μ  (k^t = −1)
    const c = (x * px + y * py - 2 * r * (kx * px + ky * py)) * iA - z * pz / r2;
    const gkx = c * grx + (r * px - a * py) * iA;
    const gky = c * gry + (a * px + r * py) * iA;
    const gkz = c * grz + pz / r;
    const fS = f * S;
    out = out || new Float64Array(7);
    out[0] = px - fS * kx;
    out[1] = py - fS * ky;
    out[2] = pz - fS * kz;
    out[3] = 0.5 * S * S * gfx + fS * gkx;
    out[4] = 0.5 * S * S * gfy + fS * gky;
    out[5] = 0.5 * S * S * gfz + fS * gkz;
    out[6] = -Pt + fS; // dt/dλ = g^{tt}p_t + g^{ti}p_i
    return out;
  }

  // Tek RK4 adımı; state = [x,y,z,px,py,pz,t]
  const _k1 = new Float64Array(7), _k2 = new Float64Array(7), _k3 = new Float64Array(7), _k4 = new Float64Array(7);
  const _X = [0, 0, 0], _P = [0, 0, 0];
  function rk4(s, Pt, a, h) {
    const d = (st, o, k) => {
      _X[0] = st[0] + o * (k ? k[0] : 0); _X[1] = st[1] + o * (k ? k[1] : 0); _X[2] = st[2] + o * (k ? k[2] : 0);
      _P[0] = st[3] + o * (k ? k[3] : 0); _P[1] = st[4] + o * (k ? k[4] : 0); _P[2] = st[5] + o * (k ? k[5] : 0);
    };
    d(s, 0, null); deriv(_X, _P, Pt, a, _k1);
    d(s, 0.5 * h, _k1); deriv(_X, _P, Pt, a, _k2);
    d(s, 0.5 * h, _k2); deriv(_X, _P, Pt, a, _k3);
    d(s, h, _k3); deriv(_X, _P, Pt, a, _k4);
    for (let i = 0; i < 7; i++) s[i] += h / 6 * (_k1[i] + 2 * _k2[i] + 2 * _k3[i] + _k4[i]);
    return s;
  }

  // Metrik tensör g_{μν} (4x4, satır-öncelikli dizi)
  function metric(X, a) {
    const x = X[0], y = X[1], z = X[2];
    const r = kerrR(x, y, z, a);
    const r2 = r * r, a2 = a * a;
    const f = 2 * r2 * r / (r2 * r2 + a2 * z * z);
    const A = r2 + a2;
    const k = [1, (r * x + a * y) / A, (r * y - a * x) / A, z / r];
    const g = new Float64Array(16);
    for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) {
      g[m * 4 + n] = (m === n ? (m === 0 ? -1 : 1) : 0) + f * k[m] * k[n];
    }
    return { g, f, r, k };
  }
  // Ters metrik g^{μν} = η^{μν} − f k^μ k^ν,  k^μ = (−1, k⃗)
  function invMetric(X, a) {
    const M = metric(X, a);
    const ku = [-1, M.k[1], M.k[2], M.k[3]];
    const gi = new Float64Array(16);
    for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) {
      gi[m * 4 + n] = (m === n ? (m === 0 ? -1 : 1) : 0) - M.f * ku[m] * ku[n];
    }
    return gi;
  }
  function lower(g, v) {
    const o = [0, 0, 0, 0];
    for (let m = 0; m < 4; m++) { let s = 0; for (let n = 0; n < 4; n++) s += g[m * 4 + n] * v[n]; o[m] = s; }
    return o;
  }
  function dot4(g, A, B) {
    let s = 0;
    for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) s += A[m] * g[m * 4 + n] * B[n];
    return s;
  }

  /*
   * Kamera tetradı (yerel ortonormal çerçeve).
   * u: kameranın 4-hızı (kontravaryant). fwd, up: uzaysal koordinat yönleri.
   * Dönüş: Q0 = lower(−u), Q1 = lower(e_sağ), Q2 = lower(e_yukarı), Q3 = lower(e_ileri)
   * Işın izleyici q_μ = Q0 + d_x Q1 + d_y Q2 + d_z Q3 kullanır (geriye doğru izlenen,
   * geçmişe yönelik foton momentumu; normalize edilince q_t = +1).
   */
  function cameraTetrad(X, u, fwd, up, a) {
    const { g } = metric(X, a);
    const proj = (v, basis) => {
      let w = v.slice();
      for (const b of basis) {
        const bb = dot4(g, b, b);
        const c = dot4(g, w, b) / bb;
        for (let i = 0; i < 4; i++) w[i] -= c * b[i];
      }
      const n = Math.sqrt(Math.abs(dot4(g, w, w)));
      for (let i = 0; i < 4; i++) w[i] /= n;
      return w;
    };
    const F = [0, fwd[0], fwd[1], fwd[2]];
    const U = [0, up[0], up[1], up[2]];
    const rgt = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]];
    const R = [0, rgt[0], rgt[1], rgt[2]];
    const eF = proj(F, [u]);
    const eU = proj(U, [u, eF]);
    const eR = proj(R, [u, eF, eU]);
    const mu = [-u[0], -u[1], -u[2], -u[3]];
    return {
      Q0: lower(g, mu), Q1: lower(g, eR), Q2: lower(g, eU), Q3: lower(g, eF),
      eF, eU, eR, g
    };
  }

  // Durağan gözlemcinin 4-hızı (ergosferin dışında geçerli)
  function staticObserver(X, a) {
    const { f } = metric(X, a);
    const gtt = -1 + f;
    if (gtt >= 0) return null;
    return [1 / Math.sqrt(-gtt), 0, 0, 0];
  }

  // Kovaryant momentumdan 4-hız: u^μ = g^{μν} u_ν
  function raise(X, Pmu, a) {
    const gi = invMetric(X, a);
    const o = [0, 0, 0, 0];
    for (let m = 0; m < 4; m++) { let s = 0; for (let n = 0; n < 4; n++) s += gi[m * 4 + n] * Pmu[n]; o[m] = s; }
    return o;
  }

  // Karakteristik yarıçaplar
  function horizon(a) { return 1 + Math.sqrt(Math.max(0, 1 - a * a)); }
  function innerHorizon(a) { return 1 - Math.sqrt(Math.max(0, 1 - a * a)); }
  function isco(a) {
    const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
    const z2 = Math.sqrt(3 * a * a + z1 * z1);
    return 3 + z2 - Math.sign(a || 1) * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  }
  function photonOrbit(a, prograde) {
    return 2 * (1 + Math.cos(2 / 3 * Math.acos(prograde ? -a : a)));
  }
  // Ekvator düzlemindeki kritik etki parametresi (uzak gözlemci)
  function criticalImpact(a, prograde) {
    return prograde ? (-a + 6 * Math.cos(Math.acos(-a) / 3)) : (a + 6 * Math.cos(Math.acos(a) / 3));
  }

  // Dairesel ekvatoral yörünge (ileri yönlü) büyüklükleri
  function circular(r, a) {
    const sr = Math.sqrt(r), r15 = r * sr;
    const den = Math.pow(r, 0.75) * Math.sqrt(r15 - 3 * sr + 2 * a);
    return {
      E: (r15 - 2 * sr + a) / den,
      L: (r * r - 2 * a * sr + a * a) / den,
      Om: 1 / (r15 + a),
      ut: (r15 + a) / den
    };
  }

  /*
   * Novikov–Thorne / Page–Thorne ince disk akısı (Kerr, sıfır iç tork).
   * F(r) ∝ −Ω'(r) / (r (E − ΩL)²) ∫_{r_isco}^{r} (E − ΩL) L'(r) dr
   * Sıcaklık T ∝ F^{1/4}; en yüksek değere göre normalize edilmiş tablo döner.
   * Tablo log-uzaylı: u = ln(r/r_isco) / ln(rMax/r_isco).
   */
  function diskTemperatureProfile(a, rMax, N) {
    const rin = isco(a);
    const lnR = Math.log(rMax / rin);
    const fine = 4096;
    const rs = new Float64Array(fine + 1);
    const integ = new Float64Array(fine + 1);
    const F = new Float64Array(fine + 1);
    const EmOL = (r) => { const c = circular(r, a); return c.E - c.Om * c.L; };
    const Lr = (r) => circular(r, a).L;
    const dL = (r) => { const h = 1e-5 * r; return (Lr(r + h) - Lr(r - h)) / (2 * h); };
    const dOm = (r) => { const sr = Math.sqrt(r); const d = r * sr + a; return -1.5 * sr / (d * d); };
    let acc = 0;
    let prevR = rin, prevI = EmOL(rin) * dL(rin);
    rs[0] = rin; integ[0] = 0;
    for (let i = 1; i <= fine; i++) {
      const r = rin * Math.exp(lnR * i / fine);
      const I = EmOL(r) * dL(r);
      const mid = 0.5 * (prevR + r);
      const Im = EmOL(mid) * dL(mid);
      acc += (r - prevR) / 6 * (prevI + 4 * Im + I); // Simpson
      rs[i] = r; integ[i] = acc;
      prevR = r; prevI = I;
    }
    let fmax = 0;
    for (let i = 0; i <= fine; i++) {
      const r = rs[i];
      const e = EmOL(r);
      F[i] = Math.max(0, -dOm(r) / (r * e * e) * integ[i]);
      if (F[i] > fmax) fmax = F[i];
    }
    const out = new Float32Array(N);
    for (let j = 0; j < N; j++) {
      const u = j / (N - 1);
      const fi = u * fine;
      const i0 = Math.min(fine - 1, Math.floor(fi));
      const t = fi - i0;
      const Fv = F[i0] * (1 - t) + F[i0 + 1] * t;
      out[j] = Math.pow(Fv / fmax, 0.25);
    }
    // En yüksek sıcaklığın yarıçapı
    let imax = 0; for (let i = 0; i <= fine; i++) if (F[i] > F[imax]) imax = i;
    return { table: out, rin, rMax, rPeak: rs[imax] };
  }

  /*
   * Kara cisim tablosu: Planck spektrumu × CIE 1931 renk eşleme fonksiyonları
   * (Wyman–Sloan–Shirley 2013 çok-loblu analitik yaklaşımı) → XYZ → doğrusal sRGB.
   * Dönüş: her sıcaklık için [R,G,B] kromatiklik (Y=1) ve log2(Y) mutlak parlaklık.
   * Sıcaklık ekseni log: T = Tmin · (Tmax/Tmin)^u
   */
  function blackbodyTable(N, Tmin, Tmax) {
    const g = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
    const xb = (l) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
    const yb = (l) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
    const zb = (l) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
    const h = 6.62607015e-34, c = 2.99792458e8, kB = 1.380649e-23;
    const planck = (lnm, T) => {
      const l = lnm * 1e-9;
      return (2 * h * c * c) / (Math.pow(l, 5) * (Math.expm1(h * c / (l * kB * T))));
    };
    const XYZ = (T) => {
      let X = 0, Y = 0, Z = 0;
      for (let l = 360; l <= 830; l += 2) {
        const B = planck(l, T);
        X += B * xb(l); Y += B * yb(l); Z += B * zb(l);
      }
      return [X, Y, Z];
    };
    const ref = XYZ(6500)[1];
    const data = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const T = Tmin * Math.pow(Tmax / Tmin, i / (N - 1));
      const [X, Y, Z] = XYZ(T);
      let R = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
      let G = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
      let B = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
      R = Math.max(0, R) / Y; G = Math.max(0, G) / Y; B = Math.max(0, B) / Y;
      data[i * 4 + 0] = R; data[i * 4 + 1] = G; data[i * 4 + 2] = B;
      data[i * 4 + 3] = Math.log2(Math.max(1e-30, Y / ref));
    }
    return { data, Tmin, Tmax };
  }

  const api = {
    kerrR, deriv, rk4, metric, invMetric, lower, dot4, raise, cameraTetrad, staticObserver,
    horizon, innerHorizon, isco, photonOrbit, criticalImpact, circular,
    diskTemperatureProfile, blackbodyTable
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KerrPhysics = api;
})(typeof window !== 'undefined' ? window : this);
