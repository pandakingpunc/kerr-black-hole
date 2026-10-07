/*
 * Kerr kara deliği: gerçek zamanlı genel görelilik ışın izleyici
 * Ana uygulama: WebGL2 hattı, kamera tetradı, serbest düşüş, arayüz.
 */
(function () {
  'use strict';
  const P = window.KerrPhysics;
  const SH = window.BHShaders;
  const I = window.I18N;
  const T = I.t;
  const $ = (s) => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const fmt = I.num;

  function fail(msg) {
    const e = $('#error');
    e.style.display = 'flex';
    e.textContent = msg;
    $('#loading').style.display = 'none';
  }

  /* ------------------------------------------------------------------ */
  /* Parametreler                                                         */
  /* ------------------------------------------------------------------ */
  const params = {
    spin: 0.9,
    mass: 'sgra',
    incl: 82,
    dist: 28,
    fov: 50,
    roll: 0,
    disk: true,
    temp: 4500,
    rout: 22,
    density: 1.35,
    turb: 1.0,
    bright: 1.0,
    haze: 0.35,
    timeScale: 9,
    paused: false,
    beaming: 1.0,
    bolo: true,
    interstellar: false,
    stars: true,
    starBright: 1.0,
    skyBright: 1.0,
    grid: false,
    jet: false,
    exposure: 1.4,
    bloom: 1.0,
    quality: 'yuksek',
    autoRes: true,
    eht: false,
    plungeSpeed: 1.0,
    // kuasar (TON 618 kipi)
    object: 'kerr',
    edd: 0.078,
    physT: false,
    corona: 0,
    wind: 0,
    blr: 0,
  };
  const DEFAULTS = { ...params };
  const QUALITY = {
    dusuk: { stepK: 0.11, maxSteps: 220, maxScale: 0.5 },
    orta: { stepK: 0.085, maxSteps: 320, maxScale: 0.7 },
    yuksek: { stepK: 0.065, maxSteps: 460, maxScale: 0.85 },
    ultra: { stepK: 0.042, maxSteps: 800, maxScale: 1.0 },
  };
  const MASSES = {
    sgra: { m: 4.3e6 },
    m87: { m: 6.5e9 },
    garg: { m: 1e8 },
    stellar: { m: 10 },
    ton618: { m: 4.07e10 },
  };
  // TON 618: L_bol ≈ 4×10⁴⁰ W (M_V = −30,7), M ≈ 4,07×10¹⁰ M☉ → L/L_Edd ≈ 0,078; radyo-gürültülü (jet açık)
  const OBJECTS = {
    kerr: {},
    ton618: { set: {
      mass: 'ton618', spin: 0.9, physT: true, edd: 0.078, corona: 1, wind: 1, blr: 1, jet: true,
      disk: true, rout: 40, density: 1.1, turb: 1, haze: 0.6, bright: 1, beaming: 1, bolo: true, interstellar: false,
      grid: false, eht: false, skyBright: 0.5, starBright: 0.5, exposure: 1.3, bloom: 1.4,
      incl: 68, dist: 42, fov: 56, roll: 0,
    } },
  };
  // geçişte saklanıp geri yüklenen ayarlar (fiziksel sıcaklık temp'i de değiştirir)
  const OBJ_KEYS = [...Object.keys(OBJECTS.ton618.set), 'temp'];
  const PRESETS = {
    fiziksel: { obj: 'kerr', set: { roll: 0, spin: 0.9, incl: 82, dist: 28, fov: 50, temp: 4500, beaming: 1, bolo: true, interstellar: false, density: 1.35, haze: 0.35, rout: 22, disk: true, grid: false, eht: false, jet: false, exposure: 1.4 } },
    gargantua: { obj: 'kerr', set: { roll: 0, spin: 0.99, incl: 87, dist: 22, fov: 46, temp: 4200, beaming: 0, bolo: true, interstellar: true, density: 1.8, haze: 0.6, rout: 18, disk: true, grid: false, eht: false, jet: false, exposure: 1.2 } },
    kutup: { set: { roll: 0, incl: 6, dist: 30, fov: 46, disk: true, grid: false, eht: false } },
    kenar: { set: { roll: 0, incl: 89.5, dist: 17, fov: 55, disk: true, grid: false, eht: false } },
    yakin: { set: { roll: 0, incl: 84, dist: 7.5, fov: 75, disk: true, grid: false, eht: false } },
    lens: { obj: 'kerr', set: { roll: 0, disk: false, grid: true, incl: 90, dist: 16, fov: 70, eht: false, jet: false } },
    m87: { obj: 'kerr', set: { spin: 0.9, incl: 17, dist: 70, fov: 22, roll: 90, rout: 10, eht: true, disk: true, grid: false, beaming: 1, bolo: true, interstellar: false, temp: 6000, jet: false } },
    jet: { obj: 'kerr', set: { roll: 0, jet: true, incl: 64, dist: 48, fov: 56, disk: true, grid: false, eht: false } },
    ton618: { obj: 'ton618', set: { roll: 0, incl: 68, dist: 42, fov: 56, disk: true, grid: false, eht: false } },
  };

  // URL ile başlangıç ayarları (test ve paylaşım için): nesne → hazır sahne → tek tek ayarlar
  const qPreset = PRESETS[qs.get('preset')];
  params.object = (qs.get('object') || (qPreset && qPreset.obj)) === 'ton618' ? 'ton618' : 'kerr';
  if (params.object === 'ton618') Object.assign(params, OBJECTS.ton618.set);
  if (qPreset) Object.assign(params, qPreset.set);
  for (const k of Object.keys(params)) {
    if (!qs.has(k) || k === 'object') continue;
    const v = qs.get(k);
    if (typeof params[k] === 'number') params[k] = parseFloat(v);
    else if (typeof params[k] === 'boolean') params[k] = v === '1' || v === 'true';
    else params[k] = v;
  }

  /* ------------------------------------------------------------------ */
  /* WebGL2                                                               */
  /* ------------------------------------------------------------------ */
  const canvas = $('#gl');
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: qs.has('preserve'), powerPreference: 'high-performance',
  });
  if (!gl) { fail(T('err.webgl2')); return; }
  if (!gl.getExtension('EXT_color_buffer_float')) { fail(T('err.float')); return; }
  gl.getExtension('OES_texture_float_linear');

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function compile(type, src, name) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error(name, log);
      throw new Error(name + ': ' + log);
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, SH.VERT, 'vert');
  function makeProg(fsSrc, name) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc, name));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ' link: ' + gl.getProgramInfoLog(p));
    const info = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const au = gl.getActiveUniform(p, i);
      const nm = au.name.replace(/\[0\]$/, '');
      info[nm] = { loc: gl.getUniformLocation(p, nm), type: au.type };
    }
    return {
      p,
      use() { gl.useProgram(p); return this; },
      set(nm, v) {
        const e = info[nm];
        if (!e) return this;
        switch (e.type) {
          case gl.FLOAT: gl.uniform1f(e.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2f(e.loc, v[0], v[1]); break;
          case gl.FLOAT_VEC3: gl.uniform3f(e.loc, v[0], v[1], v[2]); break;
          case gl.FLOAT_VEC4: gl.uniform4f(e.loc, v[0], v[1], v[2], v[3]); break;
          default: gl.uniform1i(e.loc, v); break;
        }
        return this;
      },
    };
  }

  let progs;
  try {
    progs = {
      skygen: makeProg(SH.SKYGEN, 'skygen'),
      trace: makeProg(SH.TRACE, 'trace'),
      taa: makeProg(SH.TAA, 'taa'),
      neigh: makeProg(SH.NEIGH, 'neigh'),
      down: makeProg(SH.DOWN, 'down'),
      up: makeProg(SH.UP, 'up'),
      comp: makeProg(SH.COMPOSITE, 'composite'),
      skyview: makeProg(SH.SKYVIEW, 'skyview'),
      maxlum: makeProg(SH.MAXLUM, 'maxlum'),
      autoexp: makeProg(SH.AUTOEXP, 'autoexp'),
    };
  } catch (e) {
    fail(T('err.shader', { msg: e.message }));
    return;
  }

  function createTex(w, h, internal, format, type, data, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function createTarget(w, h) {
    const tex = createTex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }
  function freeTarget(t) { if (!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
  function draw() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

  /* --- Kara cisim tablosu --- */
  const BB_N = 1024, BB_TMIN = 700, BB_TMAX = 150000;
  const bb = P.blackbodyTable(BB_N, BB_TMIN, BB_TMAX);
  const bbTex = createTex(BB_N, 1, gl.RGBA16F, gl.RGBA, gl.FLOAT, bb.data);
  function bbLum(T) {
    const u = clamp(Math.log(T / BB_TMIN) / Math.log(BB_TMAX / BB_TMIN), 0, 1) * (BB_N - 1);
    const i = Math.min(BB_N - 2, Math.floor(u)), f = u - i;
    return Math.pow(2, bb.data[i * 4 + 3] * (1 - f) + bb.data[(i + 1) * 4 + 3] * f);
  }

  /* --- Disk sıcaklık profili (Novikov–Thorne) --- */
  const PROF_N = 512, PROF_RMAX = 64;
  let profTex = null, prof = null;
  function updateProfile() {
    prof = P.diskTemperatureProfile(params.spin, PROF_RMAX, PROF_N);
    if (profTex) gl.deleteTexture(profTex);
    profTex = createTex(PROF_N, 1, gl.R16F, gl.RED, gl.FLOAT, prof.table);
  }
  updateProfile();

  /* --- Kuasar: kütle, dönme ve L/L_Edd'den fiziksel disk sıcaklığı ve BLR yarıçapı --- */
  function quasarState() {
    const M = MASSES[params.mass].m;
    const q = P.quasarDisk(params.spin, M, params.edd, prof.fPeak);
    // Hβ BLR yarıçapı: R–L ilişkisi (Bentz vd. 2013), λL₅₁₀₀ ≈ L_bol / 9
    const Rld = Math.pow(10, 1.527) * Math.pow(q.L * 1e7 / 9 / 1e44, 0.533);   // ışık-günü
    const rgLd = M * 1476.625 / 2.59020684e13;                                   // GM/c² [ışık-günü]
    q.blrLd = Rld;
    q.blrM = Rld / rgLd;
    return q;
  }
  function applyPhysT() {
    if (!params.physT) return;
    params.temp = clamp(quasarState().Tpeak, 700, 150000);
    syncControl('temp');
  }
  if (params.physT) params.temp = clamp(quasarState().Tpeak, 700, 150000);   // panel henüz kurulmadı

  /* --- Gökyüzü küp haritası --- */
  const SKY_SIZE = qs.has('skysize') ? parseInt(qs.get('skysize'), 10) : 1024;
  const skyTex = gl.createTexture();
  function buildSky() {
    const levels = Math.floor(Math.log2(SKY_SIZE)) + 1;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyTex);
    gl.texStorage2D(gl.TEXTURE_CUBE_MAP, levels, gl.RGBA16F, SKY_SIZE, SKY_SIZE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    progs.skygen.use().set('uSize', SKY_SIZE);
    gl.viewport(0, 0, SKY_SIZE, SKY_SIZE);
    gl.enable(gl.SCISSOR_TEST);
    const tiles = 4, ts = SKY_SIZE / tiles;
    for (let f = 0; f < 6; f++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, skyTex, 0);
      progs.skygen.set('uFace', f);
      for (let ty = 0; ty < tiles; ty++) for (let tx = 0; tx < tiles; tx++) {
        gl.scissor(tx * ts, ty * ts, ts, ts);
        draw();
      }
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyTex);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.deleteFramebuffer(fb);
  }

  /* ------------------------------------------------------------------ */
  /* Render hedefleri ve dinamik çözünürlük                               */
  /* ------------------------------------------------------------------ */
  let cw = 0, ch = 0, rw = 0, rhgt = 0, ow = 0, oh = 0;
  let scale = qs.has('scale') ? parseFloat(qs.get('scale')) : 0.6;
  let scaleInit = !qs.has('scale');
  const fixedScale = qs.has('scale');
  let traceRT = null, histRT = [null, null], histIdx = 0, bloomRT = [];
  let neighRT = null;
  let histValid = false, histFrames = 0;
  let maxRT = null, aeRT = null, aeIdx = 0, aeReset = true;

  // Çıktı (geçmiş) tamponu ekran çözünürlüğünde, ~4,2 MP ile sınırlı
  function allocOutput() {
    freeTarget(histRT[0]); freeTarget(histRT[1]);
    bloomRT.forEach(freeTarget); bloomRT = [];
    const cap = Math.min(1, Math.sqrt(3.0e6 / (cw * ch)));
    ow = Math.max(32, Math.round(cw * cap));
    oh = Math.max(32, Math.round(ch * cap));
    histRT = [createTarget(ow, oh), createTarget(ow, oh)];
    let w = ow >> 1, h = oh >> 1;
    while (bloomRT.length < 8 && w >= 6 && h >= 6) { bloomRT.push(createTarget(w, h)); w >>= 1; h >>= 1; }
    histValid = false;
  }
  function allocTargets() {
    freeTarget(traceRT);
    if (neighRT) { gl.deleteTexture(neighRT.mu); gl.deleteTexture(neighRT.sig); gl.deleteFramebuffer(neighRT.fb); }
    rw = Math.max(32, Math.round(cw * scale));
    rhgt = Math.max(32, Math.round(ch * scale));
    traceRT = createTarget(rw, rhgt);
    // komşuluk istatistiği için iki çıkışlı (MRT) hedef
    const mu = createTex(rw, rhgt, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.NEAREST);
    const sig = createTex(rw, rhgt, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.NEAREST);
    const nfb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, nfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mu, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, sig, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    neighRT = { mu, sig, fb: nfb };
    // geçmiş tamponu çıktı çözünürlüğünde; ışın izleme çözünürlüğü değişince korunur
  }
  function checkSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, Math.floor(window.innerWidth * dpr));
    const h = Math.max(64, Math.floor(window.innerHeight * dpr));
    if (w !== cw || h !== ch) {
      cw = w; ch = h;
      if (scaleInit) { scale = Math.round(clamp(Math.sqrt(0.8e6 / (cw * ch)), 0.3, QUALITY[params.quality].maxScale) * 20) / 20; scaleInit = false; }
      canvas.width = cw; canvas.height = ch;
      allocTargets();
      allocOutput();
    }
  }
  function setScale(s) {
    s = Math.round(clamp(s, 0.3, 1.0) * 20) / 20;
    if (Math.abs(s - scale) < 0.01) return;
    scale = s;
    allocTargets();
  }

  /* ------------------------------------------------------------------ */
  /* Kamera                                                               */
  /* ------------------------------------------------------------------ */
  const cam = {
    mode: qs.get('mode') || (qs.has('cine') && qs.get('cine') === '0' ? 'orbit' : 'cinematic'),
    az: qs.has('az') ? parseFloat(qs.get('az')) * DEG : 38 * DEG,
    incl: params.incl * DEG,
    dist: params.dist,
    tAz: 0, tIncl: 0, tDist: 0,
    fov: params.fov,
    cineT: qs.has('cinet') ? parseFloat(qs.get('cinet')) : 0,
    cineBlend: 1,
    cineFrom: null,
    yaw: 0, pitch: 0, tYaw: 0, tPitch: 0,
    cBaseIncl: params.incl * DEG, cBaseDist: params.dist,
  };
  if (cam.mode === 'plunge') cam.mode = 'orbit';
  cam.tAz = cam.az; cam.tIncl = cam.incl; cam.tDist = cam.dist;

  // Sinematik yol: mevcut eğim/uzaklık etrafında yavaş, organik bir yörünge
  function cinePath(t) {
    const bi = cam.cBaseIncl / DEG;
    const amp = Math.min(6.5, 0.6 * Math.min(bi, 180 - bi));
    return {
      az: 38 * DEG + t * 0.042,
      incl: clamp(bi + amp * (0.75 * Math.sin(t * 0.057 + 0.3) + 0.25 * Math.sin(t * 0.13)), 1.5, 178.5) * DEG,
      dist: cam.cBaseDist * (1 + 0.16 * Math.sin(t * 0.041 + 1.9)),
    };
  }
  function setMode(m) {
    if (m === 'tour') { if (tour.active) stopTour(); else startTour(); return; }
    stopTour();
    if (m === 'plunge') { startPlunge(); return; }
    if (plunge.active) endPlunge(true);
    if (m === 'cinematic' && cam.mode !== 'cinematic') {
      cam.cineFrom = { az: cam.az, incl: cam.incl, dist: cam.dist };
      cam.cineBlend = 0;
    }
    if (m === 'orbit') { cam.tAz = cam.az; cam.tIncl = cam.incl; cam.tDist = cam.dist; }
    cam.mode = m;
    updateModeButtons();
  }

  /* --- Serbest düşüş (zamansı jeodezik) --- */
  const plunge = {
    active: false, s: new Float64Array(7), Pt: -1, tau: 0, a: 0,
    ending: 0, endMsg: '', crossed: false, rEnd: 0.2, startR: 0, u: null,
  };
  function startPlunge(quiet) {
    const a = params.spin;
    const X = camPosition(cam.dist, cam.incl, cam.az, a);
    const u = P.staticObserver(X, a);
    if (!u) return;
    const g = P.metric(X, a).g;
    const Pl = P.lower(g, u);
    plunge.s.set([X[0], X[1], X[2], Pl[1], Pl[2], Pl[3], 0]);
    plunge.Pt = Pl[0];
    plunge.tau = 0;
    plunge.a = a;
    plunge.active = true;
    plunge.ending = 0;
    plunge.crossed = false;
    plunge.startR = cam.dist;
    plunge.rEnd = a < 0.05 ? 0.12 : Math.max(0.12, P.innerHorizon(a) * 1.04 + 0.01);
    plunge.u = u;
    cam.yaw = cam.pitch = cam.tYaw = cam.tPitch = 0;
    cam.prevMode = cam.mode === 'plunge' ? 'orbit' : cam.mode;
    cam.mode = 'plunge';
    document.body.classList.add('plunging');
    if (!quiet) toast(T('plunge.start.t'), T('plunge.start.s'));
    updateModeButtons();
    histValid = false;
  }
  function endPlunge(silent) {
    plunge.active = false;
    plunge.ending = 0;
    document.body.classList.remove('plunging');
    cam.mode = cam.prevMode || 'orbit';
    cam.dist = cam.tDist = clamp(plunge.startR, 6, 60);
    cam.yaw = cam.pitch = cam.tYaw = cam.tPitch = 0;
    if (cam.mode === 'cinematic') { cam.cineFrom = null; cam.cineBlend = 1; }
    fade = silent ? 1 : 0;
    updateModeButtons();
    histValid = false;
  }
  function stepPlunge(dtWall) {
    const a = plunge.a;
    const s = plunge.s;
    let r = P.kerrR(s[0], s[1], s[2], a);
    if (plunge.ending || r < plunge.rEnd) return r;   // son noktada kamera donar
    // sunum hızı: uzakta hızlı, ufka yakın ağır çekim (özzaman M/sn)
    const rate = clamp(7 * Math.pow(r / 10, 1.5), 0.14, 24) * params.plungeSpeed;
    let rem = Math.min(dtWall, 0.1) * rate;
    let guard = 0;
    while (rem > 1e-9 && guard++ < 400) {
      const h = Math.min(rem, 0.01 * Math.max(r, 0.08));
      P.rk4(s, plunge.Pt, a, h);
      plunge.tau += h;
      rem -= h;
      r = P.kerrR(s[0], s[1], s[2], a);
      if (r < plunge.rEnd) break;
    }
    const rh = P.horizon(a);
    if (!plunge.crossed && r < rh) {
      plunge.crossed = true;
      toast(T('plunge.horizon.t'), T('plunge.horizon.s'));
    }
    if (r < plunge.rEnd && !plunge.ending) {
      plunge.ending = performance.now();
      if (a < 0.05) toast(T('plunge.sing.t'), T('plunge.sing.s'));
      else toast(T('plunge.cauchy.t'), T('plunge.cauchy.s'));
    }
    return r;
  }

  function camPosition(r, th, ph, a) {
    const rr = Math.sqrt(r * r + a * a);
    return [rr * Math.sin(th) * Math.cos(ph), rr * Math.sin(th) * Math.sin(ph), r * Math.cos(th)];
  }
  function rotateAxis(v, axis, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const d = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
    const cr = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
    return [v[0] * c + cr[0] * s + axis[0] * d * (1 - c), v[1] * c + cr[1] * s + axis[1] * d * (1 - c), v[2] * c + cr[2] * s + axis[2] * d * (1 - c)];
  }
  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 6);
    if (cam.mode === 'cinematic') {
      cam.cineT += dt;
      const kb = 1 - Math.exp(-dt * 1.2);
      cam.cBaseIncl += (params.incl * DEG - cam.cBaseIncl) * kb;
      cam.cBaseDist *= Math.exp((Math.log(Math.max(params.dist, minDist())) - Math.log(cam.cBaseDist)) * kb);
      const p = cinePath(cam.cineT);
      if (cam.cineBlend < 1 && cam.cineFrom) {
        cam.cineBlend = Math.min(1, cam.cineBlend + dt / 3.5);
        const b = smooth(cam.cineBlend);
        let daz = p.az - cam.cineFrom.az;
        daz = Math.atan2(Math.sin(daz), Math.cos(daz));
        cam.az = cam.cineFrom.az + daz * b;
        cam.incl = lerp(cam.cineFrom.incl, p.incl, b);
        cam.dist = lerp(cam.cineFrom.dist, p.dist, b);
      } else {
        cam.az = p.az; cam.incl = p.incl; cam.dist = p.dist;
      }
    } else if (cam.mode === 'orbit') {
      cam.az += (cam.tAz - cam.az) * k;
      cam.incl += (cam.tIncl - cam.incl) * k;
      cam.dist *= Math.exp((Math.log(cam.tDist) - Math.log(cam.dist)) * k);
    }
    cam.fov += (params.fov - cam.fov) * k;
    cam.yaw += (cam.tYaw - cam.yaw) * k;
    cam.pitch += (cam.tPitch - cam.pitch) * k;

    const a = params.spin;
    let X, u, inside = false;
    if (plunge.active) {
      const s = plunge.s;
      X = [s[0], s[1], s[2]];
      u = P.raise(X, [plunge.Pt, s[3], s[4], s[5]], plunge.a);
      inside = P.kerrR(X[0], X[1], X[2], plunge.a) < P.horizon(plunge.a);
    } else {
      X = camPosition(cam.dist, cam.incl, cam.az, a);
      u = P.staticObserver(X, a);
      if (!u) { cam.dist = cam.tDist = 3.2; X = camPosition(cam.dist, cam.incl, cam.az, a); u = P.staticObserver(X, a); }
    }
    // Yönelim: kara deliğe bak, "yukarı" = −∂θ yönü (kutuplarda da tekil değil)
    const ρ = Math.hypot(X[0], X[1]);
    const ph = Math.atan2(X[1], X[0]);
    const th = Math.atan2(ρ, X[2]);
    let fwd = norm3([-X[0], -X[1], -X[2]]);
    let up = [-Math.cos(th) * Math.cos(ph), -Math.cos(th) * Math.sin(ph), Math.sin(th)];
    // yukarıyı ileriye dik yap
    const dfu = fwd[0] * up[0] + fwd[1] * up[1] + fwd[2] * up[2];
    up = norm3([up[0] - dfu * fwd[0], up[1] - dfu * fwd[1], up[2] - dfu * fwd[2]]);
    if (params.roll) up = rotateAxis(up, fwd, params.roll * DEG);
    if (cam.yaw || cam.pitch) {
      fwd = rotateAxis(fwd, up, -cam.yaw);
      const right = norm3(cross3(fwd, up));
      fwd = rotateAxis(fwd, right, cam.pitch);
      up = norm3(cross3(right, fwd));
    }
    const T = P.cameraTetrad(X, u, fwd, up, plunge.active ? plunge.a : a);
    return { X, u, T, inside, a: plunge.active ? plunge.a : a };
  }

  /* ------------------------------------------------------------------ */
  /* Etkileşim                                                            */
  /* ------------------------------------------------------------------ */
  const pointers = new Map();
  let pinchD = 0;
  canvas.addEventListener('pointerdown', (e) => {
    stopTour();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.classList.add('drag');
    if (cam.mode === 'cinematic') setMode('orbit');
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinchD = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinchD > 0) zoomBy(pinchD / d);
      pinchD = d;
      return;
    }
    const sens = 0.0045 * (cam.fov / 50);
    if (plunge.active || e.shiftKey) {
      cam.tYaw = clamp(cam.tYaw + dx * sens, -Math.PI, Math.PI);
      cam.tPitch = clamp(cam.tPitch - dy * sens, -1.4, 1.4);
    } else {
      cam.tAz -= dx * sens * 1.4;
      cam.tIncl = clamp(cam.tIncl - dy * sens * 1.4, 1.5 * DEG, 178.5 * DEG);
      params.incl = cam.tIncl / DEG;
      syncControl('incl');
    }
  });
  const endPtr = (e) => {
    pointers.delete(e.pointerId);
    if (!pointers.size) canvas.classList.remove('drag');
    pinchD = 0;
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('dblclick', () => { cam.tYaw = cam.tPitch = 0; });
  function zoomBy(f) {
    if (plunge.active) { params.fov = clamp(params.fov * f, 15, 120); syncControl('fov'); return; }
    if (cam.mode === 'cinematic') setMode('orbit');
    cam.tDist = clamp(cam.tDist * f, minDist(), 400);
    params.dist = cam.tDist;
    syncControl('dist');
  }
  function minDist() { return 2.6 + params.spin * 0.4 + 0.6; }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopTour();
    zoomBy(Math.exp(e.deltaY * 0.0012));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 't') { setMode('tour'); return; }
    if (!['h', 'f', 'i', '?', 'p', 's', 'r'].includes(k)) stopTour();
    if (k === 'q') { setObject(params.object === 'ton618' ? 'kerr' : 'ton618'); return; }
    if (k === 'h') document.body.classList.toggle('hide-ui');
    else if (k === 'f') toggleFullscreen();
    else if (k === ' ') { e.preventDefault(); params.paused = !params.paused; syncControl('paused'); }
    else if (k === 's') shotRequested = true;
    else if (k === 'r') toggleRecording();
    else if (k === 'c') setMode('cinematic');
    else if (k === 'o') setMode('orbit');
    else if (k === 'd') setMode('plunge');
    else if (k === 'p') document.body.classList.toggle('panel-closed');
    else if (k === 'i' || k === '?') document.body.classList.toggle('show-info');
    else if (k === 'escape' && document.body.classList.contains('show-info')) document.body.classList.remove('show-info');
    else if (k === 'escape' && plunge.active) endPlunge(false);
    else if (/^[1-9]$/.test(k)) applyPreset(Object.keys(PRESETS)[parseInt(k, 10) - 1]);
  });
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  /* ------------------------------------------------------------------ */
  /* Arayüz paneli                                                        */
  /* ------------------------------------------------------------------ */
  const controls = {};
  let recBtn = null;
  // Etiketler sözlük anahtarlarıdır (js/i18n.js); buildPanel dil değişince yeniden çağrılır
  const SPEC = [
    { title: 'sec.bh', open: true, items: [
      { t: 'range', k: 'spin', label: 'p.spin', min: 0, max: 0.998, step: 0.001, f: (v) => fmt(v, 3) },
      { t: 'select', k: 'mass', label: 'p.mass', options: () => Object.keys(MASSES).map((k) => [k, T('mass.' + k)]) },
      { t: 'note', text: 'n.bh' },
    ] },
    { title: 'sec.cam', open: true, items: [
      { t: 'range', k: 'dist', label: 'p.dist', min: 3.5, max: 120, step: 0.1, log: true, f: (v) => fmt(v, 1) + ' M' },
      { t: 'range', k: 'incl', label: 'p.incl', min: 1.5, max: 178.5, step: 0.1, f: (v) => fmt(v, 1) + '°' },
      { t: 'range', k: 'fov', label: 'p.fov', min: 15, max: 110, step: 0.5, f: (v) => fmt(v, 0) + '°' },
      { t: 'range', k: 'roll', label: 'p.roll', min: -180, max: 180, step: 0.5, f: (v) => fmt(v, 0) + '°' },
      { t: 'range', k: 'plungeSpeed', label: 'p.plungeSpeed', min: 0.25, max: 3, step: 0.05, f: (v) => fmt(v, 2) + '×' },
    ] },
    { title: 'sec.disk', open: true, items: [
      { t: 'toggle', k: 'disk', label: 'p.disk' },
      { t: 'range', k: 'temp', label: 'p.temp', min: 2500, max: 100000, step: 50, log: true, f: (v) => I.int(v) + ' K' },
      { t: 'range', k: 'rout', label: 'p.rout', min: 6, max: 60, step: 0.5, f: (v) => fmt(v, 1) + ' M' },
      { t: 'range', k: 'density', label: 'p.density', min: 0.1, max: 5, step: 0.01, log: true, f: (v) => fmt(v, 2) },
      { t: 'range', k: 'turb', label: 'p.turb', min: 0, max: 1, step: 0.01, f: (v) => fmt(v * 100, 0) + '%' },
      { t: 'range', k: 'haze', label: 'p.haze', min: 0, max: 2, step: 0.01, f: (v) => fmt(v, 2) },
      { t: 'range', k: 'bright', label: 'p.bright', min: 0.1, max: 6, step: 0.01, log: true, f: (v) => fmt(v, 2) + '×' },
      { t: 'range', k: 'timeScale', label: 'p.timeScale', min: 0, max: 60, step: 0.1, f: (v) => fmt(v, 1) + ' ' + T('u.Mps') },
      { t: 'toggle', k: 'paused', label: 'p.paused' },
    ] },
    { title: 'sec.rel', open: true, items: [
      { t: 'range', k: 'beaming', label: 'p.beaming', min: 0, max: 1, step: 0.01, f: (v) => fmt(v * 100, 0) + '%' },
      { t: 'toggle', k: 'bolo', label: 'p.bolo' },
      { t: 'toggle', k: 'interstellar', label: 'p.interstellar' },
      { t: 'note', text: 'n.rel' },
    ] },
    { title: 'sec.quasar', open: false, items: [
      { t: 'range', k: 'edd', label: 'p.edd', min: 0.001, max: 1, step: 0.0001, log: true, f: (v) => fmt(v, 3) + ' · ' + sci(v * 1.25707e31 * MASSES[params.mass].m, 1) + ' W' },
      { t: 'toggle', k: 'physT', label: 'p.physT' },
      { t: 'range', k: 'corona', label: 'p.corona', min: 0, max: 3, step: 0.01, f: offOr },
      { t: 'range', k: 'wind', label: 'p.wind', min: 0, max: 3, step: 0.01, f: offOr },
      { t: 'range', k: 'blr', label: 'p.blr', min: 0, max: 3, step: 0.01, f: offOr },
      { t: 'note', text: 'n.quasar' },
    ] },
    { title: 'sec.sky', open: false, items: [
      { t: 'toggle', k: 'stars', label: 'p.stars' },
      { t: 'range', k: 'starBright', label: 'p.starBright', min: 0, max: 4, step: 0.01, f: (v) => fmt(v, 2) + '×' },
      { t: 'range', k: 'skyBright', label: 'p.skyBright', min: 0, max: 4, step: 0.01, f: (v) => fmt(v, 2) + '×' },
      { t: 'toggle', k: 'grid', label: 'p.grid' },
      { t: 'toggle', k: 'jet', label: 'p.jet' },
    ] },
    { title: 'sec.img', open: false, items: [
      { t: 'range', k: 'exposure', label: 'p.exposure', min: 0.1, max: 6, step: 0.01, log: true, f: (v) => fmt(v, 2) },
      { t: 'range', k: 'bloom', label: 'p.bloom', min: 0, max: 3, step: 0.01, f: (v) => fmt(v, 2) },
      { t: 'select', k: 'quality', label: 'p.quality', options: () => Object.entries(QUALITY).map(([k, v]) => [k, T('q.' + k) + ' · ' + T('steps', { n: v.maxSteps })]) },
      { t: 'toggle', k: 'autoRes', label: 'p.autoRes' },
      { t: 'toggle', k: 'eht', label: 'p.eht' },
    ] },
    { title: 'sec.presets', open: true, items: [
      { t: 'presets' },
    ] },
    { title: 'sec.tools', open: true, items: [
      { t: 'actions' },
    ] },
  ];

  function offOr(v) { return v < 0.005 ? T('off') : fmt(v, 2) + '×'; }
  // bilimsel gösterim: 4.0×10⁴⁰
  function sci(v, d) {
    if (!(v > 0)) return '0';
    let e = Math.floor(Math.log10(v));
    let m = v / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e++; }
    const sup = String(e).split('').map((c) => (c === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c])).join('');
    return fmt(m, d) + '×10' + sup;
  }
  function toSlider(it, v) { return it.log ? Math.log(v / it.min) / Math.log(it.max / it.min) : (v - it.min) / (it.max - it.min); }
  function fromSlider(it, s) { return it.log ? it.min * Math.pow(it.max / it.min, s) : it.min + s * (it.max - it.min); }

  function buildPanel() {
    const panel = $('#panel');
    const wasOpen = [...panel.querySelectorAll('details')].map((d) => d.open);
    panel.textContent = '';
    for (const k of Object.keys(controls)) delete controls[k];
    SPEC.forEach((sec, si) => {
      const det = document.createElement('details');
      det.open = si < wasOpen.length ? wasOpen[si] : !!sec.open;
      det.dataset.sec = sec.title;
      const sum = document.createElement('summary');
      sum.textContent = T(sec.title);
      det.appendChild(sum);
      for (const it of sec.items) {
        if (it.t === 'range') {
          const row = document.createElement('div');
          row.className = 'row';
          const lab = document.createElement('label'); lab.textContent = T(it.label);
          const val = document.createElement('span'); val.className = 'val';
          const inp = document.createElement('input');
          inp.type = 'range'; inp.min = 0; inp.max = 1000; inp.step = 1;
          row.append(lab, val, inp);
          det.appendChild(row);
          const sync = () => {
            const s = clamp(toSlider(it, params[it.k]), 0, 1);
            inp.value = Math.round(s * 1000);
            inp.style.setProperty('--p', (s * 100).toFixed(1) + '%');
            val.textContent = it.f(params[it.k]);
          };
          inp.addEventListener('input', () => {
            let v = fromSlider(it, inp.value / 1000);
            if (it.step) v = Math.round(v / it.step) * it.step;
            params[it.k] = v;
            inp.style.setProperty('--p', (inp.value / 10).toFixed(1) + '%');
            val.textContent = it.f(v);
            onParam(it.k);
          });
          controls[it.k] = sync;
          sync();
        } else if (it.t === 'toggle') {
          const lab = document.createElement('label');
          lab.className = 'toggle';
          const span = document.createElement('span'); span.textContent = T(it.label);
          const inp = document.createElement('input'); inp.type = 'checkbox';
          const sw = document.createElement('span'); sw.className = 'sw';
          lab.append(span, inp, sw);
          det.appendChild(lab);
          inp.addEventListener('change', () => { params[it.k] = inp.checked; onParam(it.k); });
          controls[it.k] = () => { inp.checked = !!params[it.k]; };
          controls[it.k]();
        } else if (it.t === 'select') {
          const row = document.createElement('div');
          row.style.margin = '8px 0';
          const lab = document.createElement('label'); lab.textContent = T(it.label); lab.style.color = 'rgba(233,236,243,.82)';
          const sel = document.createElement('select');
          for (const [v, l] of it.options()) { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); }
          row.append(lab, sel);
          det.appendChild(row);
          sel.addEventListener('change', () => { params[it.k] = sel.value; onParam(it.k); });
          controls[it.k] = () => { sel.value = params[it.k]; };
          controls[it.k]();
        } else if (it.t === 'note') {
          const n = document.createElement('div'); n.className = 'note'; n.textContent = T(it.text);
          det.appendChild(n);
        } else if (it.t === 'presets') {
          const g = document.createElement('div'); g.className = 'btns';
          Object.keys(PRESETS).forEach((k, i) => {
            const b = document.createElement('button'); b.className = 'btn'; b.textContent = T('preset.' + k);
            b.title = T('shortcut', { n: i + 1 });
            b.addEventListener('click', () => applyPreset(k));
            g.appendChild(b);
          });
          det.appendChild(g);
        } else if (it.t === 'actions') {
          const g = document.createElement('div'); g.className = 'btns';
          const mk = (key, fn, cls) => { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = T(key); b.addEventListener('click', fn); g.appendChild(b); return b; };
          mk('act.plunge', () => setMode('plunge'), 'warm wide');
          mk('act.tour', () => setMode('tour'), 'wide');
          mk('act.shot', () => { shotRequested = true; });
          mk('act.fs', toggleFullscreen);
          recBtn = mk('act.rec', toggleRecording, 'wide');
          mk('act.hideUi', () => document.body.classList.add('hide-ui'));
          mk('act.closePanel', () => document.body.classList.add('panel-closed'));
          mk('act.diagram', () => { document.body.classList.toggle('no-diagram'); diagDirty = true; }, 'wide');
          det.appendChild(g);
        }
      }
      panel.appendChild(det);
    });
    updateRecUi();
  }
  function syncControl(k) { if (controls[k]) controls[k](); }

  function onParam(k) {
    stopTour();
    if (k === 'spin') { updateProfile(); applyPhysT(); diagDirty = true; if (plunge.active) endPlunge(true); }
    if (k === 'temp' && params.physT) { params.physT = false; syncControl('physT'); }
    if (k === 'physT' || k === 'edd') applyPhysT();
    if (k === 'mass') { applyPhysT(); syncControl('edd'); }
    if (k === 'dist') { cam.tDist = clamp(params.dist, minDist(), 400); diagDirty = true; }
    if (k === 'incl') { cam.tIncl = params.incl * DEG; }
    if (k === 'quality') { if (!fixedScale) setScale(Math.min(scale, QUALITY[params.quality].maxScale)); }
    if (k === 'eht') document.body.classList.toggle('eht', params.eht);
    if (k === 'rout' && params.rout < 6) params.rout = 6;
    histValid = false;
  }

  // Toplu ayar değişikliğinden sonra profil, panel, kamera hedefleri ve geçmiş tamponu
  function refreshParams(prevSpin) {
    if (params.spin !== prevSpin) updateProfile();
    applyPhysT();
    for (const k of Object.keys(controls)) syncControl(k);
    document.body.classList.toggle('eht', params.eht);
    cam.tDist = clamp(params.dist, minDist(), 400);
    cam.tIncl = params.incl * DEG;
    updateModeButtons();
    diagDirty = true;
    histValid = false;
  }

  function applyPreset(key, quiet) {
    const pr = PRESETS[key];
    if (!pr) return;
    if (!quiet) stopTour();
    if (plunge.active) endPlunge(true);
    if (pr.obj && pr.obj !== params.object) setObject(pr.obj, true);
    const prevSpin = params.spin;
    Object.assign(params, pr.set);
    refreshParams(prevSpin);
    if (!quiet) toast(T('preset.' + key), '');
  }

  /* --- Nesne: genel Kerr kara deliği ↔ TON 618 kuasarı. Geri dönüşte önceki ayarlar geri gelir. --- */
  let objSnapshot = null;
  function setObject(o, quiet) {
    if (!OBJECTS[o] || o === params.object) return;
    if (!quiet) stopTour();
    if (plunge.active) endPlunge(true);
    const prevSpin = params.spin;
    if (o === 'ton618') {
      objSnapshot = {};
      for (const k of OBJ_KEYS) objSnapshot[k] = params[k];
      Object.assign(params, OBJECTS.ton618.set);
    } else {
      const src = objSnapshot || DEFAULTS;
      for (const k of OBJ_KEYS) params[k] = src[k];
      objSnapshot = null;
    }
    params.object = o;
    refreshParams(prevSpin);
    updateObjectUi();
    if (o === 'ton618') { const d = $('#panel details[data-sec="sec.quasar"]'); if (d) d.open = true; }
    if (!quiet) toast(T('obj.' + o + '.t'), T('obj.' + o + '.s'), 3600);
  }
  function updateObjectUi() {
    const q = params.object === 'ton618';
    document.body.classList.toggle('quasar', q);
    $('#title h1').dataset.i18n = q ? 'ui.title.ton618' : 'ui.title';
    $('#title p').dataset.i18n = q ? 'ui.subtitle.ton618' : 'ui.subtitle';
    I.apply($('#title'));
    document.querySelectorAll('#object button').forEach((b) => b.classList.toggle('on', b.dataset.object === params.object));
  }
  document.querySelectorAll('#object button').forEach((b) => b.addEventListener('click', () => setObject(b.dataset.object)));

  /* --- Otomatik tur: sahneler arasında kararma geçişli, açıklamalı gezinti --- */
  const TOUR = [
    { k: 'fiziksel', p: ['fiziksel'], dur: 15 },
    { k: 'gargantua', p: ['gargantua'], dur: 13 },
    { k: 'kutup', p: ['fiziksel', 'kutup'], dur: 11 },
    { k: 'yakin', p: ['fiziksel', 'yakin'], dur: 11 },
    { k: 'lens', p: ['lens'], dur: 11 },
    { k: 'm87', p: ['m87'], dur: 9 },
    { k: 'jet', p: ['fiziksel', 'jet'], dur: 11 },
    { k: 'ton618', p: ['ton618'], dur: 14 },
    { k: 'plunge', p: ['fiziksel'], plunge: true },
  ];
  const tour = { active: false, i: -1, t0: 0, fade: 1 };
  function startTour() {
    tour.active = true;
    tour.i = -1;
    nextScene();
  }
  function stopTour() {
    if (!tour.active) return;
    tour.active = false;
    tour.fade = 1;
    updateModeButtons();
  }
  function nextScene() {
    tour.i = (tour.i + 1) % TOUR.length;
    const sc = TOUR[tour.i];
    if (plunge.active) endPlunge(true);
    sc.p.forEach((k) => applyPreset(k, true));
    cam.mode = 'cinematic';
    cam.cineFrom = null; cam.cineBlend = 1;
    cam.cBaseIncl = params.incl * DEG; cam.cBaseDist = params.dist;
    cam.yaw = cam.pitch = cam.tYaw = cam.tPitch = 0;
    if (sc.plunge) {
      cam.dist = params.dist; cam.incl = params.incl * DEG;
      startPlunge(true);
    }
    tour.t0 = performance.now();
    tour.fade = 0;
    toast(T('tour.' + sc.k + '.t'), T('tour.' + sc.k + '.s'), 4200);
    updateModeButtons();
    histValid = false;
  }
  function updateTour(now) {
    if (!tour.active) { tour.fade = 1; return; }
    const e = (now - tour.t0) / 1000;
    const sc = TOUR[tour.i];
    if (sc.plunge) {
      tour.fade = clamp(e / 0.9, 0, 1);
      if (!plunge.active && e > 1.5) nextScene();
    } else {
      tour.fade = Math.min(clamp(e / 0.9, 0, 1), clamp((sc.dur - e) / 0.7, 0, 1));
      if (e > sc.dur) nextScene();
    }
  }

  function updateModeButtons() {
    document.querySelectorAll('#modes button').forEach((b) => {
      b.classList.toggle('on', tour.active ? b.dataset.mode === 'tour' : b.dataset.mode === cam.mode);
    });
  }
  document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#panelToggle').addEventListener('click', () => document.body.classList.remove('panel-closed'));
  $('#diagramClose').addEventListener('click', () => document.body.classList.add('no-diagram'));
  $('#infoBtn').addEventListener('click', () => document.body.classList.add('show-info'));
  $('#infoClose').addEventListener('click', () => document.body.classList.remove('show-info'));
  $('#info').addEventListener('click', (e) => { if (e.target.id === 'info') document.body.classList.remove('show-info'); });

  let toastTimer = 0;
  function toast(big, small, ms) {
    const t = $('#toast');
    t.querySelector('.big').textContent = big;
    t.querySelector('.small').textContent = small;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Işık yolları diyagramı (ekvator düzlemi, JS jeodezik çözücü)         */
  /* ------------------------------------------------------------------ */
  const dg = $('#diagram');
  const dctx = dg.getContext('2d');
  let diagDirty = true, diagPaths = [], diagKey = '', diagView = 20, diagCam = [0, 0], diagRot = 0;
  function computeDiagram() {
    const a = params.spin;
    const R = clamp(plunge.active ? plunge.startR : cam.dist, 6, 40);
    const ph = cam.az;
    const rr = Math.sqrt(R * R + a * a);
    const X = [rr * Math.cos(ph), rr * Math.sin(ph), 0];
    const u = P.staticObserver(X, a);
    if (!u) return;
    const tet = P.cameraTetrad(X, u, [-Math.cos(ph), -Math.sin(ph), 0], [0, 0, 1], a);
    const shadow = Math.asin(Math.min(1, 5.4 / R));
    const amax = Math.min(1.35, shadow * 2.4);
    const N = 41;
    const rh = P.horizon(a);
    diagView = R * 1.08;
    diagCam = [X[0], X[1]];
    diagRot = -Math.PI / 2 - ph;
    diagPaths = [];
    const dv = new Float64Array(7);
    for (let i = 0; i < N; i++) {
      const al = -amax + 2 * amax * i / (N - 1);
      const q = [0, 1, 2, 3].map((k) => tet.Q0[k] + Math.sin(al) * tet.Q1[k] + Math.cos(al) * tet.Q3[k]);
      const sc = 1 / q[0];
      const st = new Float64Array([X[0], X[1], X[2], q[1] * sc, q[2] * sc, q[3] * sc, 0]);
      const pts = [[X[0], X[1]]];
      let fate = 'escape';
      for (let k = 0; k < 4000; k++) {
        const r = P.kerrR(st[0], st[1], st[2], a);
        if (r < rh * 1.01 + 0.004 || Math.hypot(st[3], st[4], st[5]) > 60) { fate = 'capture'; break; }
        if (r > diagView * 1.5) break;
        P.deriv([st[0], st[1], st[2]], [st[3], st[4], st[5]], 1, a, dv);
        const v = Math.hypot(dv[0], dv[1], dv[2]);
        const qq = Math.hypot(st[3], st[4], st[5]), dqq = Math.hypot(dv[3], dv[4], dv[5]);
        P.rk4(st, 1, a, Math.min(0.025 * Math.max(r, 1) / v, 0.1 * qq / Math.max(dqq, 1e-9)));
        pts.push([st[0], st[1]]);
      }
      const len = [0];
      for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      diagPaths.push({ pts, len, fate, al });
    }
    const legend = $('#diagramLegend');
    legend.innerHTML =
      '<i style="background:#8fc3ff"></i>' + T('diag.escape') + ' &nbsp; <i style="background:#c0503a"></i>' + T('diag.capture') + '<br>' +
      '<i style="background:#ffd28a;height:1px"></i>' + T('diag.photon') + ' ' + fmt(P.photonOrbit(a, true), 2) + ' / ' + fmt(P.photonOrbit(a, false), 2) + ' M<br>' +
      '<i style="background:#ffa05a;height:1px"></i>ISCO ' + fmt(P.isco(a), 2) + ' M &nbsp; <i style="background:rgba(255,255,255,.4);height:1px"></i>' + T('diag.ergo');
  }
  function drawDiagram(time) {
    if (document.body.classList.contains('no-diagram') || document.body.classList.contains('hide-ui')) return;
    const key = [params.spin.toFixed(3), Math.round(cam.dist * 4), Math.round(cam.az * 40)].join('|');
    if (diagDirty || key !== diagKey) { computeDiagram(); diagKey = key; diagDirty = false; }
    const W = dg.width, Hh = dg.height;
    const c = dctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, Hh);
    const s = (W * 0.5) / diagView;
    const cr = Math.cos(diagRot), sr = Math.sin(diagRot);
    const map = (x, y) => [W / 2 + s * (x * cr - y * sr), Hh / 2 - s * (x * sr + y * cr)];
    const a = params.spin;
    const circ = (r, style, dash, lw, fill) => {
      c.beginPath();
      c.arc(W / 2, Hh / 2, s * Math.sqrt(r * r + a * a), 0, Math.PI * 2);
      c.setLineDash(dash || []);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (style) { c.strokeStyle = style; c.lineWidth = lw || 1; c.stroke(); }
    };
    // disk
    if (params.disk) {
      const rin = P.isco(a), rout = Math.min(params.rout, diagView * 1.4);
      const g = c.createRadialGradient(W / 2, Hh / 2, s * rin, W / 2, Hh / 2, s * rout);
      g.addColorStop(0, 'rgba(255,190,120,0.30)');
      g.addColorStop(0.35, 'rgba(255,140,60,0.16)');
      g.addColorStop(1, 'rgba(255,120,40,0.0)');
      c.beginPath();
      c.arc(W / 2, Hh / 2, s * Math.sqrt(rout * rout + a * a), 0, Math.PI * 2);
      c.arc(W / 2, Hh / 2, s * Math.sqrt(rin * rin + a * a), 0, Math.PI * 2, true);
      c.fillStyle = g; c.fill();
    }
    // yollar
    for (const p of diagPaths) {
      c.beginPath();
      for (let k = 0; k < p.pts.length; k++) {
        const [x, y] = map(p.pts[k][0], p.pts[k][1]);
        if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.setLineDash([]);
      c.strokeStyle = p.fate === 'capture' ? 'rgba(192,80,58,0.55)' : 'rgba(143,195,255,0.32)';
      c.lineWidth = 1.2;
      c.stroke();
    }
    // ışık kameraya doğru ilerler (yolun ucundan kameraya)
    for (let i = 0; i < diagPaths.length; i++) {
      const p = diagPaths[i];
      if (p.fate === 'capture') continue;
      const L = p.len[p.len.length - 1];
      const ph = (time * 0.00045 * 60 / Math.max(L, 1) + i * 0.137) % 1;
      const target = L * (1 - ph);
      let k = 1;
      while (k < p.len.length - 1 && p.len[k] < target) k++;
      const f = (target - p.len[k - 1]) / Math.max(p.len[k] - p.len[k - 1], 1e-6);
      const x = lerp(p.pts[k - 1][0], p.pts[k][0], f), y = lerp(p.pts[k - 1][1], p.pts[k][1], f);
      const [sx, sy] = map(x, y);
      c.beginPath(); c.arc(sx, sy, 2.2, 0, Math.PI * 2);
      c.fillStyle = 'rgba(210,235,255,0.95)'; c.fill();
    }
    // karakteristik yarıçaplar
    circ(2, 'rgba(255,255,255,0.25)', [3, 4], 1);                         // ergosfer (ekvator)
    circ(P.photonOrbit(a, true), 'rgba(255,210,138,0.6)', [2, 3], 1);    // ileri yönlü foton yörüngesi
    circ(P.photonOrbit(a, false), 'rgba(255,210,138,0.6)', [2, 3], 1);   // geri yönlü
    circ(P.isco(a), 'rgba(255,160,90,0.8)', [1, 3], 1);
    circ(P.horizon(a), 'rgba(255,255,255,0.4)', [], 1, '#000');
    // dönme yönü oku
    c.setLineDash([]);
    if (a > 0.01) {
      const rA = s * Math.sqrt(P.horizon(a) ** 2 + a * a) * 0.62;
      c.beginPath();
      c.arc(W / 2, Hh / 2, rA, -2.3, 0.6, false);
      c.strokeStyle = 'rgba(255,200,140,0.8)'; c.lineWidth = 1.4; c.stroke();
      const ex = W / 2 + rA * Math.cos(0.6), ey = Hh / 2 + rA * Math.sin(0.6);
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + 5, ey - 5); c.lineTo(ex - 5, ey - 2); c.closePath();
      c.fillStyle = 'rgba(255,200,140,0.8)'; c.fill();
    }
    // kamera
    const [cx, cy] = map(diagCam[0], diagCam[1]);
    c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI * 2); c.fillStyle = '#ffb366'; c.fill();
    c.font = '18px -apple-system, system-ui, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillText(T('diag.camera'), cx + 8, cy - 6);
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                  */
  /* ------------------------------------------------------------------ */
  function fmtTime(sec) {
    const a = Math.abs(sec);
    if (a < 1e-3) return fmt(sec * 1e6, 1) + ' µs';
    if (a < 1) return fmt(sec * 1e3, 1) + ' ms';
    if (a < 60) return fmt(sec, 1) + ' ' + T('u.s');
    if (a < 3600) return Math.floor(a / 60) + ' ' + T('u.min') + ' ' + Math.round(a % 60) + ' ' + T('u.s');
    if (a < 86400 * 2) return Math.floor(a / 3600) + ' ' + T('u.h') + ' ' + Math.round((a % 3600) / 60) + ' ' + T('u.min');
    if (a < 86400 * 365 * 2) return fmt(a / 86400, 1) + ' ' + T('u.day');
    return fmt(a / (86400 * 365.25), 1) + ' ' + T('u.yr');
  }
  function fmtLen(km) {
    if (km < 1000) return fmt(km, 1) + ' ' + T('u.km');
    if (km < 1e6) return fmt(km / 1000, 1) + ' ' + T('u.kkm');
    if (km < 1.5e8) return fmt(km / 1e6, 1) + ' ' + T('u.mkm');
    return fmt(km / 1.495978707e8, 2) + ' AU';
  }
  let fpsAvg = 60, frameMsAvg = 16.7;
  function updateHud(camInfo) {
    const a = camInfo.a;
    const M = MASSES[params.mass].m;
    const tg = M * 4.925490947e-6;   // GM/c³ [s]
    const rg = M * 1.476625;         // GM/c² [km]
    const rh = P.horizon(a), rin = P.isco(a);
    const X = camInfo.X;
    const r = P.kerrR(X[0], X[1], X[2], a);
    const dtau = 1 / camInfo.u[0];
    const Tisco = 2 * Math.PI * (Math.pow(rin, 1.5) + a);
    const q = QUALITY[params.quality];
    const lines = [];
    lines.push(`<b>a/M</b> ${fmt(a, 3)}   <b>r<sub>+</sub></b> ${fmt(rh, 3)} M   <b>r<sub>−</sub></b> ${fmt(P.innerHorizon(a), 3)} M`);
    lines.push(`<b>ISCO</b> ${fmt(rin, 3)} M   <b>${T('hud.photon')}</b> ${fmt(P.photonOrbit(a, true), 2)} / ${fmt(P.photonOrbit(a, false), 2)} M`);
    lines.push(`<b>${T('hud.horizonRadius')}</b> <span class="hot">${fmtLen(Math.sqrt(rh * rh + a * a) * rg)}</span>   <b>${T('hud.iscoPeriod')}</b> <span class="hot">${fmtTime(Tisco * tg)}</span>`);
    lines.push(`<b>${T('hud.camera')}</b> r = ${fmt(r, 2)} M · θ = ${fmt(Math.acos(clamp(X[2] / Math.max(r, 1e-6), -1, 1)) / DEG, 1)}°   <b>${T('hud.clock')}</b> <span class="cool">dτ/dt = ${camInfo.inside ? T('hud.insideHorizon') : fmt(dtau, 4)}</span>`);
    lines.push(`<b>${T('hud.sim')}</b> ${params.paused ? T('hud.paused') : T('hud.simRate', { ts: fmt(params.timeScale, 1), real: fmtTime(params.timeScale * tg) })}`);
    if (params.physT || params.object === 'ton618') {
      const qd = quasarState();
      lines.push(`<b>${T('hud.lum')}</b> <span class="hot">${sci(qd.L, 1)} W</span> = ${sci(qd.L / 3.828e26, 1)} L☉ · L/L<sub>Edd</sub> ${fmt(params.edd, 3)}   <b>${T('hud.accr')}</b> ${fmt(qd.mdotSunYr, qd.mdotSunYr < 10 ? 2 : 0)} ${T('u.msunyr')} · η ${fmt(qd.eta, 3)}   <b>BLR</b> ${fmt(qd.blrLd / 365.25, qd.blrLd < 365 ? 2 : 1)} ${T('u.ly')} ≈ ${I.int(qd.blrM)} M`);
    }
    lines.push(`<b>${T('hud.trace')}</b> ${T('hud.traceInfo', { rw, rh: rhgt, ow, oh, n: q.maxSteps, fps: Math.round(fpsAvg) })}`);
    $('#hud').innerHTML = lines.join('\n');

    if (plunge.active) {
      const u = camInfo.u;
      let speed = '';
      if (!camInfo.inside) {
        const us = P.staticObserver(X, a);
        if (us) {
          const g = P.metric(X, a).g;
          const gamma = -P.dot4(g, u, us);
          speed = T('plunge.speed', { v: fmt(Math.sqrt(Math.max(0, 1 - 1 / (gamma * gamma))), 3) });
        }
      }
      const inside = camInfo.inside ? '<div class="inside">' + T('plunge.inside') + '</div>' : '';
      $('#plungeHud').innerHTML = `<div class="r">r = ${fmt(r, 3)} M</div>` +
        `${T('plunge.tau')} = ${fmt(plunge.tau, 2)} M (${fmtTime(plunge.tau * tg)}) ${speed ? '· ' + speed : ''}` + inside +
        `<div style="opacity:.55;margin-top:4px">${T('plunge.help')}</div>`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Dosya kaydetme ve video kaydı                                        */
  /* ------------------------------------------------------------------ */
  function saveBlob(blob, ext) {
    const d = new Date();
    const z = (n) => String(n).padStart(2, '0');
    const aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(blob);
    aEl.download = `black-hole-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.${ext}`;
    aEl.click();
    setTimeout(() => URL.revokeObjectURL(aEl.href), 60000);
  }

  // Yalnız tuval kaydedilir (arayüz değil). Tercih: MP4 (H.264), yoksa WebM.
  const REC_MAX_SEC = 300;
  const REC_MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const rec = { mr: null, stream: null, chunks: [], t0: 0, timer: 0, ext: 'webm', mime: '' };
  const fmtClock = (ms) => {
    const t = Math.floor(ms / 1000);
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  };
  function updateRecUi() {
    const on = !!rec.mr;
    document.body.classList.toggle('recording', on);
    if (recBtn) {
      recBtn.textContent = T(on ? 'act.recStop' : 'act.rec');
      recBtn.classList.toggle('warm', on);
    }
    $('#recText').textContent = T('rec.indicator', { time: fmtClock(on ? performance.now() - rec.t0 : 0) }) + ' · ' + rec.ext.toUpperCase();
  }
  function startRecording() {
    if (rec.mr) return;
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) { toast(T('rec.unsupported.t'), T('rec.unsupported.s'), 4200); return; }
    const mime = REC_MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    // ~0,1 bit/piksel/kare (1080p60 için ≈12 Mb/sn), 6–40 Mb/sn arasında
    const bps = Math.round(clamp(cw * ch * 60 * 0.1, 6e6, 40e6));
    let stream, mr;
    try {
      stream = canvas.captureStream(60);
      mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bps } : { videoBitsPerSecond: bps });
    } catch (e) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      console.error(e);
      toast(T('rec.failed.t'), T('rec.failed.s'), 4200);
      return;
    }
    rec.chunks = [];
    rec.stream = stream;
    rec.mime = mr.mimeType || mime || 'video/webm';
    rec.ext = rec.mime.includes('mp4') ? 'mp4' : 'webm';
    mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
    mr.onstop = finishRecording;
    mr.onerror = () => { if (rec.mr) stopRecording(); };
    try { mr.start(1000); } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      console.error(e);
      toast(T('rec.failed.t'), T('rec.failed.s'), 4200);
      return;
    }
    rec.mr = mr;
    rec.t0 = performance.now();
    rec.timer = setInterval(() => {
      updateRecUi();
      if (performance.now() - rec.t0 > REC_MAX_SEC * 1000) stopRecording(true);
    }, 500);
    histValid = false;
    updateRecUi();
    toast(T('rec.start.t'), T('rec.start.s'), 3200);
  }
  let recLimitHit = false;
  function stopRecording(limit) {
    if (!rec.mr) return;
    recLimitHit = !!limit;
    clearInterval(rec.timer);
    if (rec.mr.state !== 'inactive') rec.mr.stop(); else finishRecording();
  }
  function finishRecording() {
    const dur = performance.now() - rec.t0;
    const chunks = rec.chunks;
    const mime = rec.mime, ext = rec.ext;
    if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
    rec.mr = null; rec.stream = null; rec.chunks = [];
    updateRecUi();
    if (!chunks.length) { toast(T('rec.empty.t'), T('rec.empty.s'), 3600); return; }
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    saveBlob(blob, ext);
    const size = blob.size > 1e6 ? fmt(blob.size / 1e6, 1) + ' MB' : fmt(blob.size / 1e3, 0) + ' KB';
    if (recLimitHit) toast(T('rec.limit.t'), T('rec.limit.s', { min: REC_MAX_SEC / 60 }), 4200);
    else toast(T('rec.saved.t'), T('rec.saved.s', { fmt: ext.toUpperCase(), dur: fmtClock(dur), size }), 3600);
  }
  function toggleRecording() { if (rec.mr) stopRecording(); else startRecording(); }
  $('#rec').addEventListener('click', toggleRecording);
  $('#rec').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRecording(); } });

  // Dil değişince panel, düğmeler, diyagram ve HUD yeniden kurulur
  I.onChange(() => {
    buildPanel();
    updateModeButtons();
    diagDirty = true;
    hudT = 0;
  });

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  let frameIdx = 0;
  let simTime = qs.has('t') ? parseFloat(qs.get('t')) : 0;
  let shotRequested = false;
  let fade = 0;
  let lastCamSig = null;
  // Panel açıkken görüntünün optik merkezini görünür alanın ortasına kaydır (lens kaydırma)
  let centerShift = 0;
  function targetCenterShift() {
    const dpr = cw / Math.max(1, window.innerWidth);
    const open = !rec.mr && !document.body.classList.contains('panel-closed') && !document.body.classList.contains('hide-ui') && window.innerWidth > 900;
    return open ? 170 * dpr : 0;
  }

  function render(camInfo, dt) {
    const q = QUALITY[params.quality];
    const tet = camInfo.T;
    const a = camInfo.a;
    const X = camInfo.X;
    const rCam = P.kerrR(X[0], X[1], X[2], a);
    const rh = P.horizon(a);
    const rin = P.isco(a);
    // dikey ekranlarda yatay görüş çok daralmasın
    const aspect = cw / ch;
    const tanHalf = Math.tan(cam.fov * DEG / 2) * Math.max(1, Math.min(1 / aspect, 2) * 0.8);
    // BLR: iç kenar ≈ yarım Hβ yarıçapı (yüksek iyonlaşma çizgileri içte), dış kenar 2,5 katı
    let blrIn = 100, blrOut = 400;
    if (params.blr > 0) { blrIn = clamp(0.5 * quasarState().blrM, 30, 3000); blrOut = blrIn * 5; }

    // Kamera hareketi → TAA karışımı
    const sig = [X[0], X[1], X[2], tet.eF[1], tet.eF[2], tet.eF[3], cam.fov];
    let moving = 0;
    if (lastCamSig) {
      let d = 0;
      for (let i = 0; i < 3; i++) d += Math.abs(sig[i] - lastCamSig[i]) / Math.max(rCam, 1);
      for (let i = 3; i < 6; i++) d += Math.abs(sig[i] - lastCamSig[i]);
      d += Math.abs(sig[6] - lastCamSig[6]) * 0.01;
      moving = d;
    }
    lastCamSig = sig;
    const animating = !params.paused && params.timeScale > 0;
    let alpha, clampOn = 1, gamma = 1.25;
    if (!histValid) { alpha = 1; histFrames = 0; }
    else if (moving > 0.003) { alpha = 0.55; gamma = 0.9; histFrames = 0; }
    else if (moving > 2e-5 || plunge.active) { alpha = 0.3; gamma = 1.0; histFrames = 0; }
    else if (animating) { alpha = 0.2; histFrames = 0; }
    else { histFrames++; alpha = Math.max(1 / (histFrames + 1), 1 / 64); clampOn = histFrames < 3 ? 1 : 0; }

    const jit = [halton((frameIdx % 16) + 1, 2) - 0.5, halton((frameIdx % 16) + 1, 3) - 0.5];

    // 1) Işın izleme
    gl.bindFramebuffer(gl.FRAMEBUFFER, traceRT.fb);
    gl.viewport(0, 0, rw, rhgt);
    const tr = progs.trace.use();
    tr.set('uRes', [rw, rhgt]).set('uCenter', [rw * 0.5 - centerShift * scale, rhgt * 0.5]).set('uJitter', jit).set('uTanHalfFov', tanHalf)
      .set('uQ0', tet.Q0).set('uQ1', tet.Q1).set('uQ2', tet.Q2).set('uQ3', tet.Q3)
      .set('uCamPos', X).set('uA', a).set('uRh', rh).set('uInside', camInfo.inside ? 1 : 0)
      .set('uMaxSteps', q.maxSteps).set('uStepK', q.stepK).set('uResc', Math.max(2.2 * rCam, 90))
      .set('uTime', simTime)
      .set('uDiskOn', params.disk ? 1 : 0).set('uRin', rin).set('uRout', Math.max(params.rout, rin + 1)).set('uRprofMax', PROF_RMAX)
      .set('uTmax', params.temp).set('uBeaming', params.beaming).set('uDiskDensity', params.density)
      .set('uDiskBright', params.bright).set('uTurb', params.turb).set('uFlowT', 70.0)
      .set('uHaze', params.haze * (params.interstellar ? 1.6 : 1.0)).set('uHazeH', params.interstellar ? 0.07 : 0.045)
      .set('uLumNorm', 1 / bbLum(params.temp)).set('uInterstellar', params.interstellar ? 1 : 0).set('uBolo', params.bolo ? 1 : 0)
      .set('uBBN', BB_N).set('uBBlogMin', Math.log(BB_TMIN)).set('uBBlogRange', Math.log(BB_TMAX / BB_TMIN))
      .set('uProfN', PROF_N)
      .set('uSkyBright', params.skyBright).set('uStarBright', params.starBright).set('uStarsOn', params.stars ? 1 : 0)
      .set('uGrid', params.grid ? 1 : 0).set('uPixAng', 2 * tanHalf / rhgt)
      .set('uJetOn', params.jet ? 1 : 0).set('uJetBright', 1.0)
      .set('uCorona', params.corona).set('uWind', params.wind).set('uBLR', params.blr)
      .set('uBlrIn', blrIn).set('uBlrOut', blrOut).set('uFrame', frameIdx % 4096);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bbTex); tr.set('uBB', 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, profTex); tr.set('uProf', 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyTex); tr.set('uSky', 2);
    const gq = gpuBegin();
    draw();
    gpuEnd(gq);

    const gpq = gpuBegin();
    // 2) TAAU (zamansal üst örnekleme)
    if (alpha < 0.999) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, neighRT.fb);
      gl.viewport(0, 0, rw, rhgt);
      progs.neigh.use();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, traceRT.tex); progs.neigh.set('uCur', 0);
      draw();
    }
    const src = histRT[histIdx], dst = histRT[histIdx ^ 1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, ow, oh);
    progs.taa.use().set('uAlpha', alpha).set('uClampOn', clampOn).set('uGamma', gamma)
      .set('uCurSize', [rw, rhgt]).set('uOutSize', [ow, oh]).set('uJitter', jit);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, traceRT.tex); progs.taa.set('uCur', 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.tex); progs.taa.set('uHist', 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, neighRT.mu); progs.taa.set('uMu', 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, neighRT.sig); progs.taa.set('uSig', 3);
    draw();
    histIdx ^= 1;
    histValid = true;
    const hdr = histRT[histIdx];

    // 3) Bloom
    let prev = hdr;
    const dn = progs.down.use();
    for (let i = 0; i < bloomRT.length; i++) {
      const t = bloomRT[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.viewport(0, 0, t.w, t.h);
      dn.set('uTexel', [1 / prev.w, 1 / prev.h]).set('uFirst', i === 0 ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, prev.tex); dn.set('uSrc', 0);
      draw();
      prev = t;
    }
    let ehtLevel = 0;
    if (params.eht) {
      // EHT ışın genişliği ≈ gölge yarıçapının ~%55'i (M87*: 20 µas / 42 µas halka çapı)
      const shadowPx = Math.asin(Math.min(1, 5.2 / Math.max(rCam, 5.3))) / (2 * tanHalf / rhgt);
      const sigmaPx = shadowPx * 0.55 / 2.355;
      ehtLevel = clamp(Math.floor(Math.log2(Math.max(sigmaPx, 1) / 0.9)), 0, bloomRT.length - 1);
    } else {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const up = progs.up.use();
      for (let i = bloomRT.length - 1; i > 0; i--) {
        const s = bloomRT[i], d = bloomRT[i - 1];
        gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb);
        gl.viewport(0, 0, d.w, d.h);
        up.set('uTexel', [1 / s.w, 1 / s.h]).set('uWeight', 1.0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex); up.set('uSrc', 0);
        draw();
      }
      gl.disable(gl.BLEND);
    }

    if (params.eht) {
      if (!maxRT) maxRT = createTarget(1, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, maxRT.fb);
      gl.viewport(0, 0, 1, 1);
      progs.maxlum.use();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloomRT[ehtLevel].tex); progs.maxlum.set('uSrc', 0);
      draw();
    }

    // Düşüşte otomatik pozlama (yalnız karartır; referans = düşüş başlangıcı)
    const aeOn = plunge.active && !params.eht;
    if (aeOn) {
      if (!aeRT) aeRT = [createTarget(1, 1), createTarget(1, 1)];
      const lvl = bloomRT[Math.min(4, bloomRT.length - 1)];
      gl.bindFramebuffer(gl.FRAMEBUFFER, aeRT[aeIdx ^ 1].fb);
      gl.viewport(0, 0, 1, 1);
      const ae = progs.autoexp.use();
      ae.set('uBlend', 1 - Math.exp(-dt * 3.0)).set('uReset', aeReset ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, lvl.tex); ae.set('uSrc', 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, aeRT[aeIdx].tex); ae.set('uPrev', 1);
      draw();
      aeIdx ^= 1;
      aeReset = false;
    } else {
      aeReset = true;
    }

    // 4) Birleştirme
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cw, ch);
    const cp = progs.comp.use();
    const et = bloomRT[ehtLevel];
    cp.set('uHDRSize', [ow, oh]).set('uEHTSize', [et.w, et.h])
      .set('uExposure', params.exposure * (params.eht ? 0.9 : 1)).set('uBloomStr', params.bloom * 0.05 / Math.max(1, bloomRT.length / 6))
      .set('uVignette', 0.32).set('uGrain', 0.006).set('uTime', performance.now() * 0.001).set('uEHT', params.eht ? 1 : 0)
      .set('uFade', fade * tour.fade).set('uSharpen', clamp(0.12 + (1 - scale) * 0.25, 0, 0.3));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hdr.tex); cp.set('uHDR', 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomRT[0].tex); cp.set('uBloom', 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, et.tex); cp.set('uEHTSrc', 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, maxRT ? maxRT.tex : et.tex); cp.set('uEHTMax', 3);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, aeRT ? aeRT[aeIdx].tex : et.tex); cp.set('uAE', 4);
    cp.set('uAEOn', aeOn ? 1 : 0);
    draw();
    gpuEnd(gpq, gpuPost);

    if (shotRequested) {
      shotRequested = false;
      canvas.toBlob((b) => {
        if (b) saveBlob(b, 'png');
      }, 'image/png');
      toast(T('shot.t'), T('shot.s'));
    }
    frameIdx++;
  }

  function renderSkyView() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cw, ch);
    progs.skyview.use();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyTex); progs.skyview.set('uSky', 0);
    draw();
  }

  /* ------------------------------------------------------------------ */
  /* Ana döngü                                                            */
  /* ------------------------------------------------------------------ */
  let lastT = 0, lastResChange = 0, hudT = 0, started = false, startT = 0;
  const debugSky = qs.get('debug') === 'sky';
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastT = now; return; }
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 1 / 60;
    const frameMs = lastT ? now - lastT : 16.7;
    lastT = now;
    checkSize();
    if (debugSky) { renderSkyView(); const ld = $('#loading'); if (ld) ld.remove(); document.body.classList.add('hide-ui'); return; }

    if (!params.paused) simTime += dt * params.timeScale;
    if (plunge.active) {
      stepPlunge(dt);
      if (plunge.ending) {
        const e = (now - plunge.ending) / 1000;
        fade = clamp(1 - (e - 0.8) / 1.2, 0, 1);
        if (e > 2.4) { endPlunge(false); toast(T('plunge.back'), ''); }
      }
    } else {
      fade = Math.min(1, fade + dt / 1.6);
    }
    updateTour(now);
    const camInfo = updateCamera(dt);
    const cs = targetCenterShift();
    if (Math.abs(cs - centerShift) > 0.5) { centerShift += (cs - centerShift) * (1 - Math.exp(-dt * 5)); histValid = histValid && Math.abs(cs - centerShift) < 2; }
    else centerShift = cs;
    render(camInfo, dt);

    // Uyarlanır çözünürlük
    if (started) {
      frameMsAvg = frameMsAvg * 0.92 + frameMs * 0.08;
      fpsAvg = 1000 / frameMsAvg;
      if (params.autoRes && !fixedScale && now - lastResChange > 600 && now - startT > 1500) {
        const maxS = QUALITY[params.quality].maxScale;
        const g = gpuQ.avg;
        const slow = frameMsAvg > 21 || (g > 0 && g > 12);
        const fast = frameMsAvg < 14.5 && (g === 0 || g < 6.5);
        if (slow && scale > 0.34) { setScale(scale * 0.87); lastResChange = now; }
        else if (fast && scale < maxS - 0.01) { setScale(Math.min(maxS, scale * 1.07)); lastResChange = now; }
      }
    }
    if (now - hudT > 250) { hudT = now; updateHud(camInfo); }
    drawDiagram(now);
    if (!started) {
      started = true;
      startT = now;
      const ld = $('#loading');
      ld.style.opacity = 0;
      setTimeout(() => ld.remove(), 1300);
      setTimeout(() => { $('#hint').style.opacity = 0; }, 9000);
    }
  }

  buildPanel();
  updateObjectUi();
  if (params.object === 'ton618') { const d = $('#panel details[data-sec="sec.quasar"]'); if (d) d.open = true; }
  if (qs.get('ui') === '0') document.body.classList.add('hide-ui');
  if (qs.get('panel') === '0' || window.innerWidth < 1280) document.body.classList.add('panel-closed');
  if (qs.get('diagram') === '0' || window.innerWidth < 1400) document.body.classList.add('no-diagram');
  if (params.eht) document.body.classList.add('eht');
  updateModeButtons();
  checkSize();
  // Gökyüzünü bir sonraki karede üret (yükleme ekranı görünsün)
  requestAnimationFrame(() => {
    try { buildSky(); } catch (e) { fail(T('err.sky', { msg: e.message })); return; }
    fade = qs.has('nofade') ? 1 : 0;
    if (qs.get('tour') === '1') startTour();
    requestAnimationFrame(frame);
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(T('err.ctx')); });

  // GPU zaman ölçümü (varsa): ışın izleme geçişinin süresi
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const gpuQ = { pending: [], avg: 0 };
  const gpuPost = { pending: [], avg: 0 };
  function gpuBegin() {
    if (!tq) return null;
    const q = gl.createQuery();
    gl.beginQuery(tq.TIME_ELAPSED_EXT, q);
    return q;
  }
  function gpuEnd(q, acc) {
    if (!q) return;
    acc = acc || gpuQ;
    gl.endQuery(tq.TIME_ELAPSED_EXT);
    acc.pending.push(q);
    while (acc.pending.length) {
      const f = acc.pending[0];
      if (!gl.getQueryParameter(f, gl.QUERY_RESULT_AVAILABLE)) break;
      const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
      const ns = gl.getQueryParameter(f, gl.QUERY_RESULT);
      if (!disjoint) acc.avg = acc.avg ? acc.avg * 0.9 + ns / 1e6 * 0.1 : ns / 1e6;
      gl.deleteQuery(f);
      acc.pending.shift();
    }
  }
  async function bench(scales, ms) {
    const out = [];
    const wait = (t) => new Promise((r) => setTimeout(r, t));
    for (const sc of scales) {
      setScale(sc);
      await wait(800);
      gpuQ.avg = 0;
      let n = 0; const t0 = performance.now();
      await new Promise((res) => { const f = () => { n++; if (performance.now() - t0 < (ms || 2000)) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      out.push({ scale: sc, px: rw + 'x' + rhgt, fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), traceGpuMs: +gpuQ.avg.toFixed(2) });
    }
    return out;
  }
  // Test/otomasyon için dışa açık durum
  window.__bh = { params, cam, plunge, tour, startTour, stopTour, startPlunge, applyPreset, setMode, setObject, P, setScale, onParam, bench, hasTimer: !!tq, gpuQ, gpuPost, get scale() { return scale; }, get fps() { return fpsAvg; } };
})();
