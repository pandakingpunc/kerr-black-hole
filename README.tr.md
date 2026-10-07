# Kerr Kara Deliği

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23139593.svg)](https://doi.org/10.5281/zenodo.23139593)

Dönen (Kerr) bir kara deliğin tarayıcıda, WebGL2 ile çalışan gerçek zamanlı genel görelilik ışın izleyicisi. Derleme adımı, bağımlılık ve dış dosya yok: gökyüzü, yıldızlar, Samanyolu ve yığılma diski dokusu tamamen kodla üretilir.

**[Canlı demo](https://pandakingpunc.github.io/kerr-black-hole/)** · [English](README.md) · Türkçe

![Fiziksel görünüm](screenshots/physical.png)

## Özellikler

- **Gerçek jeodezik ışın izleme.** Her piksel için ışık, kameradan geriye doğru eğri uzay-zamanda izlenir. Denklemler Kerr-Schild koordinatlarında Hamilton biçiminde, analitik türevlerle ve uyarlanır adımlı 4. derece Runge-Kutta ile GPU'da çözülür.
- **Fiziksel yığılma diski.** Novikov-Thorne (Page-Thorne) sıcaklık profili, ISCO'da iç kenar, Doppler ışıması, kütleçekimsel kırmızıya kayma, kara cisim renkleri ve ışığın yol süresi.
- **Gölge, foton halkası ve mercekleme.** Hızlı dönen deliğin D biçimli gölgesi, Einstein halkası ve gökyüzüne ızgara çizen lens haritası.
- **Kara deliğe düşüş.** Kamera olay ufkunu geçen gerçek bir zamansı jeodezik izler.
- **EHT gözüyle:** 1,3 mm VLBI çözünürlüğünde M87* benzeri görüntü.
- **TON 618 kuasar kipi.** Sol üstteki *Kerr / TON 618* düğmesiyle (ya da `Q`) bilinen en büyük kara deliklerden birine geçilir: 4,07×10¹⁰ M☉, L ≈ 4×10⁴⁰ W, z = 2,219. Disk sıcaklığı kütle, dönme ve parlaklıktan hesaplanır (Page-Thorne akısı, yaklaşık 25.000 K: disk mavi-beyazdır); kuasarın çevresi eklenir: sıcak X-ışını koronası, huni biçimli disk rüzgârı, jet ve ölçülen yarıçap-parlaklık ilişkisine göre birkaç yüz M ötedeki geniş çizgi bölgesi bulutları. Geri dönünce önceki ayarların geri gelir.
- **Göreli jet**, Interstellar tarzı kalın disk, ışık yolları diyagramı, açıklamalı otomatik tur ve 9 hazır sahne.
- **Video kaydı ve ekran görüntüsü:** `R` ile MP4 (veya WebM) kaydı, `S` ile PNG.
- **İngilizce ve Türkçe arayüz.** Varsayılan İngilizcedir; sol üstteki EN/TR düğmesiyle değişir ve seçim hatırlanır (`?lang=tr` ile de açılabilir).

![TON 618 kuasar kipi](screenshots/ton618.png)

## Çalıştırma

`index.html` dosyasını güncel bir tarayıcıda açın ya da klasörü bir statik sunucuyla sunun:

```bash
python -m http.server 8000
```

**WebGL2** ve `EXT_color_buffer_float` desteği gerekir (güncel Chrome, Edge, Firefox veya Safari). Çözünürlük, yaklaşık 60 fps için otomatik ayarlanır.

TON 618 kipi doğrudan `?object=ton618` (ya da `?preset=ton618`) ile açılabilir. Kısayollar, URL parametreleri, doğrulama sonuçları ve proje yapısı için [English README](README.md) bölümlerine bakın.

## Alıntı

Bu yazılımı çalışmanızda kullanırsanız lütfen atıf yapın. DOI [10.5281/zenodo.23139593](https://doi.org/10.5281/zenodo.23139593) her zaman en güncel sürüme (Zenodo arşivi) çözülür. Bilgiler [`CITATION.cff`](CITATION.cff) dosyasında; GitHub'daki **Cite this repository** düğmesi BibTeX ve APA çıktısı verir.

## Lisans

[MIT](LICENSE)
