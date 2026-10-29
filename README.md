# Simulasi Bisnis

Simulasi bisnis 2D klik-klik untuk umum: belajar bisnis dan menguji ide
dengan uang palsu sebelum mempertaruhkan uang asli. Bukan game akademik.

## Status

Tahap 1: irisan vertikal. Alur awal: pemain mulai dengan modal Rp 500.000,
melihat peluang, lalu MEMILIH usaha dari set awal yang dibatasi. Setelah
usaha dibuka, loop beli bahan &rarr; produksi &rarr; jual berjalan.
Judul game belum diputuskan.

## Cara main

Buka `index.html` di browser (atau sajikan folder ini lewat server file
statis apa pun). Tidak ada backend, tidak ada database, tidak ada proses
build. Save tersimpan di browser (localStorage).

1. Pilih usaha dari daftar (perhatikan sinyal permintaannya).
2. Beli bahan.
3. Produksi (1 produk = 1 unit tiap bahan).
4. Atur harga jual.
5. Klik "Hari Berikutnya": pelanggan membeli otomatis sesuai harga dan stok.

## Arsitektur

- HTML + CSS + JavaScript murni, tanpa engine game.
- Mesin deterministik ber-seed: input sama menghasilkan output sama.
- Produk adalah DATA (bukan kode): nambah produk tidak mengubah mesin.
- State + fungsi simulasi + tampilan dipisah; `app.js` bisa dites dari
  Node (`node --check app.js`) karena logikanya tidak bergantung pada DOM.

## Rencana berikutnya

Riset pasar tiga jalur (Amati, Tanya, Uji Jual) + buku catatan, pasar
multi-produk yang diperluas (F&B dan non-F&B, harga dunia nyata),
kompetitor NPC, barang basi, utang, dan mode karier lengkap.
Angka-angka saat ini masih sementara dan bisa di-tuning.
