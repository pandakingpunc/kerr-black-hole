/*
 * Kütle çekim dalgası gerinim grafiği (h₊ — t), düz Canvas 2D.
 * GWChart.create(canvas, { label }) → { setSeries, setMerger, setCursor, setInfo, draw, resize }
 * Arka plan şeffaf (kutunun CSS'i sağlar); çizim CSS pikseli cinsinden, dpr ile ölçekli.
 * draw() her karede çağrılır: font/etiket/kesikli desen önbellekli, bellek ayırmaz.
 */
(function (root) {
  'use strict';

  // index.html paleti
  const C = {
    text: 'rgba(233,236,243,.82)',     // eksen başlıkları, bilgi satırları
    dim: 'rgba(233,236,243,.55)',      // grafik başlığı
    zero: 'rgba(233,236,243,.25)',     // sıfır çizgisi
    frame: 'rgba(255,255,255,.10)',   // alt eksen
    wave: 'rgba(255,214,150,.95)',    // dalga formu (sıcak beyaz)
    waveDim: 'rgba(255,214,150,.30)', // imleç sonrası: "gelecek"
    merger: 'rgba(192,80,58,.8)',     // birleşme işareti (kırık kırmızı)
    cursor: 'rgba(255,255,255,.45)',  // imleç çizgisi
    dot: '#fff',
    halo: 'rgba(255,255,255,.16)'
  };
  const DASH_Z = [2, 4], DASH_M = [3, 3], DASH_0 = [];

  function create(canvas, opts) {
    opts = opts || {};
    const label = typeof opts.label === 'function' ? opts.label : function (k) { return k; };
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

    // durum — draw() içinde ayırma yapmamak için hep skaler/önbellekli
    let dpr = 1, W = 0, H = 0, fontT = '', fontS = '';
    let tArr = null, hArr = null, n = 0;               // seri
    let t0 = 0, t1 = 1, hMax = 1;                      // eksen aralığı (hMax: %10 paylı)
    let tMerge = NaN, curT = NaN, info = null;
    let tiRaw = null, tiUp = '';                       // başlık önbelleği (toLocaleUpperCase pahalı)
    let mlRaw = '', mlW = 0, mDirty = true;            // birleşme etiketi genişliği
    let px0 = 0, px1 = 0, pyT = 0, pyB = 0, kx = 1, kh = 1, ycen = 0; // seg() için alan

    function lab(k) {           // label() daima string döndürsün
      const s = label(k);
      return typeof s === 'string' ? s : k;
    }
    function crisp(v) {         // 1 px yatay/düşey çizgileri cihaz pikseline hizala
      return (Math.round(v * dpr - dpr * 0.5) + dpr * 0.5) / dpr;
    }
    function upperBound(v) {    // t[i] <= v olan örnek sayısı (seri monoton)
      let lo = 0, hi = n;
      while (lo < hi) { const m = (lo + hi) >> 1; if (tArr[m] <= v) lo = m + 1; else hi = m; }
      return lo;
    }
    function seg(a, b) {        // [a,b) dalga parçası; NaN örneklerde kalemi kaldır
      if (b - a < 2) return;
      ctx.beginPath();
      let pen = false;
      for (let i = a; i < b; i++) {
        const tv = tArr[i], hv = hArr[i];
        if (tv !== tv || hv !== hv) { pen = false; continue; }
        const x = px0 + (tv - t0) * kx, y = ycen - hv * kh;
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
      if (pen) ctx.stroke();          // boş yol (tümü NaN) üstüne stroke çekme
    }

    function setSeries(ts, hs) {
      tArr = ts || null; hArr = hs || null;
      n = tArr && hArr ? Math.min(tArr.length, hArr.length) : 0;
      let lo = Infinity, hi = -Infinity, am = 0;
      for (let i = 0; i < n; i++) {
        const tv = tArr[i], hv = hArr[i];
        if (tv === tv) { if (tv < lo) lo = tv; if (tv > hi) hi = tv; }
        if (hv === hv) { const a = hv < 0 ? -hv : hv; if (a > am && a < Infinity) am = a; }
      }
      if (hi > lo) { t0 = lo; t1 = hi; }                 // x ekseni tüm seriyi kapsar
      else if (lo !== Infinity) { t0 = lo - 0.5; t1 = lo + 0.5; }
      else { t0 = 0; t1 = 1; }
      hMax = am > 0 ? am * 1.1 : 1;                      // %10 tavan payı
    }
    function setMerger(t) { tMerge = typeof t === 'number' && t === t ? t : NaN; }
    function setCursor(t) { curT = typeof t === 'number' && t === t ? t : NaN; }
    function setInfo(lines) { info = Array.isArray(lines) ? lines : null; }

    function resize() {
      if (!ctx) return;
      dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w; canvas.height = h;
      W = w / dpr; H = h / dpr;
      const fam = getComputedStyle(canvas).fontFamily || 'system-ui, sans-serif';
      fontT = '500 9.5px ' + fam;                        // #diagramBox h3 gibi
      fontS = '9.5px ' + fam;
      mDirty = true;                                     // ölçülen etiket genişliği eskiyor
    }

    function draw() {
      if (!ctx) return;
      const d = Math.min(root.devicePixelRatio || 1, 2);
      if (d !== dpr || canvas.width !== Math.max(1, Math.round(canvas.clientWidth * d)) ||
          canvas.height !== Math.max(1, Math.round(canvas.clientHeight * d))) resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (W < 40 || H < 40) return;

      // çizim alanı: solda döndürülmüş eksen başlığı, altta zaman başlığı, üstte başlık/bilgi
      const ni = info ? Math.min(info.length, 4) : 0;
      const x0 = 18, x1 = W - 10, yT = Math.max(26, 8 + 11 * ni), yB = H - 17;
      px0 = x0; px1 = x1; pyT = yT; pyB = yB;
      ycen = (yT + yB) * 0.5;
      kx = (x1 - x0) / (t1 - t0);
      kh = (yB - yT) * 0.5 / hMax;

      // başlık — iri harf aralıklı, soluk (h3 görünümü)
      const raw = lab('gw.title');
      if (raw !== tiRaw) {
        tiRaw = raw;
        let up;
        try { up = raw.toLocaleUpperCase(document.documentElement.lang || undefined); }
        catch (e) { up = raw.toUpperCase(); }
        tiUp = up;
      }
      ctx.font = fontT; ctx.fillStyle = C.dim;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.letterSpacing = '1.9px';                     // desteklemeyen tarayıcıda etkisiz
      ctx.fillText(tiUp, x0 - 2, 4);
      ctx.letterSpacing = '0px';

      // eksen başlıkları
      ctx.font = fontS; ctx.fillStyle = C.text;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(lab('gw.time'), (x0 + x1) * 0.5, yB + 4);
      ctx.save();
      ctx.translate(8, ycen);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'middle';
      ctx.fillText(lab('gw.strain'), 0, 0);
      ctx.restore();

      // alt eksen ve soluk sıfır çizgisi
      ctx.lineWidth = 1; ctx.setLineDash(DASH_0);
      ctx.strokeStyle = C.frame;
      ctx.beginPath(); ctx.moveTo(x0, crisp(yB)); ctx.lineTo(x1, crisp(yB)); ctx.stroke();
      ctx.strokeStyle = C.zero; ctx.setLineDash(DASH_Z);
      ctx.beginPath(); ctx.moveTo(x0, crisp(ycen)); ctx.lineTo(x1, crisp(ycen)); ctx.stroke();
      ctx.setLineDash(DASH_0);

      // dalga formu: imleçe kadar parlak, sonrası ("gelecek") soluk
      let split = n;
      if (curT === curT && n > 0) split = upperBound(curT);
      if (n > 0) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = C.wave;
        seg(0, split);
        ctx.strokeStyle = C.waveDim;
        seg(split > 0 ? split - 1 : 0, n);              // bir nokta örtüşür, boşluk kalmasın
      }

      // birleşme: kesikli dikey çizgi + etiket
      if (tMerge === tMerge && tMerge >= t0 && tMerge <= t1) {
        const xm = crisp(x0 + (tMerge - t0) * kx);
        ctx.strokeStyle = C.merger; ctx.lineWidth = 1;
        ctx.setLineDash(DASH_M);
        ctx.beginPath(); ctx.moveTo(xm, yT); ctx.lineTo(xm, yB); ctx.stroke();
        ctx.setLineDash(DASH_0);
        const ml = lab('gw.merger');
        if (ml !== mlRaw || mDirty) {
          mlRaw = ml; mDirty = false;
          ctx.font = fontS;
          mlW = ctx.measureText(ml).width;             // yalnız değişince ölç
        }
        ctx.font = fontS; ctx.fillStyle = C.merger; ctx.textBaseline = 'top';
        if (xm + 5 + mlW > x1) { ctx.textAlign = 'right'; ctx.fillText(ml, xm - 4, yT + 2); }
        else { ctx.textAlign = 'left'; ctx.fillText(ml, xm + 4, yT + 2); }
      }

      // imleç: beyaz çizgi + dalga üzerindeki nokta (doğrusal ara değer)
      if (curT === curT) {
        const xc = crisp(Math.min(Math.max(x0 + (curT - t0) * kx, x0), x1));
        ctx.strokeStyle = C.cursor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xc, yT); ctx.lineTo(xc, yB); ctx.stroke();
        let hv = NaN;
        if (n > 0) {
          const j = split - 1, k = split;
          if (j < 0) hv = hArr[0];
          else if (k >= n) hv = hArr[n - 1];
          else {
            const dt = tArr[k] - tArr[j];
            const f = dt > 0 ? (curT - tArr[j]) / dt : 0;
            hv = hArr[j] + (hArr[k] - hArr[j]) * f;
          }
        }
        if (hv === hv) {
          const y = ycen - hv * kh;
          ctx.beginPath(); ctx.arc(xc, y, 5, 0, Math.PI * 2); ctx.fillStyle = C.halo; ctx.fill();
          ctx.beginPath(); ctx.arc(xc, y, 2.4, 0, Math.PI * 2); ctx.fillStyle = C.dot; ctx.fill();
        }
      }

      // bilgi satırları (sağ üst köşe)
      if (info && info.length) {
        ctx.font = fontS; ctx.fillStyle = C.text;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        for (let i = 0; i < info.length; i++) {
          const s = info[i];
          if (typeof s === 'string' && s) ctx.fillText(s, x1, 4 + i * 11);
        }
      }
    }

    return {
      setSeries: setSeries,
      setMerger: setMerger,
      setCursor: setCursor,
      setInfo: setInfo,
      draw: draw,
      resize: resize
    };
  }

  const api = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GWChart = api;
})(typeof window !== 'undefined' ? window : this);
