// Simulasi Bisnis — Tahap 1: irisan vertikal.
// Alur awal (perubahan desain 30 Okt dini hari): pemain mulai dengan modal,
// MELIHAT PELUANG dulu, lalu MEMILIH usaha dari set awal yang dibatasi.
// Baru setelah usaha dibuka, loop beli -> produksi -> jual berjalan.
// Produk adalah DATA (bukan kode): nambah produk tidak mengubah mesin.
// Angka-angka masih sementara dan bisa di-tuning (bukan keputusan final).

var MODAL_AWAL = 500000;  // Rp, sesuai usulan awal
var SAVE_KEY = 'simulasi-bisnis-save-v1';

// Set awal yang dibatasi (MVP). Harga mendekati dunia nyata (sementara).
var PRODUCTS = {
  dimsum: {
    nama: 'Dimsum',
    bahan: [
      { id: 'ayam', nama: 'Daging Ayam', harga: 8000 },
      { id: 'kulit', nama: 'Kulit Pangsit', harga: 3000 }
    ],
    hargaAcuan: 15000,
    permintaanDasar: 20
  },
  kopi: {
    nama: 'Kopi Susu',
    bahan: [
      { id: 'kopi', nama: 'Biji Kopi', harga: 5000 },
      { id: 'susu', nama: 'Gula & Susu', harga: 2000 }
    ],
    hargaAcuan: 12000,
    permintaanDasar: 22
  },
  roti: {
    nama: 'Roti Sobek',
    bahan: [
      { id: 'tepung', nama: 'Tepung', harga: 4000 },
      { id: 'mentega', nama: 'Mentega', harga: 3000 }
    ],
    hargaAcuan: 10000,
    permintaanDasar: 16
  }
};

function sinyalPermintaan(permintaanDasar) {
  if (permintaanDasar >= 20) return 'Tinggi';
  if (permintaanDasar >= 15) return 'Sedang';
  return 'Rendah';
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtRp(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function todayISO() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function nextISO(iso) {
  var d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function createState(seed) {
  return {
    kas: MODAL_AWAL,
    hari: 1,
    tanggal: todayISO(),
    seed: seed || Math.floor(Math.random() * 1000000000),
    tokoBuka: false,
    produkId: null,
    bahan: {},
    stok: 0,
    harga: 0,
    terjualHariIni: 0,
    penjualanHariIni: 0,
    log: [{ hari: 1, teks: 'Kamu punya modal ' + fmtRp(MODAL_AWAL) + '. Lihat peluang, lalu pilih usaha yang mau dibuka.' }]
  };
}

function produkAktif(state) {
  return state.produkId ? PRODUCTS[state.produkId] : null;
}

function pushLog(state, teks) {
  state.log.unshift({ hari: state.hari, teks: teks });
  if (state.log.length > 50) state.log.length = 50;
}

function pilihUsaha(state, produkId) {
  var p = PRODUCTS[produkId];
  if (!p) return { ok: false, msg: 'Produk tidak dikenal.' };
  if (state.tokoBuka) return { ok: false, msg: 'Usaha sudah dibuka.' };
  state.produkId = produkId;
  state.tokoBuka = true;
  state.harga = p.hargaAcuan;
  state.bahan = {};
  p.bahan.forEach(function (b) { state.bahan[b.id] = 0; });
  pushLog(state, 'Membuka usaha ' + p.nama + ' dengan modal ' + fmtRp(state.kas) + '.');
  return { ok: true, msg: 'Membuka usaha ' + p.nama + '.' };
}

function beliBahan(state, bahanId, qty) {
  var p = produkAktif(state);
  if (!p) return { ok: false, msg: 'Buka usaha dulu sebelum beli bahan.' };
  var bahan = null;
  p.bahan.forEach(function (b) { if (b.id === bahanId) bahan = b; });
  if (!bahan) return { ok: false, msg: 'Bahan tidak dikenal.' };
  var biaya = bahan.harga * qty;
  if (state.kas < biaya) return { ok: false, msg: 'Kas tidak cukup untuk beli ' + qty + ' ' + bahan.nama + ' (' + fmtRp(biaya) + ').' };
  state.kas -= biaya;
  state.bahan[bahanId] += qty;
  pushLog(state, 'Beli ' + qty + ' ' + bahan.nama + ' seharga ' + fmtRp(biaya) + '.');
  return { ok: true, msg: 'Beli ' + qty + ' ' + bahan.nama + '.' };
}

function produksi(state, qty) {
  var p = produkAktif(state);
  if (!p) return { ok: false, msg: 'Buka usaha dulu sebelum produksi.' };
  for (var i = 0; i < p.bahan.length; i++) {
    if (state.bahan[p.bahan[i].id] < qty) {
      return { ok: false, msg: 'Bahan tidak cukup untuk produksi ' + qty + ' ' + p.nama + '.' };
    }
  }
  p.bahan.forEach(function (b) { state.bahan[b.id] -= qty; });
  state.stok += qty;
  pushLog(state, 'Produksi ' + qty + ' ' + p.nama + '.');
  return { ok: true, msg: 'Produksi ' + qty + ' ' + p.nama + '.' };
}

function aturHarga(state, nilai) {
  if (!produkAktif(state)) return { ok: false, msg: 'Buka usaha dulu.' };
  if (!nilai || nilai < 1000) return { ok: false, msg: 'Harga minimal Rp 1.000.' };
  state.harga = Math.round(nilai);
  pushLog(state, 'Harga jual diubah menjadi ' + fmtRp(state.harga) + ' per unit.');
  return { ok: true, msg: 'Harga diubah.' };
}

function hariBerikutnya(state) {
  var p = produkAktif(state);
  if (!p) return { ok: false, msg: 'Buka usaha dulu.' };
  var rng = mulberry32(state.seed + state.hari * 7919);
  var permintaan = Math.round(p.permintaanDasar * (p.hargaAcuan / state.harga) * (0.8 + rng() * 0.4));
  if (permintaan < 0) permintaan = 0;
  var terjual = Math.min(permintaan, state.stok);
  var pendapatan = terjual * state.harga;
  state.stok -= terjual;
  state.kas += pendapatan;
  state.terjualHariIni = terjual;
  state.penjualanHariIni = pendapatan;
  state.tanggal = nextISO(state.tanggal);
  state.hari += 1;
  if (terjual < permintaan) {
    pushLog(state, 'Hari ' + (state.hari - 1) + ': permintaan ' + permintaan + ' tapi stok habis setelah ' + terjual + ' terjual. Pendapatan ' + fmtRp(pendapatan) + '.');
  } else {
    pushLog(state, 'Hari ' + (state.hari - 1) + ': terjual ' + terjual + ' ' + p.nama.toLowerCase() + ', pendapatan ' + fmtRp(pendapatan) + '.');
  }
  if (state.kas < 0) pushLog(state, 'PERINGATAN: kas negatif (' + fmtRp(state.kas) + '). Aturan bangkrut lengkap (30 hari) menyusul di tahap berikutnya.');
  return { ok: true, terjual: terjual, pendapatan: pendapatan };
}

// ---- UI (browser saja; logika di atas bisa dites dari Node) ----
if (typeof document !== 'undefined') {
  var state = null;

  function muat() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.tokoBuka !== 'undefined' && parsed.produkId !== undefined) {
          state = parsed;
          return;
        }
      }
    } catch (e) { /* abaikan, mulai baru */ }
    state = createState();
  }

  function simpan() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* abaikan */ }
  }

  function el(id) { return document.getElementById(id); }

  function renderPilihan() {
    var html = '';
    Object.keys(PRODUCTS).forEach(function (id) {
      var p = PRODUCTS[id];
      var bahanTxt = p.bahan.map(function (b) { return b.nama + ' ' + fmtRp(b.harga); }).join(' + ');
      html += '<div class="produk-card">' +
        '<div class="produk-nama">' + p.nama + '</div>' +
        '<div class="produk-info">Bahan: ' + bahanTxt + '</div>' +
        '<div class="produk-info">Harga acuan: ' + fmtRp(p.hargaAcuan) + '</div>' +
        '<div class="produk-info">Sinyal permintaan: <strong>' + sinyalPermintaan(p.permintaanDasar) + '</strong></div>' +
        '<button class="btn btn-primary" data-produk="' + id + '">Buka Usaha Ini</button>' +
        '</div>';
    });
    el('daftar-produk').innerHTML = html;
    var btns = el('daftar-produk').querySelectorAll('button[data-produk]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = pilihUsaha(state, btn.getAttribute('data-produk'));
        if (!r.ok) alert(r.msg);
        simpan();
        render();
      });
    });
  }

  function renderAksiBeli() {
    var p = produkAktif(state);
    if (!p) return;
    var html = '';
    p.bahan.forEach(function (b) {
      html += '<button class="btn btn-blue" data-bahan="' + b.id + '">Beli 10 ' + b.nama + ' (' + fmtRp(b.harga * 10) + ')</button>';
    });
    el('aksi-beli').innerHTML = html;
    el('aksi-beli').querySelectorAll('button[data-bahan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        aksi(function () { return beliBahan(state, btn.getAttribute('data-bahan'), 10); });
      });
    });
    el('btn-produksi').textContent = 'Produksi 10 ' + p.nama;
  }

  function render() {
    var p = produkAktif(state);
    el('kas').textContent = fmtRp(state.kas);
    el('tanggal').textContent = state.tanggal;
    el('hari').textContent = state.hari;
    el('layar-pilih').style.display = state.tokoBuka ? 'none' : 'block';
    el('layar-toko').style.display = state.tokoBuka ? 'block' : 'none';
    if (!state.tokoBuka) {
      renderPilihan();
      el('brand-sub').textContent = 'Pilih usahamu dulu';
    } else {
      el('brand-sub').textContent = p.nama + ' \u00B7 Tahap 1: Irisan Vertikal';
      renderAksiBeli();
      el('penjualan-hari-ini').textContent = fmtRp(state.penjualanHariIni);
      el('terjual-hari-ini').textContent = state.terjualHariIni + ' unit terjual';
      el('stok-produk').textContent = state.stok + ' unit';
      el('bahan-ringkas').textContent = p.bahan.map(function (b) { return state.bahan[b.id] + ' ' + b.nama.toLowerCase(); }).join(' \u00B7 ');
      el('tabel-produk').textContent = p.nama;
      el('tabel-stok').textContent = state.stok;
      el('tabel-harga').textContent = fmtRp(state.harga);
      el('tabel-terjual').textContent = state.terjualHariIni;
      el('harga-jual').value = state.harga;
    }
    el('log').innerHTML = state.log.map(function (e) {
      return '<li>Hari ' + e.hari + ': ' + e.teks + '</li>';
    }).join('');
  }

  function aksi(fn) {
    var r = fn();
    if (!r.ok) alert(r.msg);
    simpan();
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    muat();
    el('btn-produksi').addEventListener('click', function () { aksi(function () { return produksi(state, 10); }); });
    el('btn-harga').addEventListener('click', function () { aksi(function () { return aturHarga(state, parseInt(el('harga-jual').value, 10)); }); });
    el('btn-hari').addEventListener('click', function () { aksi(function () { return hariBerikutnya(state); }); });
    el('btn-baru').addEventListener('click', function () {
      if (confirm('Mulai usaha baru? Progres saat ini akan dihapus.')) {
        state = createState();
        simpan();
        render();
      }
    });
    render();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createState: createState, pilihUsaha: pilihUsaha, beliBahan: beliBahan, produksi: produksi, aturHarga: aturHarga, hariBerikutnya: hariBerikutnya, PRODUCTS: PRODUCTS, sinyalPermintaan: sinyalPermintaan, fmtRp: fmtRp };
}
