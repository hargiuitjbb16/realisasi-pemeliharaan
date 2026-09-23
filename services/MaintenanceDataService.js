/**
 * MaintenanceDataService.js
 * Service abstraction for Maintenance Data in PLN UIT JBB Dashboard
 * Conforms to SPEC.MD Sections 6, 7, and 8.
 */

class MaintenanceDataService {
    constructor() {
        this.records = [];
        this.isLoaded = false;
        this.listeners = [];
        this.googleSheetsSources = [
            { gid: '1881186405', upt: 'UPT CAWANG' },
            { gid: '1361181458', upt: 'UPT CIKUPA' },
            { gid: '1580250190', upt: 'UPT CILEGON' },
            { gid: '1866607448', upt: 'UPT PULOGADUNG' },
            { gid: '427526776', upt: 'UPT GANDUL' },
            { gid: '1857885530', upt: 'UPT DURI KOSAMBI' }
        ];
    }

    /**
     * Initialize data from window.MAINTENANCE_DATA or fetch json
     */
    async init() {
        if (typeof window !== 'undefined' && window.MAINTENANCE_DATA && Array.isArray(window.MAINTENANCE_DATA)) {
            this.records = window.MAINTENANCE_DATA;
            this.isLoaded = true;
            return this.records;
        }

        try {
            const resp = await fetch('data/maintenance_data.json');
            if (resp.ok) {
                this.records = await resp.json();
                this.isLoaded = true;
                return this.records;
            }
        } catch (e) {
            console.warn('Could not load data/maintenance_data.json directly:', e);
        }

        if (typeof window !== 'undefined' && window.MAINTENANCE_DATA) {
            this.records = window.MAINTENANCE_DATA;
            this.isLoaded = true;
            return this.records;
        }

        this.records = [];
        this.isLoaded = true;
        return this.records;
    }

    async refresh() {
        const resp = await fetch(`data/maintenance_data.json?updated=${Date.now()}`, {
            cache: 'no-store'
        });

        if (!resp.ok) {
            throw new Error(`Data refresh failed with HTTP ${resp.status}`);
        }

        const refreshedRecords = await resp.json();
        if (!Array.isArray(refreshedRecords)) {
            throw new Error('Data refresh returned an invalid dataset');
        }

        this.records = refreshedRecords;
        this.isLoaded = true;
        return this.records;
    }

    /**
     * Get all raw maintenance records
     * @returns {Array<MaintenanceRecord>}
     */
    getMaintenanceData() {
        return [...this.records];
    }

    /**
     * Get single record by ID
     * @param {string} id
     */
    getMaintenanceById(id) {
        return this.records.find(r => r.id === id) || null;
    }

    /**
     * Filter maintenance records based on multi-criteria filter object
     * @param {Object} filters
     */
    getFilteredMaintenance(filters = {}) {
        let results = [...this.records];

        if (!filters || Object.keys(filters).length === 0) {
            return results;
        }

        return results.filter(r => {
            // Periode / Month filter
            if (filters.periode && filters.periode !== 'ALL') {
                const recMonth = (r.RENCANA || '').substring(0, 3).toUpperCase();
                if (!recMonth.includes(filters.periode.substring(0, 3).toUpperCase())) {
                    return false;
                }
            }

            // UPT
            if (filters.upt && filters.upt !== 'ALL') {
                if (r.UPT !== filters.upt) return false;
            }

            // ULTG
            if (filters.ultg && filters.ultg !== 'ALL') {
                if (r.ULTG !== filters.ultg) return false;
            }

            // Lokasi
            if (filters.lokasi && filters.lokasi !== 'ALL') {
                if (r.LOKASI !== filters.lokasi) return false;
            }

            // Bay
            if (filters.bay && filters.bay !== 'ALL') {
                if (r.BAY !== filters.bay) return false;
            }

            // Jenis Bay
            if (filters.jenisBay && filters.jenisBay !== 'ALL') {
                if (r.JENIS_BAY !== filters.jenisBay) return false;
            }

            // Tegangan
            if (filters.tegangan && filters.tegangan !== 'ALL') {
                if (String(r.TEGANGAN) !== String(filters.tegangan)) return false;
            }

            // Status
            if (filters.status && filters.status !== 'ALL') {
                if (r.STATUS !== filters.status) return false;
            }

            // Penanggung Jawab
            if (filters.penanggungJawab && filters.penanggungJawab !== 'ALL') {
                if (r.PENANGGUNG_JAWAB !== filters.penanggungJawab) return false;
            }

            // Pelaksana
            if (filters.pelaksana && filters.pelaksana !== 'ALL') {
                if (r.PELAKSANA !== filters.pelaksana) return false;
            }

            // Ketersediaan Laporan
            if (filters.ketersediaanLaporan && filters.ketersediaanLaporan !== 'ALL') {
                if (r.KETERSEDIAAN_LAPORAN !== filters.ketersediaanLaporan) return false;
            }

            // Global search query
            if (filters.search && filters.search.trim() !== '') {
                const q = filters.search.toLowerCase().trim();
                const matched = (
                    (r.UPT && r.UPT.toLowerCase().includes(q)) ||
                    (r.ULTG && r.ULTG.toLowerCase().includes(q)) ||
                    (r.LOKASI && r.LOKASI.toLowerCase().includes(q)) ||
                    (r.BAY && r.BAY.toLowerCase().includes(q)) ||
                    (r.JENIS_BAY && r.JENIS_BAY.toLowerCase().includes(q)) ||
                    (r.URAIAN_PEKERJAAN && r.URAIAN_PEKERJAAN.toLowerCase().includes(q)) ||
                    (r.PENYEBAB_JADWAL_ULANG && r.PENYEBAB_JADWAL_ULANG.toLowerCase().includes(q)) ||
                    (r.KETERANGAN && r.KETERANGAN.toLowerCase().includes(q)) ||
                    (r.id && r.id.toLowerCase().includes(q))
                );
                if (!matched) return false;
            }

            return true;
        });
    }

    /**
     * Compute 8 KPIs required by SPEC.MD Section 12
     * @param {Object} filters
     */
    getMaintenanceSummary(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const totalRencana = dataset.length;

        let totalRealisasi = 0;
        let jadwalUlang = 0;
        let belumRealisasi = 0;
        let laporanTersedia = 0;
        let laporanBelumTersedia = 0;
        let totalPersonil = 0;
        let totalDurasiMenit = 0;
        let countTerlaksanaWithDurasi = 0;

        dataset.forEach(r => {
            if (r.STATUS === 'TERLAKSANA') {
                totalRealisasi++;
                if (Number(r.DURASI_MENIT) > 0) {
                    totalDurasiMenit += Number(r.DURASI_MENIT);
                    countTerlaksanaWithDurasi++;
                }
            } else if (r.STATUS === 'JADWAL ULANG') {
                jadwalUlang++;
            } else {
                belumRealisasi++;
            }

            // Laptek is a post-realisation document. Do not classify a planned
            // or rescheduled job as a missing report merely because no report
            // exists yet.
            if (r.REALISASI) {
                if (r.KETERSEDIAAN_LAPORAN === 'ADA') {
                    laporanTersedia++;
                } else {
                    laporanBelumTersedia++;
                }
            }

            totalPersonil += (Number(r.JUMLAH_PERSONIL) || 0);
        });

        const persenRealisasi = totalRencana > 0 
            ? ((totalRealisasi / totalRencana) * 100).toFixed(1) 
            : 0;

        const avgPersonil = totalRencana > 0
            ? (totalPersonil / totalRencana).toFixed(1)
            : 0;

        const persenLaporan = totalRealisasi > 0
            ? ((laporanTersedia / totalRealisasi) * 100).toFixed(1)
            : 0;

        const avgDurasiMenit = countTerlaksanaWithDurasi > 0
            ? Math.round(totalDurasiMenit / countTerlaksanaWithDurasi)
            : 0;
        const avgDurasiJam = Number((avgDurasiMenit / 60).toFixed(1));
        const totalDurasiJam = Number((totalDurasiMenit / 60).toFixed(1));

        return {
            totalRencana,
            totalRealisasi,
            persenRealisasi: Number(persenRealisasi),
            belumRealisasi,
            jadwalUlang,
            laporanTersedia,
            laporanBelumTersedia,
            persenLaporan: Number(persenLaporan),
            totalPersonil,
            avgPersonil: Number(avgPersonil),
            totalDurasiMenit,
            totalDurasiJam,
            avgDurasiMenit,
            avgDurasiJam
        };
    }

    /**
     * Monthly trend analysis for Rencana vs Realisasi (SPEC Section 13)
     */
    getMonthlyTrend(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOP', 'DES'];
        
        const trend = {};
        months.forEach(m => {
            trend[m] = { bulan: m, rencana: 0, realisasi: 0, persen: 0 };
        });

        dataset.forEach(r => {
            const rawMonth = (r.RENCANA || '').substring(0, 3).toUpperCase();
            const m = months.find(x => rawMonth.includes(x)) || 'JAN';
            trend[m].rencana++;
            if (r.STATUS === 'TERLAKSANA') {
                trend[m].realisasi++;
            }
        });

        const labels = [];
        const rencanaData = [];
        const realisasiData = [];
        const persenData = [];

        months.forEach(m => {
            if (trend[m].rencana > 0 || trend[m].realisasi > 0) {
                const pct = trend[m].rencana > 0 ? (trend[m].realisasi / trend[m].rencana) * 100 : 0;
                labels.push(m);
                rencanaData.push(trend[m].rencana);
                realisasiData.push(trend[m].realisasi);
                persenData.push(Number(pct.toFixed(1)));
            }
        });

        return { labels, rencanaData, realisasiData, persenData };
    }

    /**
     * UPT Analysis (SPEC Section 14)
     */
    getUptAnalytics(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const uptMap = {};

        dataset.forEach(r => {
            const upt = r.UPT || 'UPT LAINNYA';
            if (!uptMap[upt]) {
                uptMap[upt] = { upt, rencana: 0, realisasi: 0, jadwalUlang: 0, belumRealisasi: 0, personil: 0, laptekAda: 0 };
            }
            uptMap[upt].rencana++;
            if (r.STATUS === 'TERLAKSANA') {
                uptMap[upt].realisasi++;
            } else if (r.STATUS === 'JADWAL ULANG') {
                uptMap[upt].jadwalUlang++;
            } else {
                uptMap[upt].belumRealisasi++;
            }
            if (r.KETERSEDIAAN_LAPORAN === 'ADA') {
                uptMap[upt].laptekAda++;
            }
            uptMap[upt].personil += (Number(r.JUMLAH_PERSONIL) || 0);
        });

        const items = Object.values(uptMap).map(u => ({
            ...u,
            persenRealisasi: u.rencana > 0 ? Number(((u.realisasi / u.rencana) * 100).toFixed(1)) : 0,
            persenLaporan: u.realisasi > 0 ? Number(((u.laptekAda / u.realisasi) * 100).toFixed(1)) : 0
        }));

        // Sort descending by rencana
        items.sort((a, b) => b.rencana - a.rencana);
        return items;
    }

    /**
     * ULTG Analysis (SPEC Section 15)
     */
    getUltgAnalytics(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const ultgMap = {};

        dataset.forEach(r => {
            const ultg = r.ULTG || 'ULTG TIDAK DIKETAHUI';
            if (!ultgMap[ultg]) {
                ultgMap[ultg] = { ultg, upt: r.UPT, rencana: 0, realisasi: 0, jadwalUlang: 0, belumRealisasi: 0, personil: 0 };
            }
            ultgMap[ultg].rencana++;
            if (r.STATUS === 'TERLAKSANA') {
                ultgMap[ultg].realisasi++;
            } else if (r.STATUS === 'JADWAL ULANG') {
                ultgMap[ultg].jadwalUlang++;
            } else {
                ultgMap[ultg].belumRealisasi++;
            }
            ultgMap[ultg].personil += (Number(r.JUMLAH_PERSONIL) || 0);
        });

        const items = Object.values(ultgMap).map(u => ({
            ...u,
            persenRealisasi: u.rencana > 0 ? Number(((u.realisasi / u.rencana) * 100).toFixed(1)) : 0
        }));

        items.sort((a, b) => b.rencana - a.rencana);
        return items;
    }

    /**
     * Top Gardu Induk (GI) Locations (SPEC Section 16)
     */
    getTopLocations(filters = {}, limit = 10) {
        const dataset = this.getFilteredMaintenance(filters);
        const giMap = {};

        dataset.forEach(r => {
            const gi = r.LOKASI || 'GI TIDAK TERDEFINISI';
            if (!giMap[gi]) {
                giMap[gi] = { lokasi: gi, upt: r.UPT, ultg: r.ULTG, rencana: 0, realisasi: 0, jadwalUlang: 0 };
            }
            giMap[gi].rencana++;
            if (r.STATUS === 'TERLAKSANA') {
                giMap[gi].realisasi++;
            } else if (r.STATUS === 'JADWAL ULANG') {
                giMap[gi].jadwalUlang++;
            }
        });

        const list = Object.values(giMap).map(g => ({
            ...g,
            persenRealisasi: g.rencana > 0 ? Number(((g.realisasi / g.rencana) * 100).toFixed(1)) : 0
        }));

        list.sort((a, b) => b.rencana - a.rencana);
        return list.slice(0, limit);
    }

    /**
     * Realisasi Durasi Pemeliharaan setiap Lokasi Pemeliharaan (Gardu Induk)
     * Perhitungan durasi dari Realisasi Mulai Pekerjaan sampai dengan Selesai Pekerjaan
     * @param {Object} filters
     * @param {number} limit
     */
    getDurasiPemeliharaanPerLokasi(filters = {}, limit = 15) {
        const dataset = this.getFilteredMaintenance(filters);
        const lokasiMap = {};

        dataset.filter(r => r.STATUS === 'TERLAKSANA' && (Number(r.DURASI_MENIT) > 0)).forEach(r => {
            const lok = r.LOKASI || 'GI LAINNYA';
            if (!lokasiMap[lok]) {
                lokasiMap[lok] = {
                    lokasi: lok,
                    upt: r.UPT,
                    ultg: r.ULTG,
                    totalPekerjaan: 0,
                    totalMenit: 0,
                    minMenit: Infinity,
                    maxMenit: 0,
                    longestBay: '',
                    longestStart: '',
                    longestFinish: ''
                };
            }

            const dur = Number(r.DURASI_MENIT) || 0;
            lokasiMap[lok].totalPekerjaan++;
            lokasiMap[lok].totalMenit += dur;
            if (dur < lokasiMap[lok].minMenit) lokasiMap[lok].minMenit = dur;
            if (dur > lokasiMap[lok].maxMenit) {
                lokasiMap[lok].maxMenit = dur;
                lokasiMap[lok].longestBay = r.BAY;
                lokasiMap[lok].longestStart = r.REALISASI_MULAI;
                lokasiMap[lok].longestFinish = r.REALISASI_SELESAI;
            }
        });

        const results = Object.values(lokasiMap).map(l => {
            const avgMenit = l.totalPekerjaan > 0 ? Math.round(l.totalMenit / l.totalPekerjaan) : 0;
            const avgJam = Number((avgMenit / 60).toFixed(1));
            const totalJam = Number((l.totalMenit / 60).toFixed(1));
            const hours = Math.floor(avgMenit / 60);
            const mins = avgMenit % 60;
            const formatted = hours > 0 ? `${hours} Jam ${mins} Menit` : `${mins} Menit`;

            return {
                lokasi: l.lokasi,
                upt: l.upt,
                ultg: l.ultg,
                totalPekerjaan: l.totalPekerjaan,
                totalMenit: l.totalMenit,
                totalJam,
                avgMenit,
                avgJam,
                avgFormatted: formatted,
                minMenit: l.minMenit === Infinity ? 0 : l.minMenit,
                maxMenit: l.maxMenit,
                longestBay: l.longestBay,
                longestStart: l.longestStart,
                longestFinish: l.longestFinish
            };
        });

        // Sort descending by average duration
        results.sort((a, b) => b.avgMenit - a.avgMenit);
        return results.slice(0, limit);
    }

    /**
     * Reschedule reasons / Penyebab Jadwal Ulang analysis
     */
    getPenyebabJadwalUlang(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const causes = {};
        let controllable = 0;
        let uncontrollable = 0;

        dataset.filter(r => r.STATUS === 'JADWAL ULANG').forEach(r => {
            const cause = r.PENYEBAB_JADWAL_ULANG || 'Alasan Lainnya / Belum Diklasifikasikan';
            causes[cause] = (causes[cause] || 0) + 1;

            if (r.CONTROLLABLE && r.CONTROLLABLE.toUpperCase().includes('UNCON')) {
                uncontrollable++;
            } else if (r.CONTROLLABLE && r.CONTROLLABLE.toUpperCase().includes('CON')) {
                controllable++;
            } else {
                if (cause.toLowerCase().includes('sistem') || cause.toLowerCase().includes('p2b') || cause.toLowerCase().includes('emergency') || cause.toLowerCase().includes('cuaca')) {
                    uncontrollable++;
                } else {
                    controllable++;
                }
            }
        });

        const sortedCauses = Object.entries(causes)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalReschedule: dataset.filter(r => r.STATUS === 'JADWAL ULANG').length,
            controllable,
            uncontrollable,
            topReasons: sortedCauses
        };
    }

    /**
     * Ketersediaan Laporan (Laptek) analytics
     */
    getLaporanAnalytics(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const uptLaporan = {};

        dataset.forEach(r => {
            const upt = r.UPT || 'UPT';
            if (!uptLaporan[upt]) {
                uptLaporan[upt] = { upt, total: 0, terlaksana: 0, ada: 0, belumAda: 0 };
            }
            uptLaporan[upt].total++;
            if (r.STATUS === 'TERLAKSANA') {
                uptLaporan[upt].terlaksana++;
                if (r.KETERSEDIAAN_LAPORAN === 'ADA') {
                    uptLaporan[upt].ada++;
                } else {
                    uptLaporan[upt].belumAda++;
                }
            }
        });

        return Object.values(uptLaporan).map(u => ({
            ...u,
            persenAda: u.terlaksana > 0 ? Number(((u.ada / u.terlaksana) * 100).toFixed(1)) : 0
        }));
    }

    /**
     * Manpower / Personil distribution analytics
     */
    getPersonilAnalytics(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const bayMap = {};

        dataset.forEach(r => {
            const bayType = r.JENIS_BAY || 'BAY LAINNYA';
            if (!bayMap[bayType]) {
                bayMap[bayType] = { jenisBay: bayType, totalPersonil: 0, count: 0 };
            }
            bayMap[bayType].totalPersonil += (Number(r.JUMLAH_PERSONIL) || 0);
            bayMap[bayType].count++;
        });

        return Object.values(bayMap).map(b => ({
            ...b,
            avgPersonil: b.count > 0 ? Number((b.totalPersonil / b.count).toFixed(1)) : 0
        })).sort((a, b) => b.totalPersonil - a.totalPersonil);
    }

    /**
     * Automated Anomaly Detection & Early Warnings
     */
    detectAnomalies(filters = {}) {
        const dataset = this.getFilteredMaintenance(filters);
        const anomalies = [];

        // 1. Reschedule Rate Check
        const total = dataset.length;
        const reschedules = dataset.filter(r => r.STATUS === 'JADWAL ULANG');
        const rescheduleRate = total > 0 ? (reschedules.length / total) * 100 : 0;

        if (rescheduleRate > 20) {
            anomalies.push({
                severity: 'HIGH',
                type: 'RESCHEDULE_RATE_HIGH',
                title: 'Tingkat Jadwal Ulang Tinggi',
                description: `Tingkat reschedule pemeliharaan mencapai ${rescheduleRate.toFixed(1)}% (${reschedules.length} dari ${total} rencana). Faktor dominan sistem/izin padam.`,
                metric: `${rescheduleRate.toFixed(1)}%`
            });
        }

        // 2. Report Backlog Check
        const terlaksana = dataset.filter(r => r.STATUS === 'TERLAKSANA');
        const missingReports = terlaksana.filter(r => r.KETERSEDIAAN_LAPORAN !== 'ADA');
        const missingRate = terlaksana.length > 0 ? (missingReports.length / terlaksana.length) * 100 : 0;

        if (missingReports.length > 0) {
            anomalies.push({
                severity: missingRate > 30 ? 'HIGH' : 'MEDIUM',
                type: 'LAPTEK_BACKLOG',
                title: 'Tunggakan Ketersediaan Laporan Teknis',
                description: `Terdapat ${missingReports.length} pekerjaan selesai (${missingRate.toFixed(1)}%) yang belum memiliki kelengkapan LAPTEK.`,
                metric: `${missingReports.length} Berkas`
            });
        }

        // 3. UPT Performance Disparity
        const uptAnalytics = this.getUptAnalytics(filters);
        const lowestUpt = uptAnalytics.reduce((prev, curr) => (curr.persenRealisasi < prev.persenRealisasi ? curr : prev), uptAnalytics[0]);
        if (lowestUpt && lowestUpt.persenRealisasi < 75) {
            anomalies.push({
                severity: 'MEDIUM',
                type: 'UPT_PERFORMANCE_LAG',
                title: `Keterlambatan Realisasi pada ${lowestUpt.upt}`,
                description: `Realisasi di ${lowestUpt.upt} baru mencapai ${lowestUpt.persenRealisasi}% (${lowestUpt.realisasi}/${lowestUpt.rencana}), terendah dibanding unit lain.`,
                metric: `${lowestUpt.persenRealisasi}%`
            });
        }

        // 4. Critical Equipment Delays (Trafo 500kV / 150kV)
        const criticalReschedules = reschedules.filter(r => 
            (r.BAY && (r.BAY.includes('TRF') || r.BAY.includes('IBT') || r.TEGANGAN === '500 kV'))
        );
        if (criticalReschedules.length > 0) {
            anomalies.push({
                severity: 'CRITICAL',
                type: 'CRITICAL_ASSET_DELAY',
                title: 'Penundaan Pemeliharaan Aset Kritis',
                description: `Terdeteksi ${criticalReschedules.length} peralatan vital (IBT / Trafo / Bay 500kV) mengalami penundaan jadwal pemeliharaan.`,
                metric: `${criticalReschedules.length} Bay Kritis`
            });
        }

        // 5. Excessive Duration Check (Lokasi dengan Durasi > 11 Jam)
        const durasiPerLokasi = this.getDurasiPemeliharaanPerLokasi(filters, 10);
        const longLocations = durasiPerLokasi.filter(l => l.avgJam >= 11);
        if (longLocations.length > 0) {
            anomalies.push({
                severity: 'HIGH',
                type: 'EXCESSIVE_DURATION',
                title: 'Durasi Pekerjaan Melebihi Standar Normal (>11 Jam)',
                description: `Terdeteksi lokasi gardu induk (${longLocations.map(x => x.lokasi).slice(0, 2).join(', ')}) dengan rata-rata durasi pemeliharaan mencapai ${longLocations[0].avgJam} Jam, berpotensi memperpanjang durasi padam subsistem.`,
                metric: `${longLocations.length} GI Extended`
            });
        }

        return anomalies;
    }

    /**
     * Get distinct values for all dynamic dropdown filters
     */
    getDistinctFilterOptions() {
        const upts = new Set();
        const ultgs = new Set();
        const lokasis = new Set();
        const bays = new Set();
        const jenisBays = new Set();
        const tegangans = new Set();
        const statuses = new Set();
        const penanggungJawabs = new Set();
        const pelaksanas = new Set();
        const periodes = new Set();

        this.records.forEach(r => {
            if (r.UPT) upts.add(r.UPT);
            if (r.ULTG) ultgs.add(r.ULTG);
            if (r.LOKASI) lokasis.add(r.LOKASI);
            if (r.BAY) bays.add(r.BAY);
            if (r.JENIS_BAY) jenisBays.add(r.JENIS_BAY);
            if (r.TEGANGAN) tegangans.add(r.TEGANGAN);
            if (r.STATUS) statuses.add(r.STATUS);
            if (r.PENANGGUNG_JAWAB) penanggungJawabs.add(r.PENANGGUNG_JAWAB);
            if (r.PELAKSANA) pelaksanas.add(r.PELAKSANA);
            if (r.RENCANA) {
                const m = r.RENCANA.substring(0, 3).toUpperCase();
                if (['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOP', 'DES'].some(x => m.includes(x))) {
                    periodes.add(m);
                }
            }
        });

        return {
            upts: Array.from(upts).sort(),
            ultgs: Array.from(ultgs).sort(),
            lokasis: Array.from(lokasis).sort(),
            bays: Array.from(bays).sort(),
            jenisBays: Array.from(jenisBays).sort(),
            tegangans: Array.from(tegangans).sort(),
            statuses: Array.from(statuses).sort(),
            penanggungJawabs: Array.from(penanggungJawabs).sort(),
            pelaksanas: Array.from(pelaksanas).sort(),
            periodes: ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOP', 'DES']
        };
    }
}

// Export as global or module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaintenanceDataService;
} else {
    window.MaintenanceDataService = MaintenanceDataService;
}
