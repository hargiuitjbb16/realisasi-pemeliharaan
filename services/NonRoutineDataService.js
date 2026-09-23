/**
 * NonRoutineDataService.js
 * Service abstraction for Realisasi Non Rutin / Emergency maintenance data.
 */

class NonRoutineDataService {
    constructor() {
        this.records = [];
        this.isLoaded = false;
        this.metadata = {
            worksheet: 'NON RUTIN_EMERGENCY 2026',
            spreadsheetId: '1F7lFnzj7YhqQvhbuHCsrkVrtaHpr8NtyCvdBhfPo1lk',
            gid: '1764063918',
            sourceUrl: 'https://docs.google.com/spreadsheets/d/1F7lFnzj7YhqQvhbuHCsrkVrtaHpr8NtyCvdBhfPo1lk/edit?gid=1764063918#gid=1764063918',
            snapshotAt: null
        };
        this.monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOP', 'DES'];
    }

    async init() {
        if (typeof window !== 'undefined') {
            if (window.NON_ROUTINE_DATA_METADATA) {
                this.metadata = { ...this.metadata, ...window.NON_ROUTINE_DATA_METADATA };
            }
            if (Array.isArray(window.NON_ROUTINE_DATA)) {
                this.records = window.NON_ROUTINE_DATA.map((row, idx) => this.normalizeRecord(row, idx));
                this.isLoaded = true;
                return this.records;
            }
            if (window.NON_ROUTINE_RAW_CSV) {
                this.records = this.parseCsv(window.NON_ROUTINE_RAW_CSV)
                    .map((row, idx) => this.normalizeRecord(row, idx))
                    .filter(r => this.hasMeaningfulData(r));
                this.isLoaded = true;
                return this.records;
            }
        }

        try {
            const resp = await fetch('data/non_routine_data.json');
            if (resp.ok) {
                const payload = await resp.json();
                if (payload.metadata) this.metadata = { ...this.metadata, ...payload.metadata };
                if (Array.isArray(payload.records)) {
                    this.records = payload.records.map((row, idx) => this.normalizeRecord(row, idx)).filter(r => this.hasMeaningfulData(r));
                } else if (payload.rawCsv) {
                    this.records = this.parseCsv(payload.rawCsv).map((row, idx) => this.normalizeRecord(row, idx)).filter(r => this.hasMeaningfulData(r));
                }
                this.isLoaded = true;
                return this.records;
            }
        } catch (e) {
            console.warn('Could not load data/non_routine_data.json directly:', e);
        }

        this.records = [];
        this.isLoaded = true;
        return this.records;
    }

    async refresh() {
        const resp = await fetch(`data/non_routine_data.json?updated=${Date.now()}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`Non-routine data refresh failed with HTTP ${resp.status}`);

        const payload = await resp.json();
        let refreshed = [];
        if (Array.isArray(payload.records)) {
            refreshed = payload.records.map((row, idx) => this.normalizeRecord(row, idx));
        } else if (payload.rawCsv) {
            refreshed = this.parseCsv(payload.rawCsv).map((row, idx) => this.normalizeRecord(row, idx));
        } else {
            throw new Error('Non-routine refresh returned an invalid dataset');
        }

        refreshed = refreshed.filter(r => this.hasMeaningfulData(r));
        if (refreshed.length === 0) throw new Error('Non-routine refresh returned no usable rows');

        if (payload.metadata) this.metadata = { ...this.metadata, ...payload.metadata };
        this.records = refreshed;
        this.isLoaded = true;
        return this.records;
    }

    parseCsv(csvText) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const ch = csvText[i];
            const next = csvText[i + 1];

            if (ch === '"') {
                if (inQuotes && next === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                row.push(cell);
                cell = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && next === '\n') i++;
                row.push(cell);
                if (row.some(v => String(v).trim() !== '')) rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += ch;
            }
        }

        if (cell.length > 0 || row.length > 0) {
            row.push(cell);
            if (row.some(v => String(v).trim() !== '')) rows.push(row);
        }

        if (rows.length === 0) return [];
        const headers = rows[0].map(h => this.cleanValue(h));
        return rows.slice(1).map(values => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = this.cleanValue(values[idx]); });
            return obj;
        });
    }

    cleanValue(value) {
        if (value === undefined || value === null) return '';
        return String(value).replace(/﻿/g, '').replace(/\s+/g, ' ').trim();
    }

    normalizeRecord(row, idx) {
        const get = (...keys) => {
            for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return this.cleanValue(row[key]);
            }
            return '';
        };

        const no = get('No.', 'NO', 'No');
        const upt = this.normalizeUpper(get('UPT'));
        const ultg = this.normalizeUpper(get('ULTG'));
        const lokasi = this.normalizeUpper(get('Lokasi', 'LOKASI'));
        const namaBay = get('Nama Bay', 'NAMA_BAY');
        const uraian = get('Uraian Pekerjaan', 'URAIAN_PEKERJAAN');
        const peralatanPadam = get('Peralatan Padam', 'PERALATAN_PADAM');
        const padam = this.normalizeVoltage(get('Padam', 'PADAM'));
        const sifat = get('Sifat', 'SIFAT');
        const pnJawab = this.normalizeUpper(get('PN Jawab', 'PN_JAWAB'));
        const hari = this.normalizeUpper(get('Awal HARI', 'AWAL_HARI'));
        const tanggal = get('Awal TGL', 'AWAL_TGL');
        const bulan = this.normalizeMonth(get('Awal BULAN', 'AWAL_BULAN'));
        const tahun = get('Awal TAHUN', 'AWAL_TAHUN');
        const awalJam = this.normalizeTime(get('Awal JAM', 'AWAL_JAM'));
        const akhirJam = this.normalizeTime(get('Akhir JAM', 'AKHIR_JAM'));
        const peralatan = get('PERALATAN', 'Peralatan');

        const startMinutes = this.timeToMinutes(awalJam);
        const endMinutesRaw = this.timeToMinutes(akhirJam);
        let durasiMenit = 0;
        let durasiFormatted = '-';
        if (startMinutes !== null && endMinutesRaw !== null) {
            let endMinutes = endMinutesRaw;
            if (endMinutes < startMinutes) endMinutes += 24 * 60;
            durasiMenit = endMinutes - startMinutes;
            durasiFormatted = this.formatDuration(durasiMenit);
        }

        const issues = [];
        if (!no) issues.push('NO KOSONG');
        if (!tahun || Number.isNaN(Number(tahun))) issues.push('TAHUN TIDAK VALID');
        if (!bulan) issues.push('BULAN TIDAK VALID');
        if (!tanggal || Number.isNaN(Number(tanggal))) issues.push('TANGGAL TIDAK VALID');
        if (!awalJam || startMinutes === null) issues.push('JAM AWAL KOSONG/INVALID');
        if (!akhirJam || endMinutesRaw === null) issues.push('JAM AKHIR KOSONG/INVALID');
        if ([peralatanPadam, padam, peralatan, namaBay, uraian].some(v => String(v).toUpperCase().includes('#REF!'))) issues.push('REFERENSI SHEET ERROR (#REF!)');

        const isTanpaPadam = [peralatanPadam, namaBay, padam].some(v => String(v).toUpperCase().includes('TANPA PADAM'));
        const monthIndex = this.monthOrder.indexOf(bulan);
        const yearNum = Number(tahun) || 0;
        const dayNum = Number(tanggal) || 0;
        const sortDate = yearNum && monthIndex >= 0 && dayNum ? `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : '';

        return {
            id: `NR-${String(idx + 1).padStart(5, '0')}`,
            sourceRow: idx + 2,
            NO: no,
            UPT: upt,
            ULTG: ultg,
            LOKASI: lokasi,
            NAMA_BAY: namaBay,
            URAIAN_PEKERJAAN: uraian,
            PERALATAN_PADAM: peralatanPadam,
            PADAM: padam,
            SIFAT: sifat,
            PN_JAWAB: pnJawab,
            AWAL_HARI: hari,
            AWAL_TGL: tanggal,
            AWAL_BULAN: bulan,
            AWAL_TAHUN: tahun,
            AWAL_JAM: awalJam,
            AKHIR_JAM: akhirJam,
            PERALATAN: peralatan,
            TANGGAL_LABEL: [hari, tanggal, bulan, tahun].filter(Boolean).join(' '),
            TANGGAL_SORT: sortDate,
            DURASI_MENIT: durasiMenit,
            DURASI_JAM: Number((durasiMenit / 60).toFixed(1)),
            DURASI_FORMATTED: durasiFormatted,
            IS_TANPA_PADAM: isTanpaPadam,
            KATEGORI_PADAM: isTanpaPadam ? 'TANPA PADAM' : (padam || 'PADAM / TEGANGAN TIDAK DIISI'),
            DATA_QUALITY: issues,
            raw: { ...row }
        };
    }

    normalizeUpper(value) {
        return this.cleanValue(value).toUpperCase();
    }

    normalizeMonth(value) {
        const m = this.cleanValue(value).toUpperCase();
        const aliases = { NOV: 'NOP', SEP: 'SEP', SEPT: 'SEP', MAY: 'MEI', AUG: 'AGU', OKT: 'OKT', OCT: 'OKT', DES: 'DES', DEC: 'DES' };
        const normalized = aliases[m] || m;
        return this.monthOrder.includes(normalized) ? normalized : normalized;
    }

    normalizeVoltage(value) {
        const v = this.cleanValue(value);
        if (!v) return '';
        if (v.toUpperCase().includes('TANPA PADAM')) return 'TANPA PADAM';
        return v.replace(/\s+/g, '').toUpperCase().replace('KV', 'KV');
    }

    normalizeTime(value) {
        const v = this.cleanValue(value);
        if (!v) return '';
        const match = v.match(/^(\d{1,2})[:.](\d{2})/);
        if (!match) return v;
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }

    timeToMinutes(time) {
        if (!time) return null;
        const match = String(time).match(/^(\d{1,2})[:.](\d{2})$/);
        if (!match) return null;
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
    }

    formatDuration(minutes) {
        if (!minutes || minutes <= 0) return '-';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m} Menit`;
        return `${h} Jam ${m} Menit`;
    }

    hasMeaningfulData(record) {
        return Boolean(record.UPT || record.ULTG || record.LOKASI || record.NAMA_BAY || record.URAIAN_PEKERJAAN);
    }

    getMetadata() {
        return { ...this.metadata };
    }

    getData() {
        return [...this.records];
    }

    getFilteredData(filters = {}) {
        return this.records.filter(r => {
            if (filters.tahun && filters.tahun !== 'ALL' && String(r.AWAL_TAHUN) !== String(filters.tahun)) return false;
            if (filters.bulan && filters.bulan !== 'ALL' && r.AWAL_BULAN !== filters.bulan) return false;
            if (filters.upt && filters.upt !== 'ALL' && r.UPT !== filters.upt) return false;
            if (filters.ultg && filters.ultg !== 'ALL' && r.ULTG !== filters.ultg) return false;
            if (filters.lokasi && filters.lokasi !== 'ALL' && r.LOKASI !== filters.lokasi) return false;
            if (filters.padam && filters.padam !== 'ALL' && r.KATEGORI_PADAM !== filters.padam && r.PADAM !== filters.padam) return false;
            if (filters.sifat && filters.sifat !== 'ALL' && String(r.SIFAT) !== String(filters.sifat)) return false;
            if (filters.search && filters.search.trim() !== '') {
                const q = filters.search.toLowerCase().trim();
                const haystack = [
                    r.id, r.NO, r.UPT, r.ULTG, r.LOKASI, r.NAMA_BAY, r.URAIAN_PEKERJAAN,
                    r.PERALATAN_PADAM, r.PADAM, r.SIFAT, r.PN_JAWAB, r.TANGGAL_LABEL, r.PERALATAN,
                    ...(r.DATA_QUALITY || [])
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }

    getSummary(filters = {}) {
        const dataset = this.getFilteredData(filters);
        const total = dataset.length;
        const tanpaPadam = dataset.filter(r => r.IS_TANPA_PADAM).length;
        const padam = total - tanpaPadam;
        const completeTiming = dataset.filter(r => r.DURASI_MENIT > 0).length;
        const incompleteTiming = total - completeTiming;
        const totalDurasiMenit = dataset.reduce((sum, r) => sum + (Number(r.DURASI_MENIT) || 0), 0);
        const avgDurasiMenit = completeTiming > 0 ? Math.round(totalDurasiMenit / completeTiming) : 0;
        const refErrors = dataset.filter(r => r.DATA_QUALITY.includes('REFERENSI SHEET ERROR (#REF!)')).length;
        const dataIssues = dataset.filter(r => r.DATA_QUALITY.length > 0).length;

        return {
            total,
            padam,
            tanpaPadam,
            completeTiming,
            incompleteTiming,
            totalDurasiMenit,
            totalDurasiJam: Number((totalDurasiMenit / 60).toFixed(1)),
            avgDurasiMenit,
            avgDurasiJam: Number((avgDurasiMenit / 60).toFixed(1)),
            avgDurasiFormatted: this.formatDuration(avgDurasiMenit),
            refErrors,
            dataIssues
        };
    }

    getTrend(filters = {}) {
        const dataset = this.getFilteredData(filters);
        const trendMap = {};
        dataset.forEach(r => {
            const year = r.AWAL_TAHUN || 'TAHUN ?';
            const month = r.AWAL_BULAN || 'BULAN ?';
            const monthIdx = this.monthOrder.indexOf(month);
            const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
            if (!trendMap[key]) trendMap[key] = { label: `${month} ${year}`, total: 0, padam: 0, tanpaPadam: 0, sort: key };
            trendMap[key].total++;
            if (r.IS_TANPA_PADAM) trendMap[key].tanpaPadam++;
            else trendMap[key].padam++;
        });
        const items = Object.values(trendMap).sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
        return {
            labels: items.map(i => i.label),
            totalData: items.map(i => i.total),
            padamData: items.map(i => i.padam),
            tanpaPadamData: items.map(i => i.tanpaPadam)
        };
    }

    getDistribution(filters = {}) {
        const dataset = this.getFilteredData(filters);
        const byUpt = {};
        const byPadam = {};
        const bySifat = {};
        dataset.forEach(r => {
            const upt = r.UPT || 'UPT TIDAK DIISI';
            if (!byUpt[upt]) byUpt[upt] = { label: upt, total: 0, padam: 0, tanpaPadam: 0 };
            byUpt[upt].total++;
            if (r.IS_TANPA_PADAM) byUpt[upt].tanpaPadam++;
            else byUpt[upt].padam++;

            const padamKey = r.KATEGORI_PADAM || 'TIDAK DIISI';
            byPadam[padamKey] = (byPadam[padamKey] || 0) + 1;

            const sifatKey = r.SIFAT ? `Sifat ${r.SIFAT}` : 'Sifat Tidak Diisi';
            bySifat[sifatKey] = (bySifat[sifatKey] || 0) + 1;
        });

        return {
            byUpt: Object.values(byUpt).sort((a, b) => b.total - a.total),
            byPadam: Object.entries(byPadam).map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total),
            bySifat: Object.entries(bySifat).map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total)
        };
    }

    getDistinctFilterOptions() {
        const years = new Set();
        const months = new Set();
        const upts = new Set();
        const ultgs = new Set();
        const lokasis = new Set();
        const padams = new Set();
        const sifats = new Set();

        this.records.forEach(r => {
            if (r.AWAL_TAHUN) years.add(r.AWAL_TAHUN);
            if (r.AWAL_BULAN) months.add(r.AWAL_BULAN);
            if (r.UPT) upts.add(r.UPT);
            if (r.ULTG) ultgs.add(r.ULTG);
            if (r.LOKASI) lokasis.add(r.LOKASI);
            if (r.KATEGORI_PADAM) padams.add(r.KATEGORI_PADAM);
            if (r.SIFAT) sifats.add(r.SIFAT);
        });

        const sortedMonths = Array.from(months).sort((a, b) => this.monthOrder.indexOf(a) - this.monthOrder.indexOf(b));
        return {
            years: Array.from(years).sort(),
            months: sortedMonths,
            upts: Array.from(upts).sort(),
            ultgs: Array.from(ultgs).sort(),
            lokasis: Array.from(lokasis).sort(),
            padams: Array.from(padams).sort(),
            sifats: Array.from(sifats).sort((a, b) => Number(a) - Number(b))
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NonRoutineDataService;
} else {
    window.NonRoutineDataService = NonRoutineDataService;
}
