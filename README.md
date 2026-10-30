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

Belum ada (tahap berikutnya): karyawan (Tahap B), event (Tahap B),
39 bidang sisanya (Tahap C), holding (Tahap D), visual final/audio/
distribusi/lisensi (Tahap E). Daftar persiapan 40 bidang ada di
KONSEP.md (kuliner) dan PERSIAPAN.md (bidang 2–40, draf yang disetujui).

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
