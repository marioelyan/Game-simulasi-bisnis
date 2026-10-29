// Simulasi Bisnis — Tahap 1: irisan vertikal.
// Satu toko, satu produk (dimsum), loop beli -> produksi -> jual.
// Mesin deterministik: RNG ber-seed, input sama menghasilkan output sama.
// Angka-angka di bawah masih sementara dan bisa di-tuning (bukan keputusan final).

var HARGA_AYAM = 8000;    // Rp per unit daging ayam
var HARGA_KULIT = 3000;   // Rp per unit kulit pangsit
var HARGA_ACUAN = 15000;  // harga jual acuan untuk rumus permintaan
var PERMINTAAN_DASAR = 20; // pembeli potensial per hari pada harga acuan
var MODAL_AWAL = 500000;  // Rp, sesuai usulan awal (masih bisa diubah)
var SAVE_KEY = 'simulasi-bisnis-save-v1';

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
    bahan: { ayam: 0, kulit: 0 },
    stok: { dimsum: 0 },
    harga: HARGA_ACUAN,
    terjualHariIni: 0,
    penjualanHariIni: 0,
    log: [{ hari: 1, teks: 'Usaha dibuka dengan modal ' + fmtRp(MODAL_AWAL) + '. Beli bahan, produksi, atur harga, lalu jalan ke hari berikutnya.' }]
  };
}

function pushLog(state, teks) {
  state.log.unshift({ hari: state.hari, teks: teks });
  if (state.log.length > 50) state.log.length = 50;
}

function beliBahan(state, jenis, qty) {
  var harga = jenis === 'ayam' ? HARGA_AYAM : HARGA_KULIT;
  var biaya = harga * qty;
  if (state.kas < biaya) return { ok: false, msg: 'Kas tidak cukup untuk beli ' + qty + ' ' + jenis + ' (' + fmtRp(biaya) + ').' };
  state.kas -= biaya;
  state.bahan[jenis] += qty;
  pushLog(state, 'Beli ' + qty + ' ' + jenis + ' seharga ' + fmtRp(biaya) + '.');
  return { ok: true, msg: 'Beli ' + qty + ' ' + jenis + '.' };
}

function produksi(state, qty) {
  if (state.bahan.ayam < qty || state.bahan.kulit < qty) {
    return { ok: false, msg: 'Bahan tidak cukup untuk produksi ' + qty + ' dimsum (perlu ' + qty + ' ayam dan ' + qty + ' kulit).' };
  }
  state.bahan.ayam -= qty;
  state.bahan.kulit -= qty;
  state.stok.dimsum += qty;
  pushLog(state, 'Produksi ' + qty + ' dimsum.');
  return { ok: true, msg: 'Produksi ' + qty + ' dimsum.' };
}

function aturHarga(state, nilai) {
  if (!nilai || nilai < 1000) return { ok: false, msg: 'Harga minimal Rp 1.000.' };
  state.harga = Math.round(nilai);
  pushLog(state, 'Harga jual diubah menjadi ' + fmtRp(state.harga) + ' per dimsum.');
  return { ok: true, msg: 'Harga diubah.' };
}

function hariBerikutnya(state) {
  var rng = mulberry32(state.seed + state.hari * 7919);
  var permintaan = Math.round(PERMINTAAN_DASAR * (HARGA_ACUAN / state.harga) * (0.8 + rng() * 0.4));
  if (permintaan < 0) permintaan = 0;
  var terjual = Math.min(permintaan, state.stok.dimsum);
  var pendapatan = terjual * state.harga;
  state.stok.dimsum -= terjual;
  state.kas += pendapatan;
  state.terjualHariIni = terjual;
  state.penjualanHariIni = pendapatan;
  state.tanggal = nextISO(state.tanggal);
  state.hari += 1;
  if (terjual < permintaan) {
    pushLog(state, 'Hari ' + (state.hari - 1) + ': permintaan ' + permintaan + ' tapi stok habis setelah ' + terjual + ' terjual. Pendapatan ' + fmtRp(pendapatan) + '.');
  } else {
    pushLog(state, 'Hari ' + (state.hari - 1) + ': terjual ' + terjual + ' dimsum, pendapatan ' + fmtRp(pendapatan) + '.');
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
      if (raw) { state = JSON.parse(raw); return; }
    } catch (e) { /* abaikan, mulai baru */ }
    state = createState();
  }

  function simpan() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* abaikan */ }
  }

  function el(id) { return document.getElementById(id); }

  function render() {
    el('kas').textContent = fmtRp(state.kas);
    el('tanggal').textContent = state.tanggal;
    el('hari').textContent = state.hari;
    el('penjualan-hari-ini').textContent = fmtRp(state.penjualanHariIni);
    el('terjual-hari-ini').textContent = state.terjualHariIni + ' dimsum terjual';
    el('stok-dimsum').textContent = state.stok.dimsum + ' unit';
    el('bahan-ringkas').textContent = state.bahan.ayam + ' ayam \u00B7 ' + state.bahan.kulit + ' kulit';
    el('tabel-stok').textContent = state.stok.dimsum;
    el('tabel-harga').textContent = fmtRp(state.harga);
    el('tabel-terjual').textContent = state.terjualHariIni;
    el('harga-jual').value = state.harga;
    el('log').innerHTML = state.log.map(function (e) {
      return '<li>Hari ' + e.hari + ': ' + e.teks + '</li>';
    }).join('');
  }

  function aksi(fn, okMsg) {
    var r = fn();
    if (!r.ok) alert(r.msg);
    simpan();
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    muat();
    el('btn-beli-ayam').addEventListener('click', function () { aksi(function () { return beliBahan(state, 'ayam', 10); }); });
    el('btn-beli-kulit').addEventListener('click', function () { aksi(function () { return beliBahan(state, 'kulit', 10); }); });
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
  module.exports = { createState: createState, beliBahan: beliBahan, produksi: produksi, aturHarga: aturHarga, hariBerikutnya: hariBerikutnya, fmtRp: fmtRp };
}
