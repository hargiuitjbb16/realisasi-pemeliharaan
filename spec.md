Aplikasi Dashboard Web Berbasis AI dengan struktur berikut:
Tab Realisasi Rutin Pemeliharaan: Dashboard dari sumber data:
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=1881186405#gid=1881186405
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=1361181458#gid=1361181458
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=1580250190#gid=1580250190
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=1866607448#gid=1866607448
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=427526776#gid=427526776
- https://docs.google.com/spreadsheets/d/1A1ca5mM6hk_D2IrddZ0edzHpSHo4afyaAnQwXgmyAV8/edit?gid=1857885530#gid=1857885530
Tab Summary: Memberikan rekomendasi AI untuk semua parameter yang ada
# SPEC.md

# AI WEB DASHBOARD

# REALISASI RUTIN PEMELIHARAAN GARDU INDUK

## PLN UIT JBB

---

## 1. SYSTEM ROLE

You are an expert **Full-Stack Web Developer, UI/UX Designer, Data Analyst, and AI Dashboard Engineer**.

Build a production-ready web dashboard for monitoring:

> **Realisasi Rutin Pemeliharaan Gardu Induk**

The application will be used by operational teams and management to monitor maintenance realization, identify delays, analyze rescheduling causes, monitor report availability, monitor manpower, and generate AI-based insights.

The application must have a **professional PLN enterprise dashboard appearance**, optimized for management presentation.

---

# 2. PRIMARY OBJECTIVE

Build a modern, responsive, interactive, AI-powered web dashboard that transforms maintenance spreadsheet data into:

```text
RAW DATA
   ↓
DATA PROCESSING
   ↓
KPI MONITORING
   ↓
VISUAL ANALYTICS
   ↓
AI ANALYSIS
   ↓
ANOMALY DETECTION
   ↓
EARLY WARNING
   ↓
MANAGEMENT INSIGHT
```

The dashboard must not behave like a simple spreadsheet viewer.

It must function as a:

> **Maintenance Monitoring & Management Decision Support Dashboard**

---

# 3. IMPORTANT DEVELOPMENT RULES

## 3.1 Do NOT create a static mockup

The dashboard must be functional.

All:

* filters
* KPI cards
* charts
* tables
* search
* sorting
* pagination
* drill-down
* AI analysis

must be connected to the same data source/state.

---

## 3.2 Data-driven UI

Never hardcode KPI numbers.

All KPI values and charts must be calculated from the dataset.

Example:

```text
Total Rencana
=
COUNT(records)
```

```text
Total Realisasi
=
COUNT(records where REALISASI is not empty)
```

---

## 3.3 Preserve source data

The dashboard must not modify the source dataset unless the user explicitly performs an authorized edit operation.

---

## 3.4 Responsive

Primary target:

```text
1920 × 1080
16:9
```

Also support:

```text
1366 × 768
Tablet
Laptop
```

---

# 4. APPLICATION NAME

Display application title:

> **DASHBOARD REALISASI RUTIN PEMELIHARAAN GARDU INDUK**

Subtitle:

> **PLN UNIT INDUK TRANSMISI JAWA BAGIAN BARAT**

---

# 5. MAIN NAVIGATION

Create the following navigation:

```text
Dashboard
│
├── Overview
├── Realisasi Pemeliharaan
├── Analisis
├── Jadwal Ulang
├── Ketersediaan Laporan
├── Personil
└── AI Insight
```

The main development priority is:

> **Realisasi Pemeliharaan**

---

# 6. DATA SOURCE

The primary dataset comes from a spreadsheet.

The application must be designed so that the spreadsheet can later be connected through:

```text
Google Sheets API
REST API
CSV
JSON
Database
```

For initial development, create a data service abstraction:

```text
/data
/services
/components
```

Do not tightly couple UI components directly to spreadsheet implementation.

Use a repository/service pattern such as:

```text
MaintenanceDataService
```

Example interface:

```typescript
getMaintenanceData()
getMaintenanceById(id)
getFilteredMaintenance(filters)
getMaintenanceSummary(filters)
```

---

# 7. DATA SCHEMA

The dataset contains exactly these primary columns:

|  # | Column                |
| -: | --------------------- |
|  1 | UPT                   |
|  2 | ULTG                  |
|  3 | LOKASI                |
|  4 | BAY                   |
|  5 | JENIS BAY             |
|  6 | TEGANGAN              |
|  7 | URAIAN PEKERJAAN      |
|  8 | PENANGGUNG JAWAB      |
|  9 | PELAKSANA             |
| 10 | RENCANA               |
| 11 | STATUS                |
| 12 | PENYEBAB JADWAL ULANG |
| 13 | KETERANGAN            |
| 14 | REALISASI             |
| 15 | KETERSEDIAAN LAPORAN  |
| 16 | JUMLAH PERSONIL       |

Use the exact column names above.

Do not rename them in the source data model.

---

# 8. DATA TYPES

Use the following types:

```typescript
interface MaintenanceRecord {
    id: string;

    UPT: string;
    ULTG: string;
    LOKASI: string;
    BAY: string;
    JENIS_BAY: string;
    TEGANGAN: string | number;
    URAIAN_PEKERJAAN: string;
    PENANGGUNG_JAWAB: string;
    PELAKSANA: string;
    RENCANA: string | Date;
    STATUS: string;
    PENYEBAB_JADWAL_ULANG: string;
    KETERANGAN: string;
    REALISASI: string | Date | null;
    KETERSEDIAAN_LAPORAN: string | boolean;
    JUMLAH_PERSONIL: number;
}
```

---

# 9. DASHBOARD LAYOUT

Use the following hierarchy:

```text
HEADER
   ↓
FILTER BAR
   ↓
KPI CARDS
   ↓
MAIN ANALYTICS
   ↓
AI INSIGHT
   ↓
SECONDARY ANALYTICS
   ↓
DETAILED DATA TABLE
```

---

# 10. HEADER

Create a premium enterprise header.

Left:

```text
PLN
DASHBOARD REALISASI RUTIN
PEMELIHARAAN GARDU INDUK
```

Right:

```text
Last Update
21 September 2026 | 14:00 WIB

🔔 Alert
🤖 AI Assistant
```

Do not make the header oversized.

---

# 11. FILTER BAR

Create a sticky/filter toolbar.

Filters:

```text
PERIODE
UPT
ULTG
LOKASI
BAY
JENIS BAY
TEGANGAN
STATUS
PENANGGUNG JAWAB
PELAKSANA
KETERSEDIAAN LAPORAN
```

Include:

```text
[ RESET FILTER ]
[ REFRESH DATA ]
```

All dashboard components must react immediately to filter changes.

---

# 12. KPI CARDS

Create 8 KPI cards.

### KPI 1

```text
TOTAL RENCANA
```

### KPI 2

```text
TOTAL REALISASI
```

### KPI 3

```text
% REALISASI
```

Formula:

```text
TOTAL REALISASI / TOTAL RENCANA × 100
```

### KPI 4

```text
BELUM REALISASI
```

### KPI 5

```text
JADWAL ULANG
```

### KPI 6

```text
LAPORAN TERSEDIA
```

### KPI 7

```text
LAPORAN BELUM TERSEDIA
```

### KPI 8

```text
TOTAL PERSONIL
```

Every KPI must support:

* number formatting
* tooltip
* click/drill-down
* active filtering

---

# 13. MAIN CHART

Create:

## RENCANA VS REALISASI

Use a combination:

```text
Bar Chart
+
Line Chart
```

Display:

```text
Rencana
Realisasi
% Realisasi
```

X-axis:

```text
Bulan
```

Y-axis:

```text
Jumlah Pekerjaan
```

Chart must update based on selected filters.

---

# 14. UPT ANALYSIS

Create:

## REALISASI BERDASARKAN UPT

Use horizontal bar chart.

Display:

```text
UPT
Rencana
Realisasi
% Realisasi
```

Allow click on UPT to filter the entire dashboard.

---

# 15. ULTG ANALYSIS

Create:

## REALISASI BERDASARKAN ULTG

Display:

```text
ULTG
Rencana
Realisasi
Jadwal Ulang
Belum Realisasi
```

Use a clear comparative chart.

---

# 16. GI ANALYSIS

Create:

## REALISASI
