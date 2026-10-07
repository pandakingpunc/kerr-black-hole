/*
 * Arayüz dili (English / Türkçe). Varsayılan: English.
 * Öncelik: ?lang=tr|en  >  localStorage  >  en
 * HTML'de data-i18n (metin) ve data-i18n-title (başlık) öznitelikleri kullanılır;
 * kod tarafında I18N.t(anahtar, {değişken}) çağrılır.
 */
(function (root) {
  'use strict';

  const STR = {
    en: {
      'doc.title': 'Kerr Black Hole · Real-time General Relativistic Ray Tracing',
      'ui.title': 'Kerr Black Hole',
      'ui.subtitle': 'Real-time general-relativistic ray tracing · Kerr-Schild geodesics',
      'ui.info': 'What am I looking at? (I)',
      'ui.settings': 'Settings',
      'ui.loading': 'Building spacetime',
      'ui.hint': 'Drag: rotate · Wheel: zoom · Q: TON 618 quasar · T: auto tour · H: hide UI · Space: pause time · F: fullscreen · S: screenshot · R: record video',
      'ui.eht': 'EHT simulation · 1.3 mm VLBI resolution (Gaussian filter)',
      'ui.close': 'Close',
      'ui.language': 'Language',
      'ui.object': 'Object (Q)',
      'ui.title.ton618': 'TON 618',
      'ui.subtitle.ton618': 'Hyperluminous quasar · 40.7 billion M☉ · z = 2.219',

      'obj.kerr.t': 'Kerr black hole',
      'obj.kerr.s': 'Back to the generic rotating black hole',
      'obj.ton618.t': 'TON 618',
      'obj.ton618.s': 'Hyperluminous quasar · 40.7 billion M☉ · its light left 10.8 billion years ago',

      'mode.cinematic': 'Cinematic',
      'mode.orbit': 'Free',
      'mode.plunge': 'Fall into the black hole',
      'mode.tour': 'Auto tour',

      'diag.title': 'Light paths · equatorial plane',
      'diag.hide': 'Hide',
      'diag.camera': 'camera',
      'diag.escape': 'escaping ray',
      'diag.capture': 'falls into horizon',
      'diag.photon': 'photon orbit',
      'diag.ergo': 'ergosphere',

      'info.title': 'What am I looking at?',
      'info.sub': 'A real-time general-relativistic simulation of a rotating (Kerr) black hole',
      'info.ray.h': 'Ray tracing',
      'info.ray.p': 'For every pixel, a ray of light is traced backwards from the camera through curved spacetime. The geodesic equations are solved in Kerr-Schild coordinates in Hamiltonian form, with analytic derivatives and an adaptive-step 4th-order Runge-Kutta integrator. There are no prebuilt images or external files: the sky, the stars, the Milky Way and the disk texture are all generated in code.',
      'info.shadow.h': 'Shadow and photon ring',
      'info.shadow.p': 'The dark region in the middle is not the event horizon itself but the boundary of the rays captured by the photon sphere. The thin bright ring at its edge is light that has orbited the hole one or more times before escaping. As the spin (a/M) increases the shadow becomes D-shaped: light travelling in the direction of the spin can get closer to the hole.',
      'info.lens.h': 'Why the disk appears above and below',
      'info.lens.p': 'Light from the back half of the disk is bent over and under the hole on its way to you. That is why a flat disk looks like a ring wrapped around the hole. The background stars are bent the same way, producing an Einstein ring and double images.',
      'info.color.h': 'Color and brightness asymmetry',
      'info.color.p': 'The inner disk orbits at nearly half the speed of light. The side approaching you is blueshifted and brightened by the Doppler effect; the receding side is reddened and dimmed. Everything near the horizon also suffers gravitational redshift. The disk is locally a blackbody: the observed color comes from a Planck curve at temperature g·T, and the brightness from the g⁴ law.',
      'info.disk.h': 'Disk model',
      'info.disk.p': 'The temperature profile is the Novikov-Thorne (Page-Thorne) thin-disk solution; the inner edge sits at the innermost stable circular orbit (ISCO). The gas rotates at Kerr Keplerian speeds, and turbulence is stretched into arcs by differential rotation. Light travel time is also accounted for: you see the far side of the disk slightly as it was in the past.',
      'info.fall.h': 'Falling into the black hole',
      'info.fall.p': 'The camera follows a true timelike geodesic. Because Kerr-Schild coordinates are regular at the horizon, you can cross it; inside, r has to decrease like a time coordinate. For a rotating hole the simulation stops at the inner (Cauchy) horizon, for a non-rotating one at the singularity.',
      'info.ton.h': 'TON 618 and quasars (Q)',
      'info.ton.p': 'TON 618 is a hyperluminous, radio-loud quasar at redshift z = 2.219: its light set out about 10.8 billion years ago. It shines at about 4×10⁴⁰ W, roughly 10¹⁴ times the Sun, and its black hole is estimated at about 41 billion solar masses (older estimates reach 66 billion). In G = c = M = 1 units every black hole of a given spin casts the same shadow, so this mode changes the physics around it. The disk temperature follows from the mass, spin and luminosity: about 25,000 K, so the disk glows blue-white instead of orange (the heavier the hole, the cooler its disk). A hot X-ray corona wraps the inner disk, a wind of gas driven by ultraviolet light streams away from the disk, a jet runs along the spin axis, and the broad-line region, the clouds lit by the quasar that produce its broad emission lines, orbits a few hundred M out, about two light-years. A non-rotating hole of this mass would have a horizon radius of about 800 AU, 27 times Neptune\'s orbit; gas at the ISCO takes about two months to go around once. The corona, wind and clouds are simplified, illustrative models; the disk, lensing and shifts are computed as everywhere else.',
      'info.valid.h': 'Validation',
      'info.valid.p': 'The same physics core was tested in Node.js against analytic results (dev/test_physics.js): the Schwarzschild shadow angle and the Kerr equatorial critical impact parameters (a = 0, 0.5, 0.9, 0.99) agree to five digits; the ISCO and photon orbits are exact; free-fall proper time matches the analytic value within 0.01%. The GPU image was measured too: for a = 0 the shadow diameter is 392 pixels (analytic 393.1); for a = 0.9 the edges of the asymmetric shadow are at 849 and 1215 pixels (CPU reference 848.7 and 1216.0).',
      'info.keys': 'Drag: orbit · Shift + drag: look around · Wheel: zoom · C: cinematic · O: free · D: fall into the black hole · Q: TON 618 / Kerr · 1-9: preset scenes · T: auto tour · Space: pause time · H: UI · P: panel · F: fullscreen · S: screenshot · R: record video · I: this card',

      'sec.bh': 'Black hole',
      'sec.cam': 'Camera',
      'sec.disk': 'Accretion disk',
      'sec.rel': 'Relativity',
      'sec.quasar': 'Quasar',
      'sec.sky': 'Sky',
      'sec.img': 'Image',
      'sec.presets': 'Preset scenes',
      'sec.tools': 'Tools',

      'p.spin': 'Spin parameter a/M',
      'p.mass': 'Mass scale (for units)',
      'n.bh': 'The image is computed in G = c = M = 1 units; the mass only scales real lengths and times (and, when the disk temperature follows the luminosity, sets it).',
      'p.dist': 'Distance',
      'p.incl': 'Inclination (from spin axis)',
      'p.fov': 'Field of view',
      'p.roll': 'Roll',
      'p.plungeSpeed': 'Fall speed',
      'p.disk': 'Show disk',
      'p.temp': 'Peak temperature',
      'p.rout': 'Outer radius',
      'p.density': 'Optical depth',
      'p.turb': 'Turbulence',
      'p.haze': 'Hot corona',
      'p.bright': 'Brightness',
      'p.timeScale': 'Time flow',
      'p.paused': 'Pause time (Space)',
      'p.beaming': 'Doppler + gravitational shift',
      'p.bolo': 'Bolometric brightness (g⁴)',
      'p.interstellar': 'Interstellar-style thick disk',
      'n.rel': 'The disk is locally a blackbody; the observed spectrum is a Planck curve at temperature g·T, and the color shifts accordingly. With bolometric on, brightness scales with the total energy (g⁴); off, only the visible band counts (the Wien tail almost extinguishes the receding side). 0% shift: like the film.',
      'p.edd': 'Luminosity (L/L_Edd)',
      'p.physT': 'Disk temperature from luminosity',
      'p.corona': 'X-ray corona',
      'p.wind': 'Disk wind (outflow)',
      'p.blr': 'Broad-line region clouds',
      'n.quasar': 'With the temperature tied to luminosity, the Novikov-Thorne peak follows from σT⁴ = F(r)·Ṁc⁶/(GM)² with Ṁ = L/(ηc²): heavier holes have cooler disks (TON 618 about 25,000 K, a stellar-mass hole in X-rays). The broad-line region radius follows the measured radius-luminosity relation of quasars (Bentz et al. 2013).',
      'off': 'off',
      'p.stars': 'Stars',
      'p.starBright': 'Star brightness',
      'p.skyBright': 'Milky Way',
      'p.grid': 'Lens map (coordinate grid)',
      'p.jet': 'Relativistic jet (M87-like)',
      'p.exposure': 'Exposure',
      'p.bloom': 'Bloom',
      'p.quality': 'Ray-tracing quality',
      'p.autoRes': 'Adaptive resolution (60 fps target)',
      'p.eht': 'EHT view (1.3 mm VLBI)',
      'u.Mps': 'M/s',
      'steps': '{n} steps',
      'shortcut': 'Shortcut: {n}',

      'act.plunge': 'Fall into the black hole',
      'act.tour': 'Auto tour (T)',
      'act.shot': 'Screenshot',
      'act.fs': 'Fullscreen',
      'act.hideUi': 'Hide UI (H)',
      'act.closePanel': 'Close panel (P)',
      'act.diagram': 'Light-path diagram',
      'act.rec': 'Record video (R)',
      'act.recStop': 'Stop recording (R)',

      'q.dusuk': 'Low',
      'q.orta': 'Medium',
      'q.yuksek': 'High',
      'q.ultra': 'Ultra',

      'mass.sgra': 'Sgr A* · 4.3 million M☉',
      'mass.m87': 'M87* · 6.5 billion M☉',
      'mass.garg': 'Gargantua · 100 million M☉',
      'mass.stellar': 'Stellar mass · 10 M☉',
      'mass.ton618': 'TON 618 · 40.7 billion M☉',

      'preset.fiziksel': 'Physical view',
      'preset.gargantua': 'Interstellar style',
      'preset.kutup': 'Over the pole',
      'preset.kenar': 'Exactly edge-on',
      'preset.yakin': 'Close pass',
      'preset.lens': 'Lens map',
      'preset.m87': 'M87* · EHT view',
      'preset.jet': 'Relativistic jet',
      'preset.ton618': 'TON 618 quasar',

      'tour.fiziksel.t': 'Physical view',
      'tour.fiziksel.s': 'The approaching side is bright and bluish from Doppler shift; the receding side is dim and red',
      'tour.gargantua.t': 'Interstellar style',
      'tour.gargantua.s': 'a = 0.99 · color shift off · rapid spin flattens the shadow into a D shape',
      'tour.kutup.t': 'Over the pole',
      'tour.kutup.s': 'The disk is seen face-on; a thin photon ring wraps all the way around the shadow',
      'tour.yakin.t': 'Close pass',
      'tour.yakin.s': 'At 7.5 M most of the field of view is bent light',
      'tour.lens.t': 'Lens map',
      'tour.lens.s': 'A grid drawn on the sky: the Einstein ring and nested images',
      'tour.m87.t': 'M87* through the EHT',
      'tour.m87.s': 'The same physics at 1.3 mm VLBI resolution: a look-alike of the 2019 photograph',
      'tour.jet.t': 'Relativistic jet',
      'tour.jet.s': 'Plasma near light speed along the spin axis, boosted by Doppler beaming',
      'tour.ton618.t': 'TON 618',
      'tour.ton618.s': 'A 40-billion-solar-mass quasar: a blue-white disk, X-ray corona, outflowing wind, jet and broad-line clouds',
      'tour.plunge.t': 'Falling into the black hole',
      'tour.plunge.s': 'A true free-fall geodesic: into the event horizon',

      'plunge.start.t': 'Free fall',
      'plunge.start.s': 'Released from rest · the camera follows a true timelike geodesic',
      'plunge.horizon.t': 'Event horizon crossed',
      'plunge.horizon.s': 'Light can no longer escape · you can still see the outside universe',
      'plunge.sing.t': 'Singularity',
      'plunge.sing.s': 'r → 0 · every path inside the Schwarzschild interior ends here',
      'plunge.cauchy.t': 'Inner (Cauchy) horizon',
      'plunge.cauchy.s': 'r = r₋ · the limit of classical general relativity',
      'plunge.back': 'Back in orbit',
      'plunge.tau': 'proper time τ',
      'plunge.speed': 'speed relative to a static observer {v} c',
      'plunge.inside': 'you are inside the event horizon · r now behaves like a time coordinate',
      'plunge.help': 'drag: look around · Esc: exit',

      'hud.photon': 'photon sphere',
      'hud.horizonRadius': 'horizon radius',
      'hud.iscoPeriod': 'ISCO period',
      'hud.camera': 'camera',
      'hud.clock': 'clock rate',
      'hud.insideHorizon': '(inside horizon)',
      'hud.sim': 'simulation',
      'hud.paused': 'paused',
      'hud.simRate': '{ts} M/s = {real}/s',
      'hud.lum': 'luminosity',
      'hud.accr': 'accretion',
      'u.msunyr': 'M☉/yr',
      'u.ly': 'light-years',
      'hud.trace': 'ray tracing',
      'hud.traceInfo': '{rw}×{rh} → {ow}×{oh} TAAU · max {n} steps · RK4 · {fps} fps',

      'u.s': 's',
      'u.min': 'min',
      'u.h': 'h',
      'u.day': 'days',
      'u.yr': 'years',
      'u.km': 'km',
      'u.kkm': 'thousand km',
      'u.mkm': 'million km',

      'shot.t': 'Screenshot',
      'shot.s': 'Downloaded as PNG',

      'rec.start.t': 'Recording',
      'rec.start.s': 'Only the render is captured, not the interface · R to stop',
      'rec.saved.t': 'Video saved',
      'rec.saved.s': '{fmt} · {dur} · {size}',
      'rec.limit.t': 'Recording stopped',
      'rec.limit.s': '{min}-minute limit reached · the video was saved',
      'rec.unsupported.t': 'Recording not supported',
      'rec.unsupported.s': 'This browser cannot record the canvas. Use a current Chrome, Edge or Firefox.',
      'rec.failed.t': 'Recording failed',
      'rec.failed.s': 'The browser could not start the recorder',
      'rec.empty.t': 'Nothing recorded',
      'rec.empty.s': 'The recording contained no frames',
      'rec.indicator': 'REC {time}',
      'rec.stopHint': 'Click to stop',

      'err.webgl2': 'This browser does not support WebGL2. Open it in a current Chrome, Edge, Firefox or Safari.',
      'err.float': 'This GPU does not support floating-point render targets (EXT_color_buffer_float).',
      'err.shader': 'Shader compilation failed: {msg}',
      'err.sky': 'Could not generate the sky: {msg}',
      'err.ctx': 'The GPU context was lost. Reload the page.',
    },

    tr: {
      'doc.title': 'Kerr Kara Deliği · Gerçek Zamanlı Genel Görelilik Işın İzleme',
      'ui.title': 'Kerr Kara Deliği',
      'ui.subtitle': 'Gerçek zamanlı genel görelilik ışın izleme · Kerr-Schild jeodezikleri',
      'ui.info': 'Neyi görüyorsun? (I)',
      'ui.settings': 'Ayarlar',
      'ui.loading': 'Uzay-zaman kuruluyor',
      'ui.hint': 'Sürükle: döndür · Tekerlek: yaklaş · Q: TON 618 kuasarı · T: otomatik tur · H: arayüz · Boşluk: zamanı durdur · F: tam ekran · S: ekran görüntüsü · R: video kaydı',
      'ui.eht': 'EHT benzetimi · 1,3 mm VLBI çözünürlüğü (Gauss süzgeci)',
      'ui.close': 'Kapat',
      'ui.language': 'Dil',
      'ui.object': 'Nesne (Q)',
      'ui.title.ton618': 'TON 618',
      'ui.subtitle.ton618': 'Aşırı parlak kuasar · 40,7 milyar M☉ · z = 2,219',

      'obj.kerr.t': 'Kerr kara deliği',
      'obj.kerr.s': 'Genel dönen kara deliğe dönüldü',
      'obj.ton618.t': 'TON 618',
      'obj.ton618.s': 'Aşırı parlak kuasar · 40,7 milyar M☉ · ışığı 10,8 milyar yıl önce yola çıktı',

      'mode.cinematic': 'Sinematik',
      'mode.orbit': 'Serbest',
      'mode.plunge': 'Kara deliğe düş',
      'mode.tour': 'Otomatik tur',

      'diag.title': 'Işık yolları · ekvator',
      'diag.hide': 'Gizle',
      'diag.camera': 'kamera',
      'diag.escape': 'kaçan ışın',
      'diag.capture': 'ufka düşen',
      'diag.photon': 'foton yörüngesi',
      'diag.ergo': 'ergosfer',

      'info.title': 'Neyi görüyorsun?',
      'info.sub': 'Dönen (Kerr) bir kara deliğin gerçek zamanlı genel görelilik simülasyonu',
      'info.ray.h': 'Işın izleme',
      'info.ray.p': 'Her piksel için bir ışık ışını kameradan geriye doğru, eğri uzay-zamanda izlenir. Jeodezik denklemleri Kerr-Schild koordinatlarında Hamilton biçiminde, analitik türevlerle ve uyarlanır adımlı 4. derece Runge-Kutta ile çözülür. Hiçbir hazır görüntü ya da dış dosya yok: gökyüzü, yıldızlar, Samanyolu ve disk dokusu tamamen kodla üretilir.',
      'info.shadow.h': 'Gölge ve foton halkası',
      'info.shadow.p': 'Ortadaki karanlık bölge olay ufkunun kendisi değil, foton küresine yakalanan ışınların sınırıdır. Kenarındaki ince parlak halka, deliğin etrafında bir ya da daha çok kez dolanıp kaçan ışıktır. Dönme (a/M) arttıkça gölge D biçimini alır: dönmeyle aynı yönde giden ışık deliğe daha çok yaklaşabilir.',
      'info.lens.h': 'Diskin üstte ve altta görünmesi',
      'info.lens.p': 'Diskin arka yarısından gelen ışık deliğin üstünden ve altından bükülerek sana ulaşır. Bu yüzden düz bir disk, deliği saran bir halka gibi görünür. Arka plandaki yıldızlar da aynı şekilde bükülür, Einstein halkası ve çift görüntüler oluşur.',
      'info.color.h': 'Renk ve parlaklık asimetrisi',
      'info.color.p': 'İç disk ışık hızının yarısına yakın döner. Sana yaklaşan taraf Doppler etkisiyle maviye kayar ve parlar, uzaklaşan taraf kızarır ve söner. Ufka yakın her şey ayrıca kütleçekimsel kırmızıya kaymaya uğrar. Disk yerel olarak kara cisimdir; gözlenen renk g·T sıcaklığındaki Planck eğrisinden, parlaklık g⁴ yasasından gelir.',
      'info.disk.h': 'Disk modeli',
      'info.disk.p': 'Sıcaklık profili Novikov-Thorne (Page-Thorne) ince disk çözümüdür; iç kenar en içteki kararlı dairesel yörüngededir (ISCO). Gaz Kerr Kepler hızlarıyla döner, türbülans diferansiyel dönmeyle yaylara çekilir. Işığın yol süresi de hesaba katılır: diskin arka tarafını biraz daha eski haliyle görürsün.',
      'info.fall.h': 'Kara deliğe düşüş',
      'info.fall.p': 'Kamera gerçek bir zamansı jeodezik izler. Kerr-Schild koordinatları ufukta tekil olmadığı için ufkun içine de girilir; içeride r bir zaman koordinatı gibi azalmak zorundadır. Dönen delikte iç ufukta (Cauchy ufku), dönmeyen delikte tekillikte simülasyon durur.',
      'info.ton.h': 'TON 618 ve kuasarlar (Q)',
      'info.ton.p': 'TON 618, kırmızıya kayması z = 2,219 olan aşırı parlak, radyo-gürültülü bir kuasardır: ışığı yaklaşık 10,8 milyar yıl önce yola çıktı. Yaklaşık 4×10⁴⁰ W ile, yani Güneş\'in kabaca 10¹⁴ katı parlaklıkla ışır; kara deliğinin kütlesi yaklaşık 41 milyar Güneş kütlesi olarak tahmin edilir (eski tahminler 66 milyara kadar çıkar). G = c = M = 1 birimlerinde aynı dönmeye sahip her kara delik aynı gölgeyi düşürür; bu yüzden bu kip çevresindeki fiziği değiştirir. Disk sıcaklığı kütle, dönme ve parlaklıktan hesaplanır: yaklaşık 25.000 K, bu yüzden disk turuncu değil mavi-beyaz parlar (delik ne kadar ağırsa diski o kadar soğuktur). İç diski sıcak bir X-ışını koronası sarar, morötesi ışığın ittiği bir gaz rüzgârı diskten uzaklaşır, dönme ekseni boyunca bir jet uzanır; kuasarın aydınlattığı ve geniş tayf çizgilerini üreten bulutlardan oluşan geniş çizgi bölgesi birkaç yüz M ötede, yaklaşık iki ışık yılı uzakta döner. Bu kütlede dönmeyen bir deliğin ufuk yarıçapı yaklaşık 800 AU olurdu, Neptün yörüngesinin 27 katı; ISCO\'daki gaz bir turunu yaklaşık iki ayda atar. Korona, rüzgâr ve bulutlar basitleştirilmiş, betimleyici modellerdir; disk, mercekleme ve kaymalar simülasyonun geri kalanındaki gibi hesaplanır.',
      'info.valid.h': 'Doğrulama',
      'info.valid.p': 'Aynı fizik çekirdeği Node.js ile analitik sonuçlara karşı test edildi (dev/test_physics.js): Schwarzschild gölge açısı ve Kerr ekvatoral kritik etki parametreleri (a = 0; 0,5; 0,9; 0,99) beş basamak uyumlu; ISCO ve foton yörüngeleri tam; serbest düşüş özzamanı analitik değerle %0,01 içinde. GPU görüntüsü de ölçüldü: a = 0 için gölge çapı 392 piksel (analitik 393,1), a = 0,9 için asimetrik gölgenin kenarları 849 ve 1215 piksel (CPU referansı 848,7 ve 1216,0).',
      'info.keys': 'Sürükle: yörüngede döndür · Shift + sürükle: etrafına bak · Tekerlek: yaklaş · C: sinematik · O: serbest · D: kara deliğe düş · Q: TON 618 / Kerr · 1-9: hazır sahneler · T: otomatik tur · Boşluk: zamanı durdur · H: arayüz · P: panel · F: tam ekran · S: ekran görüntüsü · R: video kaydı · I: bu kart',

      'sec.bh': 'Kara delik',
      'sec.cam': 'Kamera',
      'sec.disk': 'Yığılma diski',
      'sec.rel': 'Görelilik',
      'sec.quasar': 'Kuasar',
      'sec.sky': 'Gökyüzü',
      'sec.img': 'Görüntü',
      'sec.presets': 'Hazır sahneler',
      'sec.tools': 'Araçlar',

      'p.spin': 'Dönme parametresi a/M',
      'p.mass': 'Kütle ölçeği (birimler için)',
      'n.bh': 'Görüntü G = c = M = 1 birimlerinde hesaplanır; kütle yalnızca gerçek uzunluk ve süreleri ölçekler (disk sıcaklığı parlaklıktan hesaplanıyorsa onu da belirler).',
      'p.dist': 'Uzaklık',
      'p.incl': 'Eğim (dönme eksenine göre)',
      'p.fov': 'Görüş açısı',
      'p.roll': 'Yatış (roll)',
      'p.plungeSpeed': 'Düşüş hızı',
      'p.disk': 'Diski göster',
      'p.temp': 'En yüksek sıcaklık',
      'p.rout': 'Dış yarıçap',
      'p.density': 'Optik kalınlık',
      'p.turb': 'Türbülans',
      'p.haze': 'Sıcak korona',
      'p.bright': 'Parlaklık',
      'p.timeScale': 'Zaman akışı',
      'p.paused': 'Zamanı durdur (Boşluk)',
      'p.beaming': 'Doppler + kütleçekimsel kayma',
      'p.bolo': 'Bolometrik parlaklık (g⁴)',
      'p.interstellar': 'Interstellar tarzı kalın disk',
      'n.rel': 'Disk yerel olarak kara cisimdir; gözlenen tayf g·T sıcaklığında Planck eğrisidir, renk buna göre kayar. Bolometrik açıkken parlaklık toplam enerjiyle (g⁴) ölçeklenir; kapalıyken yalnız görünür bant (Wien kuyruğu uzaklaşan tarafı neredeyse söndürür). %0 kayma: filmdeki gibi.',
      'p.edd': 'Parlaklık (L/L_Edd)',
      'p.physT': 'Disk sıcaklığı parlaklıktan',
      'p.corona': 'X-ışını koronası',
      'p.wind': 'Disk rüzgârı (dışa akış)',
      'p.blr': 'Geniş çizgi bölgesi bulutları',
      'n.quasar': 'Sıcaklık parlaklığa bağlıyken Novikov-Thorne tepe değeri σT⁴ = F(r)·Ṁc⁶/(GM)², Ṁ = L/(ηc²) ile hesaplanır: ağır deliklerin diski daha soğuktur (TON 618 yaklaşık 25.000 K, yıldız kütleli bir delik X-ışınında). Geniş çizgi bölgesinin yarıçapı kuasarlarda ölçülen yarıçap-parlaklık ilişkisinden gelir (Bentz vd. 2013).',
      'off': 'kapalı',
      'p.stars': 'Yıldızlar',
      'p.starBright': 'Yıldız parlaklığı',
      'p.skyBright': 'Samanyolu',
      'p.grid': 'Lens haritası (koordinat ızgarası)',
      'p.jet': 'Göreli jet (M87 benzeri)',
      'p.exposure': 'Pozlama',
      'p.bloom': 'Işıma (bloom)',
      'p.quality': 'Işın izleme kalitesi',
      'p.autoRes': 'Uyarlanır çözünürlük (60 fps hedefi)',
      'p.eht': 'EHT gözüyle (1,3 mm VLBI)',
      'u.Mps': 'M/sn',
      'steps': '{n} adım',
      'shortcut': 'Kısayol: {n}',

      'act.plunge': 'Kara deliğe düş',
      'act.tour': 'Otomatik tur (T)',
      'act.shot': 'Ekran görüntüsü',
      'act.fs': 'Tam ekran',
      'act.hideUi': 'Arayüzü gizle (H)',
      'act.closePanel': 'Paneli kapat (P)',
      'act.diagram': 'Işık yolları diyagramı',
      'act.rec': 'Video kaydı (R)',
      'act.recStop': 'Kaydı durdur (R)',

      'q.dusuk': 'Düşük',
      'q.orta': 'Orta',
      'q.yuksek': 'Yüksek',
      'q.ultra': 'Ultra',

      'mass.sgra': 'Sgr A* · 4,3 milyon M☉',
      'mass.m87': 'M87* · 6,5 milyar M☉',
      'mass.garg': 'Gargantua · 100 milyon M☉',
      'mass.stellar': 'Yıldız kütleli · 10 M☉',
      'mass.ton618': 'TON 618 · 40,7 milyar M☉',

      'preset.fiziksel': 'Fiziksel görünüm',
      'preset.gargantua': 'Interstellar tarzı',
      'preset.kutup': 'Kutup üstünden',
      'preset.kenar': 'Tam kenardan',
      'preset.yakin': 'Yakın geçiş',
      'preset.lens': 'Lens haritası',
      'preset.m87': 'M87* · EHT gözüyle',
      'preset.jet': 'Göreli jet',
      'preset.ton618': 'TON 618 kuasarı',

      'tour.fiziksel.t': 'Fiziksel görünüm',
      'tour.fiziksel.s': 'Yaklaşan taraf Doppler etkisiyle parlak ve mavimsi, uzaklaşan taraf sönük ve kızıl',
      'tour.gargantua.t': 'Interstellar tarzı',
      'tour.gargantua.s': 'a = 0,99 · renk kayması kapalı · hızlı dönme gölgeyi D biçiminde basıklaştırır',
      'tour.kutup.t': 'Kutup üstünden',
      'tour.kutup.s': 'Disk yüzden görünür; ince foton halkası gölgeyi çepeçevre sarar',
      'tour.yakin.t': 'Yakın geçiş',
      'tour.yakin.s': '7,5 M uzaklıkta görüş alanının büyük kısmı bükülmüş ışıktır',
      'tour.lens.t': 'Lens haritası',
      'tour.lens.s': 'Gökyüzüne çizilen ızgara: Einstein halkası ve iç içe görüntüler',
      'tour.m87.t': 'M87* · EHT gözüyle',
      'tour.m87.s': 'Aynı fizik 1,3 mm VLBI çözünürlüğünde: 2019 fotoğrafının benzeri',
      'tour.jet.t': 'Göreli jet',
      'tour.jet.s': 'Dönme ekseni boyunca ışık hızına yakın plazma, Doppler ile güçlenir',
      'tour.ton618.t': 'TON 618',
      'tour.ton618.s': '40 milyar Güneş kütleli bir kuasar: mavi-beyaz disk, X-ışını koronası, dışa akan rüzgâr, jet ve geniş çizgi bulutları',
      'tour.plunge.t': 'Kara deliğe düşüş',
      'tour.plunge.s': 'Gerçek serbest düşüş jeodeziği: olay ufkunun içine',

      'plunge.start.t': 'Serbest düşüş',
      'plunge.start.s': 'Durgun halden bırakıldın · kamera gerçek bir zamansı jeodezik izliyor',
      'plunge.horizon.t': 'Olay ufku geçildi',
      'plunge.horizon.s': 'Işık artık dışarı çıkamaz · yine de dışarıdaki evreni görmeye devam ediyorsun',
      'plunge.sing.t': 'Tekillik',
      'plunge.sing.s': 'r → 0 · Schwarzschild iç bölgesinde her yol buraya çıkar',
      'plunge.cauchy.t': 'İç ufuk (Cauchy ufku)',
      'plunge.cauchy.s': 'r = r₋ · klasik genel göreliliğin öngörü sınırı',
      'plunge.back': 'Yörüngeye dönüldü',
      'plunge.tau': 'özzaman τ',
      'plunge.speed': 'durağan gözlemciye göre hız {v} c',
      'plunge.inside': 'olay ufkunun içindesin · r artık bir zaman koordinatı gibi davranıyor',
      'plunge.help': 'sürükle: etrafına bak · Esc: çık',

      'hud.photon': 'foton küresi',
      'hud.horizonRadius': 'ufuk yarıçapı',
      'hud.iscoPeriod': 'ISCO turu',
      'hud.camera': 'kamera',
      'hud.clock': 'saat hızı',
      'hud.insideHorizon': '(ufuk içi)',
      'hud.sim': 'simülasyon',
      'hud.paused': 'durdu',
      'hud.simRate': '{ts} M/sn = {real}/sn',
      'hud.lum': 'ışıma gücü',
      'hud.accr': 'yığılma',
      'u.msunyr': 'M☉/yıl',
      'u.ly': 'ışık yılı',
      'hud.trace': 'ışın izleme',
      'hud.traceInfo': '{rw}×{rh} → {ow}×{oh} TAAU · en çok {n} adım · RK4 · {fps} fps',

      'u.s': 'sn',
      'u.min': 'dk',
      'u.h': 'sa',
      'u.day': 'gün',
      'u.yr': 'yıl',
      'u.km': 'km',
      'u.kkm': 'bin km',
      'u.mkm': 'milyon km',

      'shot.t': 'Ekran görüntüsü',
      'shot.s': 'PNG olarak indirildi',

      'rec.start.t': 'Kayıt başladı',
      'rec.start.s': 'Yalnız görüntü kaydedilir, arayüz değil · durdurmak için R',
      'rec.saved.t': 'Video kaydedildi',
      'rec.saved.s': '{fmt} · {dur} · {size}',
      'rec.limit.t': 'Kayıt durdu',
      'rec.limit.s': '{min} dakikalık sınıra ulaşıldı · video kaydedildi',
      'rec.unsupported.t': 'Kayıt desteklenmiyor',
      'rec.unsupported.s': 'Bu tarayıcı tuvali kaydedemiyor. Güncel Chrome, Edge veya Firefox kullanın.',
      'rec.failed.t': 'Kayıt başarısız',
      'rec.failed.s': 'Tarayıcı kaydediciyi başlatamadı',
      'rec.empty.t': 'Kayıt boş',
      'rec.empty.s': 'Kayıtta hiç kare yok',
      'rec.indicator': 'KAYIT {time}',
      'rec.stopHint': 'Durdurmak için tıkla',

      'err.webgl2': 'Bu tarayıcı WebGL2 desteklemiyor. Güncel Chrome, Edge, Firefox veya Safari ile açın.',
      'err.float': 'Bu GPU yüzen noktalı render hedeflerini (EXT_color_buffer_float) desteklemiyor.',
      'err.shader': 'Gölgelendirici derlenemedi: {msg}',
      'err.sky': 'Gökyüzü üretilemedi: {msg}',
      'err.ctx': 'GPU bağlamı kaybedildi. Sayfayı yenileyin.',
    },
  };

  const LANGS = ['en', 'tr'];
  const listeners = [];
  let lang = 'en';

  function detect() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (LANGS.includes(q)) return q;
    } catch (e) { /* yoksay */ }
    try {
      const s = localStorage.getItem('bh-lang');
      if (LANGS.includes(s)) return s;
    } catch (e) { /* localStorage kapalı olabilir */ }
    return 'en';
  }

  function t(key, vars) {
    let s = (STR[lang] && STR[lang][key]) ?? STR.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  // Ondalık biçimi: İngilizce nokta, Türkçe virgül
  function num(v, d) {
    const s = v.toFixed(d);
    return lang === 'tr' ? s.replace('.', ',') : s;
  }
  function int(v) {
    return Math.round(v).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
  }

  function apply(scope) {
    const r = scope || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    r.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    document.documentElement.lang = lang;
    document.title = t('doc.title');
  }

  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l;
    try { localStorage.setItem('bh-lang', l); } catch (e) { /* yoksay */ }
    apply();
    listeners.forEach((fn) => fn(lang));
  }

  lang = detect();
  root.I18N = {
    t, num, int, apply, setLang,
    get lang() { return lang; },
    onChange(fn) { listeners.push(fn); },
  };
  if (typeof document !== 'undefined') {
    document.querySelectorAll('#lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    apply();
  }
})(window);
