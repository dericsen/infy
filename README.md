# Infy (WasteLess) — Prediksi Penjualan & Kontrol Limbah Pangan Restoran

**Infy (WasteLess)** adalah platform pendukung keputusan operasional dapur restoran untuk meminimalkan *food waste* dan *overproduction*. Pemilik atau manajer restoran cukup mengunggah file riwayat penjualan harian maupun tahunan dalam format **Excel (`.xlsx` / `.xls`)**, **CSV**, atau **JSON**, dan sistem secara otomatis memprediksi permintaan setiap menu untuk hari-hari berikutnya serta menerjemahkannya ke dalam daftar persiapan dapur (*prep sheet*).

---

## 1. Pengenalan Projek

### Latar Belakang
Dapur restoran kerap mengalami dua masalah yang berlawanan: kelebihan persiapan (*overproduction*) yang berujung menjadi limbah pangan dan kerugian biaya bahan baku, atau kekurangan stok saat lonjakan tamu. Di sisi lain, sistem POS tradisional umumnya hanya mencatat penjualan historis tanpa menerjemahkannya menjadi angka persiapan harian yang praktis untuk tim dapur.

### Gambaran Solusi
Infy menjembatani data penjualan historis ke keputusan produksi dapur melalui pendekatan **Hybrid Offline-First Forecasting**:
1. **Upload Sekali, Prediksi Otomatis**: Restoran mengunggah file Excel/CSV riwayat penjualan dari hari-hari atau tahun-tahun sebelumnya (`date`, `dish_name`, `quantity_sold`). Sistem otomatis mendeteksi daftar menu, menetapkan tanggal mulai prediksi tepat setelah transaksi terakhir, dan menampilkan proyeksi **3, 7, atau 14 hari ke depan**.
2. **Mesin Statistik Deterministik (Offline-Ready)**: Prediksi inti dihitung di sisi klien menggunakan *4-Week Day-of-Week Weighted Moving Average*, tren 7 hari, dan sinyal musiman *Year-over-Year* (jika tersedia riwayat tahunan). Perhitungan tetap berjalan normal tanpa koneksi internet.
3. **Konteks AI Terbatas (Server-Side Gemini)**: Secara opsional, restoran dapat menyertakan konteks cuaca, suhu, peluang hujan, dan acara lokal melalui server API. Penyesuaian AI dibatasi ketat secara simetris (`±5%` s/d `±35%`) agar tidak mengganggu stabilitas angka statistik.
4. **Checklist Prep & Stok Dapur**: Prediksi dapat dibuka di tab **Kitchen Prep** untuk mengecek konversi takaran resep (*Bill of Materials*), kekurangan stok bahan baku, serta pencatatan limbah (*food waste*).

### Target Pengguna
- **Pemilik & Manajer Restoran**: Memantau proyeksi permintaan harian/mingguan dan mengekspor rencana produksi ke CSV.
- **Head Chef & Staf Stasiun Dapur** (*Grill*, *Saute*, *Garde Manger*, *Bakery*): Menjalankan *prep checklist* harian, menyesuaikan *Chef Par*, dan memantau ketersediaan bahan baku.

---

## 2. Technical Documentation

### Arsitektur Sistem

Infy dibangun dengan arsitektur **Unified Full-Stack** berbasis Node.js + Express (`server.ts`) dan React SPA (`src/`):

```text
+-------------------------------------------------------------------------+
|                   Client Browser (React 19 + TypeScript)                |
|                                                                         |
|  [AppLayout]                                                            |
|     ├── UploadForecastView  ──> salesCsv.ts (SheetJS .xlsx / CSV/JSON)  |
|     └── PrepWorkspaceView   ──> recommendationEngine & unitConversion   |
|                                                                         |
|  [Domain & Persistence Layer]                                           |
|     ├── forecastingEngine.ts (4-Wk WMA + 7d Trend + YoY Seasonal)       |
|     ├── contextualForecastService.ts (Cache + Offline Fallback)         |
|     └── repositories.ts ──> IndexedDB (wasteless_db_v1)                 |
|                             + Opsional Firebase Auth / Firestore        |
+-----------------------------------+-------------------------------------+
                                    |
                    HTTP JSON (/api/forecast/contextualize, /api/health)
                                    |
                                    v
+-------------------------------------------------------------------------+
|               Unified Express Server (server.ts :3000)                  |
|  - Vite Dev Middleware (development) / Static dist/ (production)        |
|  - Validasi payload, Timeout 12 detik, Clamp multiplier bounds          |
|  - @google/genai SDK (GEMINI_API_KEY hanya di server)                   |
+-------------------------------------------------------------------------+
```

### Diagram Alur Program

```text
[Mulai]
   │
   ▼
[Load Data dari IndexedDB] ──(Kosong?)──> [Seed Benchmark Dataset: The Rustic Table]
   │
   ▼
[Pengguna Upload Excel (.xlsx/.xls) / CSV / JSON]
   │
   ▼
[salesCsv.ts: Deteksi Delimiter, Normalisasi Tanggal, Agregasi Baris]
   │
   ├──(Baris tidak valid semua)──> [Tampilkan Pesan Error Upload]
   │
   ▼
[Simpan ke SalesRepository & Ekstrak Menu Baru (extractDishesFromSales)]
   │
   ▼
[Tentukan Tanggal Mulai Otomatis = Max(Date) + 1 Hari]
   │
   ▼
[generateMultiDayForecast (3 / 7 / 14 Hari ke Depan)]
   ├── Hitung 4-Week Day-of-Week WMA [0.40, 0.30, 0.20, 0.10]
   ├── Hitung Tren 7 Hari (±8%) & Musiman YoY (±15%)
   ├── (Opsional) Panggil POST /api/forecast/contextualize -> Gemini + Clamp
   │      └──(Offline / Timeout / Error)──> Fallback ke Statistik Lokal
   └── Hasil: Matriks Prediksi Menu x Hari + Interval 80% + Rekomendasi Prep
   │
   ▼
[Output: Tabel Matriks, Kartu Harian, Export CSV, atau Kitchen Prep Checklist]
```

---

## 3. Frontend Documentation

### Framework & Library Utama
- **React 19** & **TypeScript** (`strict` type-checking via `tsc --noEmit`)
- **Vite 8** (`@vitejs/plugin-react`) sebagai *bundler* dan *dev middleware*
- **Tailwind CSS v4** (`@tailwindcss/vite`, dikonfigurasi melalui `src/index.css`)
- **SheetJS (`xlsx`)** untuk membaca workbook `.xlsx`/`.xls` serta mengekspor contoh Excel
- **Lucide React** untuk ikon fungsional antarmuka

### Struktur Komponen UI & Modul (`src/`)

```text
src/
├── App.tsx                                # Orkestrasi state aplikasi, routing tab, upload & modal waste
├── index.css                              # Import Tailwind CSS v4 & aturan cetak prep sheet
├── main.tsx                               # Entry point React DOM
├── types/
│   └── index.ts                           # Definisi tipe domain (AppRoute, MenuItem, SaleRecord, dll.)
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx                  # Header 3-zona: Brand, 2 tab navigasi, & tombol Upload Excel/CSV
│   ├── views/
│   │   ├── UploadForecastView.tsx         # Halaman utama: dropzone upload, KPI, kartu harian, matriks prediksi, modal riwayat
│   │   └── PrepWorkspaceView.tsx          # Halaman Kitchen Prep: checklist stasiun, BOM, kebutuhan bahan & update stok
│   └── common/
│       ├── Badge.tsx                      # Label status operasional
│       ├── Button.tsx                     # Komponen tombol standar dengan loading state
│       ├── Card.tsx                       # Wadah konten flat single-elevation
│       └── Modal.tsx                      # Dialog modal aksesibel
├── engine/
│   ├── forecastingEngine.ts               # WMA 4-minggu, tren, musiman YoY, backtest MAE/MAPE, prediksi multi-hari
│   ├── recommendationEngine.ts            # Dekomposisi BOM resep & agregasi kebutuhan bahan baku
│   └── unitConversion.ts                  # Konversi satuan massa & volume (g↔kg, ml↔L)
├── utils/
│   ├── salesCsv.ts                        # Parser Excel/CSV/JSON, generator contoh 2 tahun, ekspor prediksi CSV
│   └── firestoreError.ts                  # Penanganan error terstruktur Firestore
├── db/
│   ├── indexedDb.ts                       # Wrapper IndexedDB + fallback memory untuk environment test
│   └── repositories.ts                    # Abstraksi Repository untuk setiap entity
├── services/
│   ├── contextualForecastService.ts       # Klien API Gemini dengan cache IndexedDB 30 menit & offline fallback
│   ├── authService.ts                     # Layanan autentikasi Firebase opsional
│   └── firestoreDataService.ts            # Sinkronisasi data Firestore opsional
└── data/
    └── benchmarkData.ts                   # Dataset demo awal (The Rustic Table: 30 hari, 12 menu, 20 bahan)
```

### Aset Statis (`public/`)
- `public/contoh_data_penjualan_restoran.xlsx`: File Excel contoh siap pakai berisi **3.650 baris** data penjualan selama **2 tahun penuh** (`2024-11-13` s/d `2026-11-12`) pada sheet `Data Penjualan` dan panduan kolom pada sheet `Panduan Format`. Dapat diunduh langsung dari tombol **Sample Excel (.xlsx)** di aplikasi maupun melalui path `/contoh_data_penjualan_restoran.xlsx`.

---

## 4. Backend Documentation

### API Endpoints (`server.ts`)

| Method | Endpoint | Deskripsi | Request / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Mengecek status server & konfigurasi kunci Gemini | **200 OK**: `{ status, geminiConfigured, timestamp }` |
| `POST` | `/api/forecast/contextualize` | Analisis kontekstual cuaca & event menggunakan Gemini (`gemini-4-hydrogen`) dengan timeout 12 detik | **Body**: `{ targetDate, dayOfWeek, weatherForecast, eventContext, adjustmentLimitPct, dishes[] }`<br>**200 OK**: `{ modelVersion, adjustmentLimitPct, generalAssessment, adjustments[], isFallback: false, generatedAt }`<br>**400 / 502 / 503 / 504**: `{ error, fallbackRequired: true }` |

### Database Schema

Aplikasi menggunakan **IndexedDB (`wasteless_db_v1`, v2)** sebagai penyimpanan utama *offline-first* dan menyediakan skema **Firestore** (`firebase-blueprint.json` + `firestore.rules`) untuk sinkronisasi cloud opsional:

#### 1. IndexedDB Object Stores (`src/db/indexedDb.ts`)
- `sales_records` *(keyPath: `id`, index: `date`)* — Riwayat transaksi penjualan hasil upload / input manual.
- `menu_items` *(keyPath: `id`)* — Daftar menu aktif beserta stasiun, harga, dan resep `ingredients[]`.
- `ingredients` *(keyPath: `id`)* — Katalog bahan baku, `currentStock`, `safetyStock`, `unit`, dan tanggal kedaluwarsa.
- `prep_checklists` *(keyPath: `id`, index: `prepSheetId`)* — Status penyelesaian checklist per tanggal, shift, dan revisi.
- `prep_overrides` *(keyPath: `id`)* — Penyesuaian manual *Chef Par* per `prepSheetId`.
- `closed_days` *(keyPath: `id`)* — Tanggal tutup restoran (prediksi & prep otomatis bernilai `0`).
- `waste_records` *(keyPath: `id`)* — Catatan limbah pangan (*Overproduction*, *Expired*, *Prep Mistake*, *Quality Defect*).
- `stock_movements` *(keyPath: `id`)* — Log mutasi stok bahan baku.
- `contextual_cache` *(keyPath: `id`)* — Cache hasil analisis AI per kombinasi tanggal dan konteks.
- `settings` *(keyPath: `id`)* — Konfigurasi restoran, batas persentase AI, dan buffer per stasiun.

#### 2. Struktur Koleksi Firestore (`firebase-blueprint.json`)
- `/users/{userId}` — Profil staf & pemetaan `restaurantId` (`owner`, `general_manager`, `head_chef`, `line_cook`).
- `/restaurants/{restaurantId}` — Profil restoran & daftar stasiun dapur.
- `/restaurants/{restaurantId}/menu_items/{menuItemId}` — Katalog menu & resep BOM.
- `/restaurants/{restaurantId}/ingredients/{ingredientId}` — Inventaris bahan mentah.
- `/restaurants/{restaurantId}/daily_sales/{salesId}` — Ringkasan penjualan harian.
- `/restaurants/{restaurantId}/prep_sheets/{sheetId}` — Rekomendasi & status checklist persiapan.
- `/restaurants/{restaurantId}/waste_records/{recordId}` — Log kerugian limbah pangan.

### Konfigurasi Environment (`.env.example`)

Salin file `.env.example` menjadi `.env` di root proyek:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

- `GEMINI_API_KEY`: API key Gemini yang dipakai **hanya di server (`server.ts`)** untuk endpoint `/api/forecast/contextualize`. Jika tidak diisi, aplikasi tetap berjalan normal menggunakan mesin prediksi statistik lokal.
- `APP_URL`: URL dasar aplikasi saat di-deploy.

---

## 5. Petunjuk Localhost

### Prasyarat
- **Node.js** versi `20+`
- **npm** (bawaan Node.js)

### Langkah Instalasi & Menjalankan Aplikasi

1. **Clone repositori dan masuk ke direktori proyek**
   ```bash
   git clone <url-repositori-github>
   cd <nama-folder-proyek>
   ```

2. **Instal seluruh dependencies**
   ```bash
   npm install
   ```

3. **Siapkan file environment (`.env`)**
   ```bash
   cp .env.example .env
   ```
   *(Opsional)* Isi `GEMINI_API_KEY` pada `.env` jika ingin mengaktifkan fitur penyesuaian cuaca & event berbasis Gemini AI.

4. **Jalankan server development (Express + Vite pada port `3000`)**
   ```bash
   npm run dev
   ```

5. **Buka aplikasi di browser**
   Akses `http://localhost:3000`.
   - Untuk langsung menguji alur upload, klik **Sample Excel (.xlsx)** lalu unggah kembali file tersebut pada area upload.

### Perintah Verifikasi & Produksi Lainnya
- `npm run lint` — Pemeriksaan tipe TypeScript (`tsc --noEmit`)
- `npm test` — Menjalankan unit test suite (`vitest run`)
- `npm run build` — Mem-build bundle frontend produksi ke folder `dist/`
- `npm run start` — Menjalankan server Express mode produksi (`node server.ts`)
