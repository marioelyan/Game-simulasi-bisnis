// KONGLOMERAT — Tahap A: mesin inti + 1 bidang (kuliner).
// Konsep yang dikunci (KONSEP.md): riset 3 lapis, persiapan satu per satu,
// rumus permintaan lengkap, supplier berkarakter, bangkrut 3 lapis,
// pajak fondasi (PPh final 0,5% omzet/bulan), menang = total aset Rp50 miliar.
// Angka-angka di bawah ini DATA SEMENTARA (tuning nanti), bukan keputusan final.
// Logika tidak bergantung DOM: bisa dites dari Node (lihat exports di bawah).

var MODAL_AWAL = 500000;
var TARGET_MENANG = 50000000000;
var SAVE_KEY = 'konglomerat-save-tahapA-v1';

// ---------- util ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmtRp(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(iso, n) {
  var d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function monthOf(iso) { return parseInt(iso.slice(5, 7), 10); }

// ---------- DATA: 40 bidang (bidang.js) + bidang aktif ----------
// bidang.js dimuat sebelum app.js di browser (var BIDANG global);
// di Node, require langsung.
var BIDANG_DATA = (typeof BIDANG !== 'undefined') ? BIDANG : require('./bidang.js').BIDANG;
// Data bidang aktif: diisi muatBidang, DIMUTASI (bukan diganti) supaya
// referensi yang sudah diekspor/diikat tetap segar saat bidang berganti.
var PRODUK = {};
var INPUT_HARGA = {};
var INPUT_NAMA = {};
var TEMPAT = {};
var PERALATAN = {};
var IZIN = { nama: '', biaya: 0, hari: 0 };
var OPSIONAL = {};
var MUSIM = {};
var PESAING = 0;
var PERAN = [];
var JENIS_BIDANG = 'barang';
var NAMA_BIDANG = '';
var OPSIONAL_POOL = {
  promo: { nama: 'Promo Pembukaan', biaya: 100000, hari: 1, efek: 'Reputasi awal +0,10' },
  platform: { nama: 'Daftar Platform Antar', biaya: 0, hari: 1, efek: 'Permintaan x1,15, pendapatan x0,85 (komisi)' },
  halal: { nama: 'Sertifikat Halal', biaya: 200000, hari: 7, efek: 'Permintaan x1,10' }
};
function isiObj(target, sumber) {
  Object.keys(target).forEach(function (k) { delete target[k]; });
  Object.keys(sumber).forEach(function (k) { target[k] = sumber[k]; });
}
function normalisasiBidang(raw) {
  var inputHarga = {}, inputNama = {};
  Object.keys(raw.produk).forEach(function (pid) {
    raw.produk[pid].bahan.forEach(function (b) { inputHarga[b.id] = b.harga; inputNama[b.id] = b.nama; });
  });
  var opsional = {};
  (raw.opsional || []).forEach(function (k) { if (OPSIONAL_POOL[k]) opsional[k] = OPSIONAL_POOL[k]; });
  var musim = {};
  for (var m = 1; m <= 12; m++) musim[m] = raw.musim ? (raw.musim[m] || 1.0) : 1.0;
  return { nama: raw.nama, jenis: raw.jenis, tempat: raw.tempat, peralatan: raw.peralatan, izin: raw.izin, produk: raw.produk, inputHarga: inputHarga, inputNama: inputNama, opsional: opsional, musim: musim, pesaing: raw.pesaing, peran: raw.peran };
}
function muatBidang(bidangId) {
  var raw = BIDANG_DATA[bidangId];
  if (!raw) return false;
  var d = normalisasiBidang(raw);
  isiObj(PRODUK, d.produk);
  isiObj(INPUT_HARGA, d.inputHarga);
  isiObj(INPUT_NAMA, d.inputNama);
  isiObj(TEMPAT, d.tempat);
  isiObj(PERALATAN, d.peralatan);
  isiObj(OPSIONAL, d.opsional);
  isiObj(MUSIM, d.musim);
  IZIN.nama = d.izin.nama; IZIN.biaya = d.izin.biaya; IZIN.hari = d.izin.hari;
  PESAING = d.pesaing;
  PERAN = d.peran.slice();
  JENIS_BIDANG = d.jenis;
  NAMA_BIDANG = d.nama;
  return true;
}
function sinyalBidang(bidangId) {
  var raw = BIDANG_DATA[bidangId]; if (!raw) return 'tidak dikenal';
  var total = 0;
  Object.keys(raw.produk).forEach(function (pid) { total += raw.produk[pid].permintaanDasar; });
  return total >= 50 ? 'ramai' : total >= 30 ? 'sedang' : 'sepi';
}
function modalKasarBidang(bidangId) {
  var raw = BIDANG_DATA[bidangId]; if (!raw) return 0;
  var minTempat = Infinity, minAlat = Infinity;
  Object.keys(raw.tempat).forEach(function (id) { minTempat = Math.min(minTempat, raw.tempat[id].biaya); });
  Object.keys(raw.peralatan).forEach(function (id) { minAlat = Math.min(minAlat, raw.peralatan[id].biaya); });
  var termurahBiaya = Infinity;
  Object.keys(raw.produk).forEach(function (pid) {
    var biaya = 0;
    raw.produk[pid].bahan.forEach(function (b) { biaya += b.harga * 5 * 0.85; });
    if (biaya < termurahBiaya) termurahBiaya = biaya;
  });
  return Math.round(minTempat + minAlat + raw.izin.biaya + termurahBiaya);
}
function hashBidang(id) {
  var h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pilihBidang(state, bidangId) {
  if (state.toko) return { ok: false, msg: 'Usaha sudah berjalan; bidang tidak bisa diganti di tengah jalan.' };
  if (!BIDANG_DATA[bidangId]) return { ok: false, msg: 'Bidang tidak dikenal.' };
  state.bidang = bidangId;
  state.siap = { tempat: null, lokasi: null, peralatan: null, izin: false, menu: [], supplier: {}, stokAwal: false, promo: false, platform: false, halal: false };
  muatBidang(bidangId);
  state.fase = 'persiapan';
  pushLog(state, 'Bidang dipilih: ' + NAMA_BIDANG + '. Masuk fase persiapan.');
  return { ok: true, msg: 'Bidang ' + NAMA_BIDANG + ' dipilih.' };
}

// Supplier: 3 arketipe per input (baris DATA, bukan kode khusus).
var SUPPLIER_ARKE = [
  { id: 'murah', nama: 'Murah tapi Lambat', pengaliHarga: 0.85, kirimHari: 3, tempoHari: 14, andal: 0.7 },
  { id: 'tengah', nama: 'Seimbang', pengaliHarga: 1.0, kirimHari: 2, tempoHari: 7, andal: 0.9 },
  { id: 'cepat', nama: 'Mahal tapi Cepat', pengaliHarga: 1.2, kirimHari: 1, tempoHari: 0, andal: 1.0 }
];
function supplierKey(inputId, arkeId) { return inputId + ':' + arkeId; }
function supplierInfo(inputId, arkeId) {
  var a = SUPPLIER_ARKE.filter(function (x) { return x.id === arkeId; })[0];
  return { inputId: inputId, arkeId: arkeId, nama: a.nama, harga: Math.round(INPUT_HARGA[inputId] * a.pengaliHarga), kirimHari: a.kirimHari, tempoHari: a.tempoHari, andal: a.andal };
}

// Lokasi: tier generik, berlaku semua bidang (lokasi per bidang = pendalaman data nanti).
var LOKASI = {
  kampus: { nama: 'Dekat Kampus', tier: 'ramai', faktorTempat: 1.3, pengaliSewa: 2.0 },
  pasar: { nama: 'Dekat Pasar', tier: 'ramai', faktorTempat: 1.3, pengaliSewa: 2.0 },
  perumahan: { nama: 'Perumahan', tier: 'sedang', faktorTempat: 1.0, pengaliSewa: 1.3 },
  pinggir: { nama: 'Pinggir Kota', tier: 'sepi', faktorTempat: 0.7, pengaliSewa: 1.0 }
};
var PAJAK_PERSEN = 0.005; // PPh final UMKM 0,5% dari omzet/bulan
var DENDA_TELAT_PERSEN = 0.02; // denda 2% per hari keterlambatan kewajiban

// ---------- STATE ----------
function createState(seed) {
  var st = {
    kas: MODAL_AWAL, hari: 1, tanggal: todayISO(), seed: seed || Math.floor(Math.random() * 1000000000),
    fase: 'pilihBidang', // pilihBidang -> persiapan -> toko -> bangkrut | menang
    bidang: 'kuliner', risetDipilih: null,
    riset: {}, // bidangId -> { lapis1, lapis2, lapis3: null | {hasil:[]} }
    siap: { tempat: null, lokasi: null, peralatan: null, izin: false, menu: [], supplier: {}, stokAwal: false, promo: false, platform: false, halal: false },
    toko: null, // diisi saat buka usaha
    praPinjaman: [], // pinjaman yang diambil sebelum toko buka, diubah jadi kewajiban saat buka
    omzetBulan: 0, bulanBerjalan: null,
    log: [{ hari: 1, teks: 'Kamu punya modal ' + fmtRp(MODAL_AWAL) + '. Pilih bidang, riset pasarnya, lalu siapkan usahamu satu per satu.' }]
  };
  muatBidang('kuliner');
  return st;
}
function pushLog(state, teks) {
  state.log.unshift({ hari: state.hari, teks: teks });
  if (state.log.length > 100) state.log.length = 100;
}
function inputDibutuhkan(state) {
  var inputs = {};
  state.siap.menu.forEach(function (pid) {
    PRODUK[pid].bahan.forEach(function (b) { inputs[b.id] = true; });
  });
  return Object.keys(inputs);
}
function biayaTetapHarian(state) {
  if (!state.toko) return 0;
  return Math.round(state.toko.sewaBulan / 30);
}
function runwayHari(state) {
  var tetap = biayaTetapHarian(state);
  if (tetap <= 0) return 999;
  return Math.max(0, Math.floor(state.kas / tetap));
}

// ---------- RISET (3 lapis, per bidang; hasil tersimpan & bisa dibandingkan) ----------
function risetBidang(state, bidangId) {
  var id = bidangId || state.risetDipilih || state.bidang || 'kuliner';
  if (!BIDANG_DATA[id]) return null;
  if (!state.riset) state.riset = {};
  if (!state.riset[id]) state.riset[id] = { lapis1: false, lapis2: false, lapis3: null };
  return { id: id, data: state.riset[id] };
}
function teksLapis1(bidangId) {
  var raw = BIDANG_DATA[bidangId];
  var hargas = Object.keys(raw.produk).map(function (pid) { return raw.produk[pid].hargaAcuan; });
  var minH = Math.min.apply(null, hargas), maxH = Math.max.apply(null, hargas);
  return raw.nama + ' butuh modal masuk paling hemat sekitar ' + fmtRp(modalKasarBidang(bidangId)) + ', harga jual ' + fmtRp(minH) + '–' + fmtRp(maxH) + ', sinyal: ' + sinyalBidang(bidangId) + '.';
}
function teksLapis2(bidangId) {
  var raw = BIDANG_DATA[bidangId];
  var daftar = Object.keys(raw.produk).map(function (pid) { return raw.produk[pid].nama + ' (' + fmtRp(raw.produk[pid].hargaAcuan) + ')'; }).join(', ');
  var cara = raw.jenis === 'jasa' ? 'jual slot kapasitas harian (tidak terjual = hangus)' : 'jual barang langsung, bisa lewat platform antar';
  return 'Rincian modal (tempat, alat, stok awal, izin), harga pasar per produk: ' + daftar + ', ' + raw.pesaing + ' pesaing, cara jualan: ' + cara + ', daftar persiapan: tempat, lokasi, peralatan, izin, produk/jasa awal, supplier, stok awal.';
}
function risetLapis1(state, bidangId) {
  var r = risetBidang(state, bidangId);
  if (!r) return { ok: false, msg: 'Bidang tidak dikenal.' };
  if (r.data.lapis1) return { ok: false, msg: 'Gambaran kasar sudah dilihat.' };
  r.data.lapis1 = true;
  state.risetDipilih = r.id;
  pushLog(state, 'Riset kasar [' + BIDANG_DATA[r.id].nama + ']: ' + teksLapis1(r.id));
  return { ok: true, msg: 'Gambaran kasar didapat (gratis).' };
}
function risetLapis2(state, bidangId) {
  var r = risetBidang(state, bidangId);
  if (!r) return { ok: false, msg: 'Bidang tidak dikenal.' };
  if (!r.data.lapis1) return { ok: false, msg: 'Lihat gambaran kasar dulu.' };
  if (r.data.lapis2) return { ok: false, msg: 'Laporan detail sudah didapat.' };
  var biaya = 50000, hari = 2;
  if (state.kas < biaya) return { ok: false, msg: 'Kas tidak cukup untuk laporan detail (' + fmtRp(biaya) + ').' };
  state.kas -= biaya;
  state.tanggal = addDays(state.tanggal, hari);
  state.hari += hari;
  r.data.lapis2 = true;
  state.risetDipilih = r.id;
  pushLog(state, 'Laporan detail [' + BIDANG_DATA[r.id].nama + '] dibeli (' + fmtRp(biaya) + ', ' + hari + ' hari).');
  return { ok: true, msg: 'Laporan detail didapat.' };
}
function risetLapis3(state, bidangId) {
  var r = risetBidang(state, bidangId);
  if (!r) return { ok: false, msg: 'Bidang tidak dikenal.' };
  if (!r.data.lapis2) return { ok: false, msg: 'Beli laporan detail dulu.' };
  if (r.data.lapis3) return { ok: false, msg: 'Uji pasar sudah dilakukan.' };
  var modalUji = 100000;
  if (state.kas < modalUji) return { ok: false, msg: 'Kas tidak cukup untuk uji pasar (' + fmtRp(modalUji) + ').' };
  state.kas -= modalUji;
  // Uji pasar: 3 hari jualan percobaan, dasar = rata-rata permintaan bidang itu.
  var raw = BIDANG_DATA[r.id];
  var totalDasar = 0, nProd = 0;
  Object.keys(raw.produk).forEach(function (pid) { totalDasar += raw.produk[pid].permintaanDasar; nProd++; });
  var dasar = Math.round(totalDasar / nProd);
  var hasil = [];
  for (var i = 0; i < 3; i++) {
    var rng = mulberry32(state.seed + hashBidang(r.id) + 999 + i * 131);
    var permintaan = Math.round(dasar * (0.8 + rng() * 0.4));
    var terjual = Math.min(permintaan, 15); // stok percobaan terbatas
    hasil.push({ hari: i + 1, permintaan: permintaan, terjual: terjual });
  }
  state.tanggal = addDays(state.tanggal, 3);
  state.hari += 3;
  r.data.lapis3 = { hasil: hasil };
  state.risetDipilih = r.id;
  pushLog(state, 'Uji pasar [' + raw.nama + '] selesai (modal ' + fmtRp(modalUji) + ', 3 hari): data penjualan beneran dari simulasi.');
  return { ok: true, msg: 'Uji pasar selesai.' };
}

// ---------- PERSIAPAN ----------
function persiapanBeli(state, jenis, id) {
  if (state.fase !== 'persiapan') return { ok: false, msg: 'Pilih bidang dulu, baru persiapan.' };
  var s = state.siap;
  if (jenis === 'tempat') {
    if (s.tempat) return { ok: false, msg: 'Tempat sudah dipilih.' };
    var t = TEMPAT[id]; if (!t) return { ok: false, msg: 'Tempat tidak dikenal.' };
    if (state.kas < t.biaya) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(t.biaya) + '). Pertimbangkan pinjaman.' };
    state.kas -= t.biaya; s.tempat = id;
    pushLog(state, 'Tempat dipilih: ' + t.nama + ' (' + fmtRp(t.biaya) + ').');
  } else if (jenis === 'lokasi') {
    if (s.lokasi) return { ok: false, msg: 'Lokasi sudah dipilih.' };
    var l = LOKASI[id]; if (!l) return { ok: false, msg: 'Lokasi tidak dikenal.' };
    s.lokasi = id; // lokasi tidak berbayar sendiri; biayanya lewat pengali sewa
    pushLog(state, 'Lokasi dipilih: ' + l.nama + ' (tier ' + l.tier + ').');
  } else if (jenis === 'peralatan') {
    if (!s.tempat) return { ok: false, msg: 'Pilih tempat dulu (prasyarat).' };
    if (s.peralatan) return { ok: false, msg: 'Peralatan sudah dibeli.' };
    var p = PERALATAN[id]; if (!p) return { ok: false, msg: 'Peralatan tidak dikenal.' };
    if (state.kas < p.biaya) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(p.biaya) + ').' };
    state.kas -= p.biaya; s.peralatan = id;
    pushLog(state, 'Peralatan dibeli: ' + p.nama + ' (' + fmtRp(p.biaya) + ').');
  } else if (jenis === 'izin') {
    if (s.izin) return { ok: false, msg: 'Izin sudah diurus.' };
    if (state.kas < IZIN.biaya) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(IZIN.biaya) + ').' };
    state.kas -= IZIN.biaya; state.tanggal = addDays(state.tanggal, IZIN.hari); state.hari += IZIN.hari; s.izin = true;
    pushLog(state, 'Izin diurus: ' + IZIN.nama + ' (' + fmtRp(IZIN.biaya) + ', ' + IZIN.hari + ' hari).');
  } else if (jenis === 'menu') {
    if (s.menu.indexOf(id) >= 0) return { ok: false, msg: 'Produk sudah ada di menu.' };
    if (!PRODUK[id]) return { ok: false, msg: 'Produk tidak dikenal.' };
    s.menu.push(id);
    pushLog(state, (JENIS_BIDANG === 'jasa' ? 'Jasa ditambah: ' : 'Menu ditambah: ') + PRODUK[id].nama + '.');
  } else if (jenis === 'supplier') {
    // id = "inputId:arkeId"
    var parts = id.split(':');
    if (s.menu.length === 0) return { ok: false, msg: 'Pilih menu dulu (prasyarat).' };
    if (inputDibutuhkan(state).indexOf(parts[0]) < 0) return { ok: false, msg: 'Input itu tidak dibutuhkan menu saat ini.' };
    s.supplier[parts[0]] = parts[1];
    pushLog(state, 'Supplier dipilih: ' + INPUT_NAMA[parts[0]] + ' dari ' + supplierInfo(parts[0], parts[1]).nama + '.');
  } else if (jenis === 'stokAwal') {
    if (s.stokAwal) return { ok: false, msg: 'Stok awal sudah dibeli.' };
    var butuh = inputDibutuhkan(state);
    for (var i = 0; i < butuh.length; i++) if (!s.supplier[butuh[i]]) return { ok: false, msg: 'Pilih supplier untuk ' + INPUT_NAMA[butuh[i]] + ' dulu (prasyarat).' };
    s.stokAwal = true; // bahan awal dibeli saat buka usaha (lihat bukaUsaha)
    pushLog(state, 'Stok awal disiapkan (dibeli saat buka usaha).');
  } else if (jenis === 'opsional') {
    if (s[id]) return { ok: false, msg: 'Sudah diambil.' };
    var o = OPSIONAL[id]; if (!o) return { ok: false, msg: 'Opsi tidak dikenal.' };
    if (state.kas < o.biaya) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(o.biaya) + ').' };
    state.kas -= o.biaya; state.tanggal = addDays(state.tanggal, o.hari); state.hari += o.hari; s[id] = true;
    pushLog(state, 'Opsional diambil: ' + o.nama + ' (' + fmtRp(o.biaya) + ', ' + o.hari + ' hari).');
  } else {
    return { ok: false, msg: 'Jenis persiapan tidak dikenal.' };
  }
  return { ok: true, msg: 'Persiapan dicatat.' };
}
function persiapanWajibLengkap(state) {
  var s = state.siap;
  var butuh = inputDibutuhkan(state);
  var supplierLengkap = butuh.length > 0 && butuh.every(function (inp) { return !!s.supplier[inp]; });
  return !!(s.tempat && s.lokasi && s.peralatan && s.izin && s.menu.length > 0 && supplierLengkap && s.stokAwal);
}
function bukaUsaha(state) {
  if (!persiapanWajibLengkap(state)) return { ok: false, msg: 'Persiapan wajib belum lengkap.' };
  var s = state.siap;
  // Stok awal: 5 unit bahan per input (dihitung dulu, dicek dulu, baru toko dibuat).
  var totalAwal = 0;
  inputDibutuhkan(state).forEach(function (inp) {
    totalAwal += supplierInfo(inp, s.supplier[inp]).harga * 5;
  });
  if (state.kas < totalAwal) return { ok: false, msg: 'Kas tidak cukup untuk stok awal (' + fmtRp(totalAwal) + '). Ambil pinjaman dulu atau kurangi menu.' };
  var sewaBulan = Math.round(TEMPAT[s.tempat].sewaBulan * LOKASI[s.lokasi].pengaliSewa);
  var reputasi = 1.0 + (s.promo ? 0.10 : 0) + PERALATAN[s.peralatan].mutu;
  state.toko = {
    bidang: state.bidang, tempat: s.tempat, lokasi: s.lokasi, peralatan: s.peralatan,
    sewaBulan: sewaBulan, reputasi: reputasi,
    stok: {}, bahan: {}, harga: {}, pesanan: [], kewajiban: [],
    hubungan: {}, // supplierKey -> level 0..5
    karyawan: [], kandidat: [], kandidatRefreshHari: state.hari,
    efekAktif: [], supplierBeku: {}, pesananBesar: null,
    eventAktif: null, terakhirEventHari: 0, terakhirEventBesarHari: 0, bukaHari: state.hari,
    platform: !!s.platform, halal: !!s.halal,
    kapasitas: Math.min(TEMPAT[s.tempat].kapasitas, PERALATAN[s.peralatan].kapasitas),
    produksiHariIni: 0
  };
  s.menu.forEach(function (pid) {
    state.toko.stok[pid] = 0;
    state.toko.harga[pid] = PRODUK[pid].hargaAcuan;
  });
  inputDibutuhkan(state).forEach(function (inp) { state.toko.bahan[inp] = 0; });
  // Stok awal: beli 5 unit bahan per input dari supplier terpilih (tunai).
  inputDibutuhkan(state).forEach(function (inp) {
    state.toko.bahan[inp] += 5;
  });
  state.kas -= totalAwal;
  // Pinjaman pra-toko diubah jadi kewajiban toko.
  state.praPinjaman.forEach(function (kw) { state.toko.kewajiban.push(kw); });
  state.praPinjaman = [];
  // Kewajiban sewa pertama jatuh tempo 30 hari lagi; pajak dihitung tiap akhir bulan.
  state.toko.kewajiban.push({ id: 'sewa-' + state.hari, jenis: 'Sewa tempat', jumlah: sewaBulan, jatuhTempo: addDays(state.tanggal, 30), dibayar: false, denda: 0 });
  state.bulanBerjalan = state.tanggal.slice(0, 7);
  state.omzetBulan = 0;
  refreshKandidat(state);
  state.fase = 'toko';
  pushLog(state, 'Usaha dibuka! Sewa ' + fmtRp(sewaBulan) + '/bulan, kapasitas ' + state.toko.kapasitas + ' unit/hari, reputasi awal ' + reputasi.toFixed(2) + '.');
  return { ok: true, msg: 'Usaha dibuka!' };
}

// ---------- PINJAMAN ----------
function ambilPinjaman(state, jenis) {
  if (state.fase !== 'toko' && state.fase !== 'persiapan') return { ok: false, msg: 'Pinjaman belum bisa diambil.' };
  var adaTunggakan = state.toko && state.toko.kewajiban.some(function (k) { return !k.dibayar && k.jatuhTempo < state.tanggal; });
  if (jenis === 'normal') {
    if (state.kas < 0) return { ok: false, msg: 'Pinjaman murah tertutup saat kas negatif (lapis bangkrut 1).' };
    var jumlah = 2000000, bunga = 0.10, tempo = 30;
    state.kas += jumlah;
    var kwNormal = { id: 'pinj-' + state.hari, jenis: 'Pinjaman normal', jumlah: Math.round(jumlah * (1 + bunga)), jatuhTempo: addDays(state.tanggal, tempo), dibayar: false, denda: 0 };
    if (state.toko) state.toko.kewajiban.push(kwNormal); else state.praPinjaman.push(kwNormal);
    pushLog(state, 'Pinjaman normal: ' + fmtRp(jumlah) + ', bunga 10%, tempo 30 hari.');
  } else if (jenis === 'darurat') {
    if (state.kas >= 0 && !adaTunggakan) return { ok: false, msg: 'Pinjaman darurat hanya saat kas negatif atau ada tunggakan.' };
    var j2 = 1000000, b2 = 0.25, t2 = 14;
    state.kas += j2;
    var kwDarurat = { id: 'darurat-' + state.hari, jenis: 'Pinjaman darurat', jumlah: Math.round(j2 * (1 + b2)), jatuhTempo: addDays(state.tanggal, t2), dibayar: false, denda: 0 };
    if (state.toko) state.toko.kewajiban.push(kwDarurat); else state.praPinjaman.push(kwDarurat);
    pushLog(state, 'Pinjaman DARURAT: ' + fmtRp(j2) + ', bunga 25%, tempo 14 hari.');
  } else return { ok: false, msg: 'Jenis pinjaman tidak dikenal.' };
  return { ok: true, msg: 'Pinjaman cair.' };
}
function jualPeralatan(state) {
  if (!state.toko) return { ok: false, msg: 'Belum ada toko.' };
  if (state.toko.peralatanTerjual) return { ok: false, msg: 'Peralatan sudah dijual.' };
  var nilai = Math.round(PERALATAN[state.toko.peralatan].biaya * 0.5);
  state.kas += nilai;
  state.toko.peralatanTerjual = true;
  hitungKapasitas(state); // tanpa peralatan, kapasitas tinggal tenaga sendiri + staf
  pushLog(state, 'Peralatan dijual rugi: +' + fmtRp(nilai) + '. Kapasitas turun ke 10 unit/hari.');
  return { ok: true, msg: 'Peralatan dijual.' };
}

// ---------- BELI, PRODUKSI, HARGA ----------
function beliBahan(state, inputId, arkeId, qty, cara) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  if (state.kas < 0 && cara === 'tempo') return { ok: false, msg: 'Kas negatif: supplier minta tunai (lapis bangkrut 1).' };
  var kunciSup = supplierKey(inputId, arkeId);
  if (t.supplierBeku[kunciSup] && state.tanggal <= t.supplierBeku[kunciSup]) return { ok: false, msg: 'Supplier ini sedang tidak melayani (bangkrut) sampai ' + t.supplierBeku[kunciSup] + '.' };
  var info = supplierInfo(inputId, arkeId);
  var key = supplierKey(inputId, arkeId);
  var level = t.hubungan[key] || 0;
  var diskon = level * 0.01;
  var hargaSatuan = Math.round(info.harga * (1 - diskon));
  var biaya = hargaSatuan * qty;
  var rng = mulberry32(state.seed + state.hari * 31 + inputId.length);
  var telat = rng() > info.andal ? 1 : 0; // supplier kurang andal bisa telat 1 hari
  var tiba = addDays(state.tanggal, info.kirimHari + telat);
  if (cara === 'tunai') {
    if (state.kas < biaya) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(biaya) + ').' };
    state.kas -= biaya;
    t.pesanan.push({ inputId: inputId, qty: qty, tiba: tiba, lunas: true });
    pushLog(state, 'Beli ' + qty + ' ' + INPUT_NAMA[inputId] + ' dari ' + info.nama + ' tunai ' + fmtRp(biaya) + ', tiba ' + tiba + (telat ? ' (telat 1 hari)' : '') + '.');
  } else {
    var tempo = info.tempoHari + level;
    if (tempo <= 0) return { ok: false, msg: 'Supplier ini hanya melayani tunai.' };
    t.pesanan.push({ inputId: inputId, qty: qty, tiba: tiba, lunas: false });
    t.kewajiban.push({ id: 'sup-' + state.hari + '-' + inputId, jenis: 'Tempo supplier ' + INPUT_NAMA[inputId], jumlah: biaya, jatuhTempo: addDays(state.tanggal, tempo), dibayar: false, denda: 0, supplierKey: key });
    pushLog(state, 'Beli ' + qty + ' ' + INPUT_NAMA[inputId] + ' dari ' + info.nama + ' tempo ' + fmtRp(biaya) + ', jatuh tempo ' + addDays(state.tanggal, tempo) + '.');
  }
  return { ok: true, msg: 'Pesanan dicatat.' };
}
function produksi(state, produkId, qty) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  if (state.siap.menu.indexOf(produkId) < 0) return { ok: false, msg: 'Produk tidak ada di menu.' };
  var kapEfektif = Math.round(t.kapasitas * efekPengali(t, 'kapasitas', state.tanggal));
  if (t.produksiHariIni + qty > kapEfektif) return { ok: false, msg: 'Melebihi kapasitas hari ini (' + kapEfektif + ' unit).' };
  var p = PRODUK[produkId];
  for (var i = 0; i < p.bahan.length; i++) if ((t.bahan[p.bahan[i].id] || 0) < qty) return { ok: false, msg: 'Bahan tidak cukup: ' + p.bahan[i].nama + '.' };
  p.bahan.forEach(function (b) { t.bahan[b.id] -= qty; });
  t.stok[produkId] += qty;
  t.produksiHariIni += qty;
  pushLog(state, 'Produksi ' + qty + ' ' + p.nama + '.');
  return { ok: true, msg: 'Produksi jalan.' };
}
function aturHarga(state, produkId, nilai) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  if (!nilai || nilai < 1000) return { ok: false, msg: 'Harga minimal Rp 1.000.' };
  t.harga[produkId] = Math.round(nilai);
  pushLog(state, 'Harga ' + PRODUK[produkId].nama + ' diubah ke ' + fmtRp(t.harga[produkId]) + '.');
  return { ok: true, msg: 'Harga diubah.' };
}
function bayarKewajiban(state, kewajibanId) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  var k = null;
  t.kewajiban.forEach(function (x) { if (x.id === kewajibanId) k = x; });
  if (!k || k.dibayar) return { ok: false, msg: 'Kewajiban tidak ditemukan / sudah dibayar.' };
  var total = k.jumlah + k.denda;
  if (state.kas < total) return { ok: false, msg: 'Kas tidak cukup (' + fmtRp(total) + ').' };
  state.kas -= total;
  k.dibayar = true;
  if (k.supplierKey) {
    t.hubungan[k.supplierKey] = Math.min(5, (t.hubungan[k.supplierKey] || 0) + 1);
    pushLog(state, 'Tempo supplier dibayar tepat waktu. Hubungan membaik (level ' + t.hubungan[k.supplierKey] + ').');
  }
  if (k.gajiId) {
    var staf = null;
    t.karyawan.forEach(function (x) { if (x.id === k.gajiId) staf = x; });
    if (staf) {
      staf.moral = Math.min(100, staf.moral + 10);
      t.kewajiban.push({ id: 'gaji-' + staf.id + '-' + state.hari, jenis: 'Gaji ' + staf.nama + ' (' + staf.peran + ')', jumlah: staf.gaji, jatuhTempo: addDays(state.tanggal, 30), dibayar: false, denda: 0, gajiId: staf.id });
      pushLog(state, 'Gaji dibayar, moral ' + staf.nama + ' naik. Gaji bulan berikutnya dijadwalkan.');
    }
  }
  pushLog(state, 'Kewajiban dibayar: ' + k.jenis + ' ' + fmtRp(total) + '.');
  return { ok: true, msg: 'Dibayar.' };
}

// ---------- SIMULASI HARIAN ----------
function faktorHarga(hargaAcuan, hargaEfektif) {
  var f = hargaAcuan / hargaEfektif;
  if (f < 0.3) f = 0.3;
  if (f > 2.0) f = 2.0;
  return f;
}
function jalankanHari(state, diskonPersen) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  diskonPersen = diskonPersen || 0;
  // Pagi: pesanan tiba.
  var tibaHariIni = [];
  t.pesanan = t.pesanan.filter(function (ps) {
    if (ps.tiba <= state.tanggal) { t.bahan[ps.inputId] = (t.bahan[ps.inputId] || 0) + ps.qty; tibaHariIni.push(ps); return false; }
    return true;
  });
  if (tibaHariIni.length) pushLog(state, 'Pesanan tiba: ' + tibaHariIni.map(function (ps) { return ps.qty + ' ' + INPUT_NAMA[ps.inputId].toLowerCase(); }).join(', ') + '.');
  // Pagi Tahap B: efek kedaluwarsa dibersihkan, kandidat refresh, pesanan besar jatuh tempo, moral gaji.
  t.efekAktif = (t.efekAktif || []).filter(function (e) { return state.tanggal <= e.sampai; });
  if (state.hari - (t.kandidatRefreshHari || 0) >= 7) refreshKandidat(state);
  if (t.pesananBesar && state.tanggal >= t.pesananBesar.deadline) {
    var pb = t.pesananBesar; t.pesananBesar = null;
    if ((t.stok[pb.produk] || 0) >= pb.qty) {
      t.stok[pb.produk] -= pb.qty;
      var bayarBesar = Math.round(pb.qty * t.harga[pb.produk] * pb.bonus);
      state.kas += bayarBesar;
      t.reputasi = Math.min(1.5, t.reputasi + 0.05);
      pushLog(state, 'Pesanan besar terpenuhi: ' + pb.qty + ' ' + PRODUK[pb.produk].nama + ', dibayar ' + fmtRp(bayarBesar) + '.');
    } else {
      t.reputasi = Math.max(0.5, t.reputasi - 0.08);
      pushLog(state, 'Pesanan besar GAGAL dipenuhi (stok kurang). Reputasi turun.');
    }
  }
  t.karyawan.slice().forEach(function (k) {
    var tunggak = t.kewajiban.some(function (kw) { return !kw.dibayar && kw.gajiId === k.id && kw.jatuhTempo < state.tanggal; });
    if (tunggak) {
      k.moral -= 15;
      if (k.moral <= 20 && k.moral > 0 && !k.peringatanMoral) { k.peringatanMoral = true; pushLog(state, 'PERINGATAN: ' + k.nama + ' akan keluar jika moral terus turun (moral ' + k.moral + ').'); }
      if (k.moral <= 0) {
        t.karyawan = t.karyawan.filter(function (x) { return x.id !== k.id; });
        hitungKapasitas(state);
        pushLog(state, k.nama + ' KELUAR karena moral habis (gaji menunggak).');
      }
    } else if (k.moral > 20) { k.peringatanMoral = false; }
  });
  // Siang: permintaan & penjualan per produk.
  var rng = mulberry32(state.seed + state.hari * 7919);
  var musim = MUSIM[monthOf(state.tanggal)] || 1.0;
  var faktorPesaing = Math.max(0.5, 1 - 0.03 * PESAING);
  var faktorTempat = LOKASI[t.lokasi].faktorTempat;
  var laporan = [];
  var pendapatan = 0;
  state.siap.menu.forEach(function (pid) {
    var p = PRODUK[pid];
    var hargaEfektif = Math.round(t.harga[pid] * (1 - diskonPersen / 100) * efekPengali(t, 'harga', state.tanggal));
    var kualitasStaf = 1;
    if (t.karyawan.length) {
      var totalSkill = 0;
      t.karyawan.forEach(function (k) { totalSkill += k.skill; });
      kualitasStaf = 1 + 0.02 * (totalSkill / t.karyawan.length);
    }
    var permintaan = Math.round(p.permintaanDasar * faktorHarga(p.hargaAcuan, hargaEfektif) * t.reputasi * musim * faktorPesaing * 1.0 * faktorTempat * kualitasStaf * efekPengali(t, 'permintaan', state.tanggal) * (0.8 + rng() * 0.4));
    if (t.platform) permintaan = Math.round(permintaan * 1.15);
    if (t.halal) permintaan = Math.round(permintaan * 1.10);
    if (permintaan < 0) permintaan = 0;
    var terjual = Math.min(permintaan, t.stok[pid]);
    var hasil = terjual * hargaEfektif;
    if (t.platform) hasil = Math.round(hasil * 0.85); // komisi platform
    t.stok[pid] -= terjual;
    pendapatan += hasil;
    laporan.push({ produk: p.nama, permintaan: permintaan, terjual: terjual, pendapatan: hasil });
    if (terjual > 0) t.reputasi = Math.min(1.5, t.reputasi + 0.005);
  });
  // Bidang jasa: kapasitas harian yang tak terjual hangus di akhir hari.
  if (JENIS_BIDANG === 'jasa') {
    var hangus = 0;
    state.siap.menu.forEach(function (pid) { hangus += t.stok[pid] || 0; t.stok[pid] = 0; });
    if (hangus > 0) pushLog(state, 'Slot jasa tak terjual hangus: ' + hangus + ' unit (kapasitas harian tidak bisa disimpan).');
  }
  state.kas += pendapatan;
  state.omzetBulan += pendapatan;
  // Malam: kewajiban jatuh tempo -> denda & konsekuensi lapis 2.
  var jatuhTempo = [];
  t.kewajiban.forEach(function (k) {
    if (!k.dibayar && k.jatuhTempo <= state.tanggal) {
      k.denda = Math.round(k.jumlah * DENDA_TELAT_PERSEN);
      jatuhTempo.push(k);
      if (k.supplierKey) {
        t.hubungan[k.supplierKey] = 0;
        t.reputasi = Math.max(0.5, t.reputasi - 0.05);
        pushLog(state, 'Tempo supplier ' + k.jenis + ' MENUNGGAK. Supplier berhenti melayani, reputasi turun.');
      }
    }
  });
  // Pajak bulanan: tiap ganti bulan, tagih 0,5% omzet bulan lalu.
  var bulanIni = state.tanggal.slice(0, 7);
  if (state.bulanBerjalan && bulanIni !== state.bulanBerjalan) {
    var pajak = Math.round(state.omzetBulan * PAJAK_PERSEN);
    if (pajak > 0) {
      t.kewajiban.push({ id: 'pajak-' + state.tanggal, jenis: 'PPh final UMKM 0,5%', jumlah: pajak, jatuhTempo: addDays(state.tanggal, 15), dibayar: false, denda: 0 });
      pushLog(state, 'Pajak bulan lalu: ' + fmtRp(pajak) + ' (0,5% dari omzet ' + fmtRp(state.omzetBulan) + ').');
    }
    state.omzetBulan = 0;
    state.bulanBerjalan = bulanIni;
    // Sewa bulan berikutnya.
    t.kewajiban.push({ id: 'sewa-' + state.tanggal, jenis: 'Sewa tempat', jumlah: t.sewaBulan, jatuhTempo: addDays(state.tanggal, 30), dibayar: false, denda: 0 });
  }
  // Vonis bangkrut lapis 3: kas negatif + tunggakan melewati tenggat + tidak ada aset + tidak ada pinjaman.
  var tunggakanLama = t.kewajiban.filter(function (k) { return !k.dibayar && addDays(k.jatuhTempo, 30) < state.tanggal; });
  var nilaiAset = 0;
  Object.keys(t.stok).forEach(function (pid) { nilaiAset += t.stok[pid] * PRODUK[pid].hargaAcuan; });
  if (!t.peralatanTerjual) nilaiAset += Math.round(PERALATAN[t.peralatan].biaya * 0.5);
  if (state.kas < 0 && tunggakanLama.length > 0 && nilaiAset <= 0) {
    state.fase = 'bangkrut';
    pushLog(state, 'VONIS BANGKRUT: kas negatif, tunggakan melewati tenggat, tidak ada aset bisa dijual, tidak ada pinjaman bisa diakses.');
    return { ok: true, laporan: laporan, pendapatan: pendapatan, bangkrut: true };
  }
  // Menang: total aset >= Rp50 miliar.
  var totalAset = state.kas + nilaiAset;
  if (totalAset >= TARGET_MENANG) {
    state.fase = 'menang';
    pushLog(state, 'MENANG: total aset mencapai ' + fmtRp(totalAset) + '. Kamu konglomerat!');
    return { ok: true, laporan: laporan, pendapatan: pendapatan, menang: true };
  }
  state.tanggal = addDays(state.tanggal, 1);
  state.hari += 1;
  t.produksiHariIni = 0;
  gulirEvent(state); // event untuk pagi hari berikutnya
  if (state.kas < 0) pushLog(state, 'PERINGATAN lapis 1: kas negatif (' + fmtRp(state.kas) + '). Tidak bisa beli stok baru, supplier minta tunai, pinjaman murah tertutup.');
  return { ok: true, laporan: laporan, pendapatan: pendapatan, jatuhTempo: jatuhTempo.map(function (k) { return k.jenis; }) };
}

// ---------- TAHAP B: KARYAWAN ----------
// Peran kandidat diambil dari PERAN (bidang aktif, diisi muatBidang).
var NAMA_KANDIDAT = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Irfan', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nina', 'Omar', 'Putri', 'Rudi', 'Sari', 'Tono', 'Wulan'];
function gajiDariSkill(skill) { return 300000 + skill * 200000; }
function buatKandidat(state) {
  var rng = mulberry32(state.seed + state.hari * 101 + Math.floor(Math.random() * 100000));
  var peran = PERAN[Math.floor(rng() * PERAN.length)];
  var nama = NAMA_KANDIDAT[Math.floor(rng() * NAMA_KANDIDAT.length)];
  var skill = 1 + Math.floor(rng() * 5);
  return { id: 'k' + state.hari + '-' + Math.floor(rng() * 100000), nama: nama, peran: peran, skill: skill, gaji: gajiDariSkill(skill) };
}
function refreshKandidat(state) {
  var t = state.toko; if (!t) return;
  t.kandidat = [buatKandidat(state), buatKandidat(state), buatKandidat(state)];
  t.kandidatRefreshHari = state.hari;
  pushLog(state, 'Kandidat baru tersedia di menu rekrutmen.');
}
function bonusKapasitasStaf(t) {
  var bonus = 0;
  t.karyawan.forEach(function (k) { bonus += 5 + k.skill; });
  return bonus;
}
function hitungKapasitas(state) {
  var t = state.toko; if (!t) return;
  var dasar = t.peralatanTerjual ? 10 : Math.min(TEMPAT[t.tempat].kapasitas, PERALATAN[t.peralatan].kapasitas);
  t.kapasitas = dasar + bonusKapasitasStaf(t);
}
function rekrut(state, kandidatId) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  var k = null;
  t.kandidat.forEach(function (x) { if (x.id === kandidatId) k = x; });
  if (!k) return { ok: false, msg: 'Kandidat tidak ditemukan.' };
  t.karyawan.push({ id: k.id, nama: k.nama, peran: k.peran, skill: k.skill, gaji: k.gaji, moral: 80, peringatanMoral: false });
  t.kandidat = t.kandidat.filter(function (x) { return x.id !== kandidatId; });
  t.kewajiban.push({ id: 'gaji-' + k.id + '-' + state.hari, jenis: 'Gaji ' + k.nama + ' (' + k.peran + ')', jumlah: k.gaji, jatuhTempo: addDays(state.tanggal, 30), dibayar: false, denda: 0, gajiId: k.id });
  hitungKapasitas(state);
  pushLog(state, 'Direkrut: ' + k.nama + ' (' + k.peran + ', skill ' + k.skill + ', gaji ' + fmtRp(k.gaji) + '/bulan). Kapasitas naik.');
  return { ok: true, msg: k.nama + ' direkrut.' };
}
function pecat(state, karyawanId) {
  var t = state.toko; if (!t) return { ok: false, msg: 'Buka usaha dulu.' };
  var k = null;
  t.karyawan.forEach(function (x) { if (x.id === karyawanId) k = x; });
  if (!k) return { ok: false, msg: 'Karyawan tidak ditemukan.' };
  t.karyawan = t.karyawan.filter(function (x) { return x.id !== karyawanId; });
  t.karyawan.forEach(function (x) { x.moral = Math.max(0, x.moral - 10); });
  hitungKapasitas(state);
  pushLog(state, k.nama + ' di-PHK. Moral staf tersisa turun sementara.');
  return { ok: true, msg: k.nama + ' di-PHK.' };
}

// ---------- TAHAP B: EVENT ----------
// Event = situasi + pilihan (>=2). Tidak pernah langsung membangkrutkan.
// Kecil ~semingguan sekali (gap 5 hari, peluang 30%/hari); besar ~sebulanan
// sekali (gap 30 hari, peluang 10%/hari, masa tenggang 14 hari).
function efekPengali(t, jenis, tanggal) {
  var hasil = 1;
  (t.efekAktif || []).forEach(function (e) {
    if (e.jenis === jenis && tanggal <= e.sampai) hasil *= e.nilai;
  });
  return hasil;
}
function buatEvent(id, state) {
  var t = state.toko;
  if (id === 'viral') return { id: id, kategori: 'Tren pasar', besar: false, judul: 'Produk kuliner viral!', teks: 'Kuliner sejenis mendadak viral di media sosial. Permintaan naik, tapi pelanggan juga membanding-bandingkan harga.', pilihan: [
    { label: 'Naikkan harga 10% (3 hari)', efek: function () { t.efekAktif.push({ jenis: 'harga', nilai: 1.10, sampai: addDays(state.tanggal, 3) }); t.reputasi = Math.max(0.5, t.reputasi - 0.02); return { ok: true }; } },
    { label: 'Tahan harga, kejar reputasi', efek: function () { t.efekAktif.push({ jenis: 'permintaan', nilai: 1.25, sampai: addDays(state.tanggal, 3) }); t.reputasi = Math.min(1.5, t.reputasi + 0.03); return { ok: true }; } }
  ] };
  if (id === 'kompetitor_baru') return { id: id, kategori: 'Pesaing', besar: false, judul: 'Kompetitor baru buka di dekatmu!', teks: 'Warung sejenis buka tidak jauh dari lokasimu. Sebagian pelanggan pindah.', pilihan: [
    { label: 'Banting harga 10% (7 hari)', efek: function () { t.efekAktif.push({ jenis: 'harga', nilai: 0.90, sampai: addDays(state.tanggal, 7) }); return { ok: true }; } },
    { label: 'Fokus kualitas & layanan', efek: function () { t.reputasi = Math.min(1.5, t.reputasi + 0.05); return { ok: true }; } }
  ] };
  if (id === 'supplier_bangkrut') {
    var kunci = Object.keys(t.hubungan).length ? Object.keys(t.hubungan)[Math.floor(Math.random() * Object.keys(t.hubungan).length)] : null;
    if (!kunci) {
      var butuh = inputDibutuhkan(state);
      if (!butuh.length) return null;
      var inp = butuh[Math.floor(Math.random() * butuh.length)];
      kunci = supplierKey(inp, state.siap.supplier[inp]);
    }
    var namaSup = INPUT_NAMA[kunci.split(':')[0]] + ' (' + SUPPLIER_ARKE.filter(function (a) { return a.id === kunci.split(':')[1]; })[0].nama + ')';
    return { id: id, kategori: 'Supplier', besar: false, judul: 'Supplier bangkrut!', teks: namaSup + ' berhenti beroperasi selama 14 hari. Kamu tidak bisa beli dari supplier itu sampai pulih.', pilihan: [
      { label: 'Terima & alihkan pembelian', efek: function () { t.supplierBeku[kunci] = addDays(state.tanggal, 14); return { ok: true }; } },
      { label: 'Negosiasi: bayar Rp50.000, pulih 7 hari lebih cepat', efek: function () { if (state.kas < 50000) return { ok: false, msg: 'Kas tidak cukup untuk negosiasi.' }; state.kas -= 50000; t.supplierBeku[kunci] = addDays(state.tanggal, 7); return { ok: true }; } }
    ] };
  }
  if (id === 'pesanan_besar') {
    var produk = state.siap.menu[Math.floor(Math.random() * state.siap.menu.length)];
    return { id: id, kategori: 'Peluang', besar: true, judul: 'Pesanan besar mendadak!', teks: 'Seseorang memesan ' + 50 + ' ' + PRODUK[produk].nama + ' untuk 3 hari lagi, dengan bonus 20% dari harga normal. Terima atau tolak?', pilihan: [
      { label: 'Terima pesanan', efek: function () { t.pesananBesar = { produk: produk, qty: 50, deadline: addDays(state.tanggal, 3), bonus: 1.2 }; return { ok: true }; } },
      { label: 'Tolak (tidak ada konsekuensi)', efek: function () { return { ok: true }; } }
    ] };
  }
  if (id === 'alat_rusak') return { id: id, kategori: 'Operasional', besar: false, judul: 'Peralatan rusak!', teks: 'Sebagian peralatan rusak. Kapasitas produksi turun separuh sampai diperbaiki.', pilihan: [
    { label: 'Perbaiki segera (Rp150.000)', efek: function () { if (state.kas < 150000) return { ok: false, msg: 'Kas tidak cukup untuk perbaikan.' }; state.kas -= 150000; return { ok: true }; } },
    { label: 'Tunda (kapasitas separuh 7 hari)', efek: function () { t.efekAktif.push({ jenis: 'kapasitas', nilai: 0.5, sampai: addDays(state.tanggal, 7) }); return { ok: true }; } }
  ] };
  if (id === 'ulasan_viral') return { id: id, kategori: 'Reputasi', besar: false, judul: 'Ulasan viral positif!', teks: 'Pelanggan mengulas usahamu dengan sangat baik. Reputasi naik dan permintaan ikut naik.', pilihan: [
    { label: 'Manfaatkan dengan promo (Rp50.000)', efek: function () { if (state.kas < 50000) return { ok: false, msg: 'Kas tidak cukup untuk promo.' }; state.kas -= 50000; t.reputasi = Math.min(1.5, t.reputasi + 0.05); t.efekAktif.push({ jenis: 'permintaan', nilai: 1.35, sampai: addDays(state.tanggal, 3) }); return { ok: true }; } },
    { label: 'Biarkan mengalir', efek: function () { t.reputasi = Math.min(1.5, t.reputasi + 0.05); t.efekAktif.push({ jenis: 'permintaan', nilai: 1.2, sampai: addDays(state.tanggal, 3) }); return { ok: true }; } }
  ] };
  return null;
}
var EVENT_KECIL = ['viral', 'kompetitor_baru', 'supplier_bangkrut', 'alat_rusak', 'ulasan_viral'];
var EVENT_BESAR = ['pesanan_besar'];
function gulirEvent(state) {
  var t = state.toko; if (!t) return;
  if (t.eventAktif) return; // satu event belum dipilih: jangan menumpuk
  var umurUsaha = state.hari - (t.bukaHari || state.hari);
  if (umurUsaha < 3) return; // masa tenggang awal
  var rng = mulberry32(state.seed + state.hari * 104729);
  var sejakEvent = t.terakhirEventHari ? state.hari - t.terakhirEventHari : 999;
  var sejakBesar = t.terakhirEventBesarHari ? state.hari - t.terakhirEventBesarHari : 999;
  var id = null;
  if (umurUsaha >= 14 && sejakBesar >= 30 && rng() < 0.10) {
    id = EVENT_BESAR[Math.floor(rng() * EVENT_BESAR.length)];
  } else if (sejakEvent >= 5 && rng() < 0.30) {
    id = EVENT_KECIL[Math.floor(rng() * EVENT_KECIL.length)];
  }
  if (!id) return;
  var ev = buatEvent(id, state);
  if (!ev) return;
  t.eventAktif = { event: ev };
  if (ev.besar) t.terakhirEventBesarHari = state.hari;
  pushLog(state, 'EVENT: ' + ev.judul + ' — pilih responsmu di panel pagi.');
}
function pilihEvent(state, idx) {
  var t = state.toko; if (!t || !t.eventAktif) return { ok: false, msg: 'Tidak ada event.' };
  var ev = t.eventAktif.event;
  var pil = ev.pilihan[idx];
  if (!pil) return { ok: false, msg: 'Pilihan tidak dikenal.' };
  var r = pil.efek();
  if (r && r.ok === false) return r;
  t.eventAktif = null;
  t.terakhirEventHari = state.hari;
  pushLog(state, 'Event: ' + ev.judul + ' — dipilih: ' + pil.label + '.');
  return { ok: true, msg: 'Pilihan dicatat.' };
}

// ---- UI (browser saja; logika di atas bisa dites dari Node) ----
if (typeof document !== 'undefined') {
  var state = null;
  function muat() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && p.fase) { state = p; if (!state.bidang) state.bidang = 'kuliner'; if (state.riset && typeof state.riset.lapis1 !== 'undefined') { state.riset = { kuliner: state.riset }; } if (!state.riset) state.riset = {}; muatBidang(state.bidang); return; } }
    } catch (e) { /* abaikan */ }
    state = createState();
  }
  function simpan() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* abaikan */ } }
  function el(id) { return document.getElementById(id); }
  function aksi(fn) { var r = fn(); if (!r.ok) alert(r.msg); simpan(); render(); return r; }

  function renderHeader() {
    el('kas').textContent = fmtRp(state.kas);
    el('tanggal').textContent = state.tanggal;
    el('hari').textContent = state.hari;
    el('runway').textContent = state.toko ? runwayHari(state) + ' hari' : '-';
    if (state.kas < 0) el('kas').style.color = '#DC2626'; else el('kas').style.color = '';
  }
  function renderLog() {
    el('log').innerHTML = state.log.map(function (e) { return '<li>Hari ' + e.hari + ': ' + e.teks + '</li>'; }).join('');
  }
  function renderRiset() {
    var grid = '<div id="bidang-grid">';
    Object.keys(BIDANG_DATA).forEach(function (id, i) {
      var f = BIDANG_DATA[id];
      var diteliti = state.riset && state.riset[id] && state.riset[id].lapis1;
      var aktif = state.risetDipilih === id;
      grid += '<button class="btn' + (aktif ? ' btn-aktif' : '') + '" data-bidang="' + id + '">' + (i + 1) + '. ' + f.nama + ' (' + (f.jenis === 'jasa' ? 'jasa' : 'barang') + ')' + (diteliti ? ' ✓' : '') + '</button> ';
    });
    grid += '</div>';
    var panel = '';
    var dipilih = state.risetDipilih || state.bidang;
    if (dipilih && BIDANG_DATA[dipilih]) {
      var f = BIDANG_DATA[dipilih];
      var r = (state.riset && state.riset[dipilih]) || { lapis1: false, lapis2: false, lapis3: null };
      panel = '<h3>' + f.nama + ' (' + (f.jenis === 'jasa' ? 'jasa: kapasitas harian hangus' : 'barang: stok fisik') + ')</h3>';
      if (r.lapis1) panel += '<p><strong>Gambaran kasar (gratis):</strong> ' + teksLapis1(dipilih) + '</p>';
      if (r.lapis2) panel += '<p><strong>Laporan detail:</strong> ' + teksLapis2(dipilih) + '</p>';
      if (r.lapis3) panel += '<p><strong>Uji pasar (3 hari):</strong> ' + r.lapis3.hasil.map(function (h) { return 'hari ' + h.hari + ': minta ' + h.permintaan + ', laku ' + h.terjual; }).join(' | ') + '.</p>';
      if (!r.lapis1) panel += '<p>Belum ada riset. Mulai dari gambaran kasar (gratis), lalu laporan detail, lalu uji pasar.</p>';
      panel += '<div class="row"><button class="btn" id="btn-riset1">Gambaran Kasar (gratis)</button> <button class="btn" id="btn-riset2">Laporan Detail (Rp50.000, 2 hari)</button> <button class="btn" id="btn-riset3">Uji Pasar (modal Rp100.000, 3 hari)</button> <button class="btn btn-primary" id="btn-ke-persiapan">Mulai Persiapan ' + f.nama + ' →</button></div>';
    }
    var banding = '';
    var ditelitiIds = state.riset ? Object.keys(state.riset).filter(function (id) { return state.riset[id].lapis1; }) : [];
    if (ditelitiIds.length) {
      banding = '<h3>Perbandingan bidang yang sudah diriset</h3><p>' + ditelitiIds.map(function (id) { return BIDANG_DATA[id].nama + ': modal hemat ' + fmtRp(modalKasarBidang(id)) + ', sinyal ' + sinyalBidang(id); }).join(' | ') + '</p>';
    }
    el('riset-info').innerHTML = grid + panel + banding;
    el('riset-info').querySelectorAll('button[data-bidang]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.risetDipilih = btn.getAttribute('data-bidang'); simpan(); render(); });
    });
    var b1 = el('btn-riset1'); if (b1) b1.addEventListener('click', function () { aksi(function () { return risetLapis1(state, state.risetDipilih || state.bidang); }); });
    var b2 = el('btn-riset2'); if (b2) b2.addEventListener('click', function () { aksi(function () { return risetLapis2(state, state.risetDipilih || state.bidang); }); });
    var b3 = el('btn-riset3'); if (b3) b3.addEventListener('click', function () { aksi(function () { return risetLapis3(state, state.risetDipilih || state.bidang); }); });
    var bk = el('btn-ke-persiapan'); if (bk) bk.addEventListener('click', function () { aksi(function () { return pilihBidang(state, state.risetDipilih || state.bidang); }); });
  }
  function btnList(containerId, items, onClick) {
    var html = '';
    items.forEach(function (it) {
      html += '<button class="btn" data-id="' + it.id + '"' + (it.disabled ? ' disabled' : '') + '>' + it.label + '</button>';
    });
    el(containerId).innerHTML = html;
    el(containerId).querySelectorAll('button[data-id]').forEach(function (btn) {
      btn.addEventListener('click', function () { onClick(btn.getAttribute('data-id')); });
    });
  }
  function renderPersiapan() {
    var s = state.siap;
    el('btn-izin').textContent = 'Urus ' + IZIN.nama + ' (' + fmtRp(IZIN.biaya) + ', ' + IZIN.hari + ' hari)';
    el('menu-judul').textContent = (JENIS_BIDANG === 'jasa' ? 'Jasa Awal' : 'Menu Awal') + ' (wajib, pilih minimal 1)';
    btnList('opsi-tempat', Object.keys(TEMPAT).map(function (id) {
      return { id: id, label: TEMPAT[id].nama + ' (' + fmtRp(TEMPAT[id].biaya) + ')', disabled: !!s.tempat };
    }), function (id) { aksi(function () { return persiapanBeli(state, 'tempat', id); }); });
    btnList('opsi-lokasi', Object.keys(LOKASI).map(function (id) {
      return { id: id, label: LOKASI[id].nama + ' (' + LOKASI[id].tier + ')', disabled: !!s.lokasi };
    }), function (id) { aksi(function () { return persiapanBeli(state, 'lokasi', id); }); });
    btnList('opsi-peralatan', Object.keys(PERALATAN).map(function (id) {
      return { id: id, label: PERALATAN[id].nama + ' (' + fmtRp(PERALATAN[id].biaya) + ')', disabled: !!s.peralatan };
    }), function (id) { aksi(function () { return persiapanBeli(state, 'peralatan', id); }); });
    btnList('opsi-menu', Object.keys(PRODUK).map(function (id) {
      return { id: id, label: PRODUK[id].nama, disabled: s.menu.indexOf(id) >= 0 };
    }), function (id) { aksi(function () { return persiapanBeli(state, 'menu', id); }); });
    // Supplier per input yang dibutuhkan menu.
    var butuh = inputDibutuhkan(state);
    var supHtml = '';
    if (butuh.length === 0) supHtml = '<p>Pilih menu dulu.</p>';
    else butuh.forEach(function (inp) {
      supHtml += '<div><strong>' + INPUT_NAMA[inp] + ':</strong> ';
      SUPPLIER_ARKE.forEach(function (a) {
        var info = supplierInfo(inp, a.id);
        var aktif = s.supplier[inp] === a.id;
        supHtml += '<button class="btn' + (aktif ? ' btn-aktif' : '') + '" data-sup="' + inp + ':' + a.id + '">' + a.nama + ' (' + fmtRp(info.harga) + ', ' + info.kirimHari + ' hari, ' + (info.tempoHari ? 'tempo ' + info.tempoHari + ' hari' : 'tunai') + ')</button> ';
      });
      supHtml += '</div>';
    });
    el('supplier-area').innerHTML = supHtml;
    el('supplier-area').querySelectorAll('button[data-sup]').forEach(function (btn) {
      btn.addEventListener('click', function () { aksi(function () { return persiapanBeli(state, 'supplier', btn.getAttribute('data-sup')); }); });
    });
    btnList('opsi-opsional', Object.keys(OPSIONAL).map(function (id) {
      return { id: id, label: OPSIONAL[id].nama + ' (' + fmtRp(OPSIONAL[id].biaya) + ') — ' + OPSIONAL[id].efek, disabled: !!s[id] };
    }), function (id) { aksi(function () { return persiapanBeli(state, 'opsional', id); }); });
    el('persiapan-status').textContent = 'Wajib: tempat ' + (s.tempat ? '✓' : '–') + ' | lokasi ' + (s.lokasi ? '✓' : '–') + ' | peralatan ' + (s.peralatan ? '✓' : '–') + ' | izin ' + (s.izin ? '✓' : '–') + ' | ' + (JENIS_BIDANG === 'jasa' ? 'jasa ' : 'menu ') + (s.menu.length ? s.menu.map(function (m) { return PRODUK[m].nama; }).join(', ') : '–') + ' | supplier ' + (butuh.length && butuh.every(function (i) { return !!s.supplier[i]; }) ? '✓' : '–') + ' | stok awal ' + (s.stokAwal ? '✓' : '–');
    el('btn-buka').disabled = !persiapanWajibLengkap(state);
  }
  function renderToko() {
    var t = state.toko;
    var info = 'Bidang: ' + NAMA_BIDANG + ' | Tempat: ' + TEMPAT[t.tempat].nama + ' | Lokasi: ' + LOKASI[t.lokasi].nama + ' (' + LOKASI[t.lokasi].tier + ') | Sewa: ' + fmtRp(t.sewaBulan) + '/bulan | Reputasi: ' + t.reputasi.toFixed(2) + ' | Kapasitas: ' + t.kapasitas + ' unit/hari (produksi hari ini: ' + t.produksiHariIni + ')';
    el('toko-info').textContent = info;
    el('stok-info').textContent = state.siap.menu.map(function (pid) { return PRODUK[pid].nama + ': stok ' + t.stok[pid] + ', harga ' + fmtRp(t.harga[pid]); }).join(' | ');
    el('bahan-info').textContent = Object.keys(t.bahan).map(function (inp) { return INPUT_NAMA[inp] + ': ' + t.bahan[inp]; }).join(' | ') || 'Belum ada bahan.';
    // Panel event pagi.
    var evHtml = '';
    if (t.eventAktif) {
      var ev = t.eventAktif.event;
      evHtml = '<div class="event-box"><strong>EVENT: ' + ev.judul + '</strong><p>' + ev.teks + '</p>' + ev.pilihan.map(function (pil, i) { return '<button class="btn" data-event-pil="' + i + '">' + pil.label + '</button>'; }).join(' ') + '</div>';
    }
    el('event-panel').innerHTML = evHtml;
    el('event-panel').querySelectorAll('button[data-event-pil]').forEach(function (btn) {
      btn.addEventListener('click', function () { aksi(function () { return pilihEvent(state, parseInt(btn.getAttribute('data-event-pil'), 10)); }); });
    });
    // Kandidat & staf.
    if (!t.kandidat.length) el('kandidat-area').innerHTML = '<p>Belum ada kandidat. Kandidat baru datang tiap 7 hari.</p>';
    else el('kandidat-area').innerHTML = t.kandidat.map(function (k) { return '<div>' + k.nama + ' — ' + k.peran + ', skill ' + k.skill + ', gaji ' + fmtRp(k.gaji) + '/bulan <button class="btn" data-rekrut="' + k.id + '">Rekrut</button></div>'; }).join('');
    el('kandidat-area').querySelectorAll('button[data-rekrut]').forEach(function (btn) {
      btn.addEventListener('click', function () { aksi(function () { return rekrut(state, btn.getAttribute('data-rekrut')); }); });
    });
    if (!t.karyawan.length) el('staf-list').innerHTML = '<p>Belum ada karyawan (solo). Rekrut untuk menambah kapasitas dan kualitas.</p>';
    else el('staf-list').innerHTML = t.karyawan.map(function (k) { return '<div>' + k.nama + ' — ' + k.peran + ', skill ' + k.skill + ', gaji ' + fmtRp(k.gaji) + '/bulan, moral ' + k.moral + ' <button class="btn" data-pecat="' + k.id + '">PHK</button></div>'; }).join('');
    el('staf-list').querySelectorAll('button[data-pecat]').forEach(function (btn) {
      btn.addEventListener('click', function () { aksi(function () { return pecat(state, btn.getAttribute('data-pecat')); }); });
    });
    if (t.pesananBesar) el('pesanan-besar-info').textContent = 'Pesanan besar: ' + t.pesananBesar.qty + ' ' + PRODUK[t.pesananBesar.produk].nama + ' sebelum ' + t.pesananBesar.deadline + ' (bonus 20%). Stok saat ini: ' + (t.stok[t.pesananBesar.produk] || 0) + '.';
    else el('pesanan-besar-info').textContent = '';
    // Beli: input + supplier.
    var beliInput = el('beli-input');
    var curInput = beliInput.value || inputDibutuhkan(state)[0];
    beliInput.innerHTML = inputDibutuhkan(state).map(function (inp) { return '<option value="' + inp + '">' + INPUT_NAMA[inp] + '</option>'; }).join('');
    if (curInput) beliInput.value = curInput;
    var inp = beliInput.value;
    el('beli-supplier').innerHTML = SUPPLIER_ARKE.map(function (a) {
      var info = supplierInfo(inp, a.id);
      var lvl = t.hubungan[supplierKey(inp, a.id)] || 0;
      return '<option value="' + a.id + '">' + a.nama + ' (' + fmtRp(info.harga) + ', kirim ' + info.kirimHari + ' hari, ' + (info.tempoHari ? 'tempo ' + (info.tempoHari + lvl) + ' hari' : 'tunai') + (lvl ? ', hubungan lv' + lvl : '') + ')</option>';
    }).join('');
    // Produksi + harga.
    el('prod-produk').innerHTML = state.siap.menu.map(function (pid) { return '<option value="' + pid + '">' + PRODUK[pid].nama + '</option>'; }).join('');
    var hargaHtml = '';
    state.siap.menu.forEach(function (pid) {
      hargaHtml += '<label>' + PRODUK[pid].nama + ' <input type="number" id="harga-' + pid + '" value="' + t.harga[pid] + '" min="1000"> </label>';
    });
    el('harga-area').innerHTML = hargaHtml;
    // Kewajiban.
    var kw = t.kewajiban.filter(function (k) { return !k.dibayar; });
    if (!kw.length) el('kewajiban-list').innerHTML = '<p>Tidak ada kewajiban.</p>';
    else el('kewajiban-list').innerHTML = kw.map(function (k) {
      var telat = k.jatuhTempo < state.tanggal;
      return '<div>' + k.jenis + ' — ' + fmtRp(k.jumlah + k.denda) + ' (jatuh tempo ' + k.jatuhTempo + (telat ? ', MENUNGGAK' : '') + ') <button class="btn" data-bayar="' + k.id + '">Bayar</button></div>';
    }).join('');
    el('kewajiban-list').querySelectorAll('button[data-bayar]').forEach(function (btn) {
      btn.addEventListener('click', function () { aksi(function () { return bayarKewajiban(state, btn.getAttribute('data-bayar')); }); });
    });
  }
  function render() {
    renderHeader();
    var risetTampil = state.fase === 'pilihBidang' || state.fase === 'riset' || state.fase === 'persiapan';
    el('layar-riset').style.display = risetTampil ? 'block' : 'none';
    el('layar-persiapan').style.display = state.fase === 'persiapan' ? 'block' : 'none';
    el('layar-toko').style.display = state.fase === 'toko' ? 'block' : 'none';
    el('layar-akhir').style.display = (state.fase === 'bangkrut' || state.fase === 'menang') ? 'block' : 'none';
    el('persiapan-judul').textContent = '2. Persiapan Buka Usaha — ' + NAMA_BIDANG;
    el('toko-judul').textContent = '3. Usaha Berjalan — ' + NAMA_BIDANG;
    if (risetTampil) renderRiset();
    if (state.fase === 'persiapan') renderPersiapan();
    if (state.fase === 'toko') renderToko();
    if (state.fase === 'bangkrut') { el('akhir-judul').textContent = 'BANGKRUT'; el('akhir-isi').textContent = 'Usaha tutup. Kas ' + fmtRp(state.kas) + '. Lihat log untuk urutan kesalahanmu, lalu coba lagi dengan keputusan berbeda.'; }
    if (state.fase === 'menang') { el('akhir-judul').textContent = 'MENANG — KONGLOMERAT!'; el('akhir-isi').textContent = 'Total aset mencapai ' + fmtRp(TARGET_MENANG) + '. Dari modal ' + fmtRp(MODAL_AWAL) + ' menjadi konglomerat!'; }
    renderLog();
  }
  document.addEventListener('DOMContentLoaded', function () {
    muat();
    // Tombol riset & pilih bidang di-render dinamis oleh renderRiset (diikat di sana).
    el('btn-izin').addEventListener('click', function () { aksi(function () { return persiapanBeli(state, 'izin', 'x'); }); });
    el('btn-stok-awal').addEventListener('click', function () { aksi(function () { return persiapanBeli(state, 'stokAwal', 'x'); }); });
    el('btn-buka').addEventListener('click', function () { aksi(function () { return bukaUsaha(state); }); });
    el('beli-input').addEventListener('change', function () { simpan(); render(); });
    el('btn-beli').addEventListener('click', function () {
      aksi(function () { return beliBahan(state, el('beli-input').value, el('beli-supplier').value, parseInt(el('beli-qty').value, 10) || 10, el('beli-cara').value); });
    });
    el('btn-produksi').addEventListener('click', function () {
      aksi(function () { return produksi(state, el('prod-produk').value, parseInt(el('prod-qty').value, 10) || 10); });
    });
    el('btn-harga').addEventListener('click', function () {
      aksi(function () {
        var ok = true;
        state.siap.menu.forEach(function (pid) {
          var r = aturHarga(state, pid, parseInt(el('harga-' + pid).value, 10));
          if (!r.ok) ok = false;
        });
        return { ok: ok, msg: ok ? 'Harga diubah.' : 'Ada harga tidak valid.' };
      });
    });
    el('btn-hari').addEventListener('click', function () {
      aksi(function () {
        var r = jalankanHari(state, parseInt(el('promo-diskon').value, 10) || 0);
        if (r.ok) {
          var lap = r.laporan.map(function (x) { return x.produk + ': minta ' + x.permintaan + ', laku ' + x.terjual + ', ' + fmtRp(x.pendapatan); }).join(' | ');
          el('laporan-hari-ini').textContent = 'Kemarin: ' + lap + ' | Total pendapatan: ' + fmtRp(r.pendapatan);
        }
        return r;
      });
    });
    el('btn-pinj-normal').addEventListener('click', function () { aksi(function () { return ambilPinjaman(state, 'normal'); }); });
    el('btn-pinj-darurat').addEventListener('click', function () { aksi(function () { return ambilPinjaman(state, 'darurat'); }); });
    el('btn-jual-alat').addEventListener('click', function () { aksi(function () { return jualPeralatan(state); }); });
    el('btn-baru').addEventListener('click', function () {
      if (confirm('Mulai dari awal? Progres saat ini akan dihapus.')) { state = createState(); simpan(); render(); }
    });
    render();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createState: createState, risetLapis1: risetLapis1, risetLapis2: risetLapis2, risetLapis3: risetLapis3, pilihBidang: pilihBidang, muatBidang: muatBidang, normalisasiBidang: normalisasiBidang, sinyalBidang: sinyalBidang, modalKasarBidang: modalKasarBidang, teksLapis1: teksLapis1, teksLapis2: teksLapis2, persiapanBeli: persiapanBeli, persiapanWajibLengkap: persiapanWajibLengkap, bukaUsaha: bukaUsaha, ambilPinjaman: ambilPinjaman, jualPeralatan: jualPeralatan, beliBahan: beliBahan, produksi: produksi, aturHarga: aturHarga, bayarKewajiban: bayarKewajiban, jalankanHari: jalankanHari, runwayHari: runwayHari, rekrut: rekrut, pecat: pecat, pilihEvent: pilihEvent, gulirEvent: gulirEvent, refreshKandidat: refreshKandidat, hitungKapasitas: hitungKapasitas, efekPengali: efekPengali, buatEvent: buatEvent, BIDANG: BIDANG_DATA, PRODUK: PRODUK, TEMPAT: TEMPAT, LOKASI: LOKASI, PERALATAN: PERALATAN, SUPPLIER_ARKE: SUPPLIER_ARKE, fmtRp: fmtRp };
}
