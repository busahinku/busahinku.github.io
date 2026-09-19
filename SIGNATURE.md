# Ana sayfa imzası

Ana sayfada görünen imza doğrudan `public/signature.svg` dosyasından gelir.
Animasyon yoktur. Yeni imzayı siteye koymak için bu dosyayı aynı adla
değiştirmek yeterlidir; başka bir kodu düzenlemek gerekmez.

## Android tablette hazırlama

Kalemle en rahat seçenek **Concepts** uygulamasıdır. SVG dışa aktarma Pro
özelliğidir; uygulamayı sadece bu iş için kullanacaksan önce deneme/ücret
ekranını kontrol et.

1. Yeni bir çizim aç ve arka planı şeffaf bırak.
2. Siyah renkli **Fixed Width** ya da **Wire** kalemini seç. Bu iki kalem SVG
   aktarımında en temiz sonucu verir.
3. İmzayı tek seferde ya da doğal kullandığın kadar ayrı çizgiyle çiz.
4. İmzayı seç; böylece dışa aktarım alanı yalnızca imza olur.
5. **Export → Selection → SVG** yolunu izle, **Include Background** seçeneğini
   kapat ve kaydet.
6. Dosyanın adını `signature.svg` yapıp projedeki `public` klasörüne bırak;
   mevcut dosyanın üzerine yaz.

Ücretsiz yol istersen Android tarayıcısından **Method Draw** açılabilir; bu,
kurulum istemeyen açık kaynaklı bir SVG çizim aracıdır. Çizimi SVG olarak
indirirken yine siyah imza ve şeffaf arka plan kullan. Beyaz bir arka plan
dikdörtgeni bırakma; aksi halde sitede imza yerine dolu bir kutu görünür.
