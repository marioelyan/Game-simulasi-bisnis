# Simulasi Bisnis

Simulasi bisnis 2D klik-klik untuk umum: belajar bisnis dan menguji ide
dengan uang palsu sebelum mempertaruhkan uang asli. Bukan game akademik.

## Status

Tahap 1: irisan vertikal — satu toko, satu produk (dimsum), loop
beli bahan &rarr; produksi &rarr; jual. Judul game belum diputuskan.

## Cara main

Buka `index.html` di browser (atau sajikan folder ini lewat server file
statis apa pun). Tidak ada backend, tidak ada database, tidak ada proses
build. Save tersimpan di browser (localStorage).

1. Beli bahan: daging ayam dan kulit pangsit.
2. Produksi dimsum (1 dimsum = 1 ayam + 1 kulit).
3. Atur harga jual.
4. Klik "Hari Berikutnya": pelanggan membeli otomatis sesuai harga dan stok.

## Arsitektur

- HTML + CSS + JavaScript murni, tanpa engine game.
- Mesin deterministik ber-seed: input sama menghasilkan output sama.
- State + fungsi simulasi + tampilan dipisah; `app.js` bisa dites dari
  Node (`node --check app.js`) karena logikanya tidak bergantung pada DOM.

## Rencana berikutnya

Riset pasar tiga jalur (Amati, Tanya, Uji Jual) + buku catatan, pasar
multi-produk (F&B dan non-F&B, harga dunia nyata), kompetitor NPC,
barang basi, utang, dan mode karier lengkap. Angka-angka saat ini masih
sementara dan bisa di-tuning.
