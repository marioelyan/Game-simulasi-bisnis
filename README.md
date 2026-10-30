# Konglomerat

Simulasi bisnis web: mulai dari modal Rp500.000, merintis dari usaha kecil,
dan menang saat total aset mencapai Rp50 miliar. Semua keputusan punya
sebab-akibat; dibuat serealistik mungkin seperti bisnis sungguhan.

## Status

Tahap A: mesin inti + 1 bidang (kuliner). Alur: riset pasar 3 lapis →
persiapan satu per satu (tempat, lokasi, peralatan, izin, menu, supplier,
stok awal, opsional) → loop harian (cek pagi → keputusan → simulasi →
laporan malam + kewajiban). Sistem yang jalan: rumus permintaan lengkap
(dasar × harga × reputasi × musim × pesaing × tempat × noise ber-seed),
supplier berkarakter (harga, kirim, tempo, keandalan, hubungan),
bangkrut 3 lapis + jalan keluar darurat, pajak fondasi (PPh final 0,5%
omzet/bulan), pinjaman normal & darurat, menang/kalah.

Tahap B: karyawan (rekrutmen bebas, kandidat berganti tiap 7 hari,
skill↔gaji, kapasitas + kualitas, gaji bulanan sebagai kewajiban,
moral sederhana, PHK bebas) dan event (situasi + pilihan, panel pagi,
kecil ~mingguan, besar ~bulanan dengan masa tenggang, tidak pernah
langsung membangkrutkan; 6 event: viral, kompetitor baru, supplier
bangkrut, pesanan besar, alat rusak, ulasan viral).

Tahap C: mesin jadi field-driven — 40 bidang bisa dipilih (19 barang,
21 jasa), riset 3 lapis per bidang dengan hasil tersimpan dan bisa
dibandingkan, persiapan memakai data bidang itu (tempat, peralatan,
izin, produk/jasa, peran karyawan). Bidang jasa menjual kapasitas
harian yang hangus di akhir hari. Data bidang di `bidang.js`
(dari PERSIAPAN.md + angka tuning sementara).

Tahap D: holding — multi-unit dengan kas per unit, kas holding,
dividen (unit → holding) dan suntik modal (holding → unit),
eksekutif (manajer per unit = autopilot latar: bayar kewajiban,
beli bahan, produksi; CEO = permintaan semua unit +5%; direktur =
biaya input semua unit −5%), tutup unit (bangkrut satu unit =
dilikuidasi rugi ke kas holding, holding selamat) vs bangkrut
holding (kas holding negatif + tunggakan holding + tidak ada unit
bisa dividen), menang = total aset holding Rp50 miliar. Loop
holding = ringkasan + pengecualian saja.

Catatan Tahap C: lokasi masih tier generik (per-bidang menyusul
sebagai pendalaman data); beberapa bidang dimodelkan sederhana
(mis. keuangan mikro, kos, kendaraan bekas — kelayakannya terlihat
dari riset, bukan dari gembok, sesuai konsep). Catatan Tahap D:
manajer belum punya moral (pendalaman nanti); riset dibayar dari
kas unit aktif; event unit latar menunggu sampai unit dikelola lagi.

Belum ada (tahap berikutnya): visual final/audio/distribusi
(Tahap E).

## Cara main

Buka `index.html` di browser (atau sajikan folder ini lewat server file
statis apa pun). Tidak ada backend, tidak ada database, tidak ada proses
build. Save tersimpan di browser (localStorage).

1. Riset: gambaran kasar (gratis) → laporan detail → uji pasar.
2. Persiapan: pilih tempat, lokasi, peralatan, urus izin, pilih menu,
   pilih supplier per input, siapkan stok awal, ambil opsional.
3. Buka usaha, lalu tiap hari: beli bahan (pilih supplier, tunai/tempo),
   produksi, atur harga, jalankan hari.
4. Bayar kewajiban tepat waktu (sewa, tempo supplier, pajak). Kas negatif
   = peringatan; tunggakan = denda dan reputasi turun; vonis bangkrut =
   game over dengan laporan.

## Arsitektur

- HTML + CSS + JavaScript murni, tanpa engine game.
- Mesin deterministik ber-seed: input sama menghasilkan output sama.
- Produk, supplier, tempat, lokasi, peralatan = DATA (bukan kode):
  nambah isi tidak mengubah mesin.
- State + fungsi simulasi + tampilan dipisah; `app.js` bisa dites dari
  Node (`node --check app.js`) karena logikanya tidak bergantung pada DOM.

## Catatan

Angka-angka (harga, sewa, tempo, denda, musim) masih sementara dan bisa
di-tuning — yang dikunci adalah sistemnya, bukan angkanya.

## Lisensi

© 2026 Mario Elyansyah. Game ini gratis dimainkan. Kode, data, dan
asetnya hak cipta penuh (all rights reserved) — tidak boleh disalin,
diubah, didistribusikan ulang, atau dijual tanpa izin tertulis.
Repo ini sengaja tanpa file LICENSE: tidak ada lisensi open source
yang berlaku.
