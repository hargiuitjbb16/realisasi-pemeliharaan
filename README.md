# Dashboard Realisasi Pemeliharaan Gardu Induk — PLN UIT JBB

Dashboard web statis untuk monitoring realisasi rutin dan non-rutin pemeliharaan gardu induk. Semua KPI, tabel, filter, grafik, dan insight dihitung dari snapshot data yang tersimpan di proyek.

## Fitur

- Dashboard realisasi rutin: 8 KPI, filter termasuk **BAY**, grafik per bulan/UPT/ULTG/GI, tabel detail, pencarian, ekspor CSV, dan insight AI lokal.
- Dashboard realisasi non-rutin/emergency: filter, KPI, grafik, tabel, pagination, dan ekspor CSV.
- Data service terpisah dari tampilan agar sumber dapat diganti dengan CSV, JSON, REST API, basis data, atau Google Sheets API.

## Menjalankan lokal

Jalankan `start_server.ps1` melalui PowerShell, lalu buka `http://localhost:8085/`.

## Struktur proyek

```text
index.html                 Antarmuka dashboard
css/dashboard.css          Gaya antarmuka
js/app.js                  State, filter, KPI, tabel, dan interaksi
js/charts.js               Konfigurasi grafik
services/                  Abstraksi layanan data dan insight
data/                      Snapshot data rutin dan non-rutin
start_server.ps1           Server lokal sederhana
```

## Publikasi ke GitHub

1. Buat repository baru di GitHub; gunakan repository **private** bila snapshot data operasional tidak boleh terbuka.
2. Unggah seluruh isi folder ini, kecuali berkas yang diabaikan oleh `.gitignore`.
3. Pastikan struktur folder `css`, `js`, `services`, dan `data` tetap utuh karena `index.html` memuat berkas-berkas tersebut secara relatif.
4. Untuk GitHub Pages, pilih branch `main` dan folder root (`/`) pada **Settings → Pages**. Dashboard akan tersedia di alamat Pages repository.

## Keamanan

- Jangan unggah `.env` atau token API.
- Tinjau isi folder `data/` sebelum membuat repository public.
- Insight bawaan berjalan lokal dan tidak mengirimkan snapshot pemeliharaan ke layanan AI eksternal.
