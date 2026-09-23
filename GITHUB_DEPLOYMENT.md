# Panduan Upload ke GitHub — Dashboard PLN UIT JBB

## File yang wajib untuk dashboard berjalan
- `index.html`
- `css/dashboard.css`
- `js/app.js`
- `js/charts.js`
- `js/chart.umd.min.js`
- `services/MaintenanceDataService.js`
- `services/NonRoutineDataService.js`
- `services/AiService.js`
- seluruh folder `data/` yang dipakai dashboard

## File pendukung
- `README.md` — dokumentasi
- `.gitignore` — mengabaikan file lokal/credential
- `.nojekyll` — membantu deployment GitHub Pages
- `spec.md`, `spec2.md` — dokumentasi spesifikasi, tidak wajib untuk runtime
- `start_server.ps1` — hanya untuk menjalankan dashboard secara lokal di Windows
- `generate_non_routine_snapshot.js` — tool pengolahan snapshot, tidak wajib untuk GitHub Pages

## Upload melalui website GitHub

1. Login ke GitHub.
2. Pilih **New repository**.
3. Beri nama, misalnya:
   `pln-uit-jbb-maintenance-dashboard`
4. Untuk data operasional, pilih **Private** kecuali publikasi data memang sudah disetujui.
5. Klik **Create repository**.
6. Di repository, klik **Add file → Upload files**.
7. Ekstrak ZIP ini terlebih dahulu.
8. Upload **isi folder proyek**, bukan folder pembungkus ZIP.
9. Pastikan struktur di GitHub seperti ini:

```text
index.html
.nojekyll
.gitignore
README.md
css/
js/
services/
data/
```

10. Klik **Commit changes**.

## Aktifkan GitHub Pages

1. Buka **Settings** repository.
2. Pilih **Pages**.
3. Pada **Build and deployment**, pilih:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/(root)`
4. Klik **Save**.
5. Tunggu proses deployment selesai.
6. GitHub akan memberikan alamat website Pages.

## Catatan penting

Dashboard saat ini menggunakan snapshot data lokal di folder `data/`, sehingga GitHub Pages dapat menjalankannya sebagai static website.

Tombol refresh pada aplikasi membaca kembali file JSON lokal; itu **belum berarti dashboard otomatis menarik perubahan terbaru dari Google Sheets**.

Jika dashboard akan dibuat otomatis mengambil data Google Sheets terbaru, tahap berikutnya perlu menambahkan backend/API atau mekanisme publikasi data yang aman. Jangan menaruh API key, password, token, atau credential Google di JavaScript browser.

## Pemeriksaan sebelum repository dibuat Public

Tinjau terlebih dahulu:
- isi `data/*.json`
- isi `data/*.csv`
- URL Google Sheets di `spec.md`
- informasi operasional/internal
- nama/personel atau informasi lain yang tidak boleh dipublikasikan

Jika data bersifat internal PLN, gunakan repository **Private** atau deploy ke lingkungan internal yang disetujui.
