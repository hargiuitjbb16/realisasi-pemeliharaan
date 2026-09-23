/**
 * app.js
 * Main Controller for PLN UIT JBB Maintenance Dashboard
 * Coordinates MaintenanceDataService, AiService, DashboardCharts, and UI State.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Instantiate Core Services
    const dataService = new MaintenanceDataService();
    const nonRoutineDataService = new NonRoutineDataService();
    const aiService = new AiService();
    const charts = new DashboardCharts();

    // 2. Application State
    const state = {
        filters: {
            periode: 'ALL',
            upt: 'ALL',
            ultg: 'ALL',
            lokasi: 'ALL',
            bay: 'ALL',
            jenisBay: 'ALL',
            tegangan: 'ALL',
            status: 'ALL',
            penanggungJawab: 'ALL',
            pelaksana: 'ALL',
            ketersediaanLaporan: 'ALL',
            search: ''
        },
        activeTab: 'realisasi', // Default to prioritized tab (SPEC Section 5)
        table: {
            page: 1,
            pageSize: 15,
            sortCol: 'id',
            sortAsc: true
        },
        activeKpiFilter: null,
        chatHistory: [],
        nonRoutineFilters: {
            tahun: 'ALL', bulan: 'ALL', upt: 'ALL', ultg: 'ALL', lokasi: 'ALL', padam: 'ALL', sifat: 'ALL', search: ''
        },
        nonRoutineTable: { page: 1, pageSize: 12, sortCol: 'TANGGAL_SORT', sortAsc: false }
    };

    // Initialize Data
    await dataService.init();
    await nonRoutineDataService.init();
    populateFilterDropdowns();
    populateNonRoutineFilterDropdowns();
    setupEventListeners();
    updateDashboard();
    updateNonRoutineDashboard();
    renderNonRoutineSourceMeta();
    window.setInterval(refreshDashboardData, 6 * 60 * 60 * 1000);

    // Generate initial AI Briefing in background
    setTimeout(() => {
        refreshAiBriefing();
    }, 600);

    /**
     * Populate filter dropdowns with unique options from dataset
     */
    function populateFilterDropdowns() {
        const opts = dataService.getDistinctFilterOptions();

        fillSelect('filter-periode', opts.periodes, 'Semua Bulan');
        fillSelect('filter-upt', opts.upts, 'Semua UPT');
        fillSelect('filter-ultg', opts.ultgs, 'Semua ULTG');
        fillSelect('filter-lokasi', opts.lokasis, 'Semua Gardu Induk');
        fillSelect('filter-bay', opts.bays, 'Semua Bay');
        fillSelect('filter-jenis-bay', opts.jenisBays, 'Semua Jenis Bay');
        fillSelect('filter-tegangan', opts.tegangans, 'Semua Tegangan');
        fillSelect('filter-status', opts.statuses, 'Semua Status');
        fillSelect('filter-penanggung-jawab', opts.penanggungJawabs, 'Semua Penanggung Jawab');
        fillSelect('filter-pelaksana', opts.pelaksanas, 'Semua Pelaksana');
    }

    function fillSelect(selectId, items, defaultLabel) {
        const el = document.getElementById(selectId);
        if (!el) return;
        const curVal = el.value;
        el.innerHTML = `<option value="ALL">${defaultLabel}</option>`;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            el.appendChild(opt);
        });
        if (curVal && items.includes(curVal)) {
            el.value = curVal;
        }
    }

    /**
     * Update dynamic ULTG options when UPT changes
     */
    function updateUltgOptions() {
        const selectedUpt = state.filters.upt;
        const allRecs = dataService.getMaintenanceData();
        const ultgs = new Set();
        allRecs.forEach(r => {
            if (selectedUpt === 'ALL' || r.UPT === selectedUpt) {
                if (r.ULTG) ultgs.add(r.ULTG);
            }
        });
        fillSelect('filter-ultg', Array.from(ultgs).sort(), 'Semua ULTG');
    }

    /**
     * Main Dashboard Update Pipeline
     */
    function updateDashboard() {
        // 1. Get filtered summary
        const summary = dataService.getMaintenanceSummary(state.filters);
        const filteredData = dataService.getFilteredMaintenance(state.filters);

        // 2. Render 8 KPI Cards
        renderKpiCards(summary);

        // 3. Render Active Filter Chips
        renderActiveFilterChips();

        // 4. Render Visual Analytics & Charts
        renderAnalytics(filteredData);

        // 5. Render Anomaly & Alert Badges
        renderAnomalies();

        // 6. Render Detailed Data Table
        renderTable(filteredData);
    }

    async function refreshDashboardData() {
        const refreshButton = document.getElementById('btn-refresh-data');
        if (refreshButton) refreshButton.textContent = 'Memperbarui...';

        try {
            await dataService.refresh();
            populateFilterDropdowns();
            updateUltgOptions();
            updateDashboard();

            const timestamp = document.getElementById('header-timestamp');
            if (timestamp) {
                timestamp.textContent = new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    timeZone: 'Asia/Jakarta'
                }).format(new Date()) + ' WIB';
            }
        } catch (error) {
            console.warn('Automatic data refresh failed:', error);
        } finally {
            if (refreshButton) refreshButton.textContent = '🔄 Refresh Data';
        }
    }

    async function refreshNonRoutineData() {
        const button = document.getElementById('btn-refresh-non-rutin');
        if (button) { button.disabled = true; button.textContent = 'Memuat...'; }
        try {
            await nonRoutineDataService.refresh();
            populateNonRoutineFilterDropdowns();
            updateNonRoutineDashboard();
            renderNonRoutineSourceMeta();
        } catch (error) {
            console.warn('Non-routine snapshot refresh failed; keeping previous data:', error);
            const meta = document.getElementById('non-routine-source-meta');
            if (meta) meta.textContent = `Refresh gagal • ${nonRoutineDataService.getData().length} baris tersimpan`;
        } finally {
            if (button) { button.disabled = false; button.textContent = '🔄 Refresh Snapshot'; }
        }
    }

    function updateNonRoutineDashboard() {
        const filtered = nonRoutineDataService.getFilteredData(state.nonRoutineFilters);
        renderNonRoutineKpis(nonRoutineDataService.getSummary(state.nonRoutineFilters));
        const trend = nonRoutineDataService.getTrend(state.nonRoutineFilters);
        const distribution = nonRoutineDataService.getDistribution(state.nonRoutineFilters);
        charts.renderNonRoutineTrendChart('chart-non-routine-trend', trend);
        charts.renderNonRoutineUptChart('chart-non-routine-upt', distribution.byUpt);
        renderNonRoutineTable(filtered);
    }

    function renderNonRoutineKpis(summary) {
        setKpiValue('non-kpi-total', summary.total.toLocaleString());
        setKpiValue('non-kpi-padam', summary.padam.toLocaleString());
        setKpiValue('non-kpi-tanpa-padam', summary.tanpaPadam.toLocaleString());
        setKpiValue('non-kpi-complete', summary.completeTiming.toLocaleString());
        setKpiValue('non-kpi-issues', summary.dataIssues.toLocaleString());
        const duration = document.getElementById('non-kpi-duration');
        if (duration) duration.textContent = `Rata-rata durasi ${summary.avgDurasiFormatted}`;
        const refs = document.getElementById('non-kpi-ref');
        if (refs) refs.textContent = `Termasuk ${summary.refErrors} error referensi`;
    }

    function renderNonRoutineTable(dataset) {
        const tbody = document.getElementById('non-routine-table-body');
        if (!tbody) return;
        const sorted = [...dataset].sort((a, b) => {
            const va = a[state.nonRoutineTable.sortCol] ?? '';
            const vb = b[state.nonRoutineTable.sortCol] ?? '';
            const result = typeof va === 'number' && typeof vb === 'number'
                ? va - vb
                : String(va).localeCompare(String(vb), 'id-ID', { numeric: true });
            return state.nonRoutineTable.sortAsc ? result : -result;
        });
        const totalPages = Math.max(1, Math.ceil(sorted.length / state.nonRoutineTable.pageSize));
        if (state.nonRoutineTable.page > totalPages) state.nonRoutineTable.page = totalPages;
        const start = (state.nonRoutineTable.page - 1) * state.nonRoutineTable.pageSize;
        const pageItems = sorted.slice(start, start + state.nonRoutineTable.pageSize);
        const countInfo = document.getElementById('non-routine-count-info');
        if (countInfo) countInfo.innerHTML = `Menampilkan <strong>${sorted.length ? start + 1 : 0}-${Math.min(start + state.nonRoutineTable.pageSize, sorted.length)}</strong> dari <strong>${sorted.length}</strong> kejadian`;
        const pageInfo = document.getElementById('non-routine-page-indicator');
        if (pageInfo) pageInfo.textContent = `Halaman ${state.nonRoutineTable.page} / ${totalPages}`;
        const prev = document.getElementById('btn-non-prev-page');
        const next = document.getElementById('btn-non-next-page');
        if (prev) prev.disabled = state.nonRoutineTable.page <= 1;
        if (next) next.disabled = state.nonRoutineTable.page >= totalPages;

        tbody.innerHTML = '';
        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="non-routine-empty">Tidak ada kejadian yang sesuai filter.</td></tr>';
            return;
        }
        pageItems.forEach(record => {
            const tr = document.createElement('tr');
            tr.tabIndex = 0;
            tr.setAttribute('data-id', record.id);
            const quality = record.DATA_QUALITY || [];
            const qualityClass = quality.length ? 'warning' : 'normal';
            tr.innerHTML = `
                <td><strong class="non-routine-id">${escapeHtml(record.NO || record.id)}</strong><br><small>${escapeHtml(record.id)}</small></td>
                <td><strong>${escapeHtml(record.UPT || '-')}</strong><br><small>${escapeHtml(record.ULTG || '-')}</small></td>
                <td><strong>${escapeHtml(record.LOKASI || '-')}</strong><br><small>${escapeHtml(record.NAMA_BAY || '-')}</small></td>
                <td><span class="non-routine-description-cell">${escapeHtml(record.URAIAN_PEKERJAAN || '-')}</span><br><small>${escapeHtml(record.PERALATAN || record.PERALATAN_PADAM || '-')}</small></td>
                <td><span class="non-routine-badge ${record.IS_TANPA_PADAM ? 'no-outage' : 'outage'}">${escapeHtml(record.KATEGORI_PADAM || '-')}</span></td>
                <td>${escapeHtml(record.SIFAT || '-')}<br><small>${escapeHtml(record.PN_JAWAB || '-')}</small></td>
                <td>${escapeHtml(record.TANGGAL_LABEL || '-')}<br><small>${escapeHtml(record.AWAL_JAM || '-')} → ${escapeHtml(record.AKHIR_JAM || '-')}</small></td>
                <td><span class="badge-durasi ${record.DURASI_MENIT > 0 ? 'normal' : 'empty'}">${escapeHtml(record.DURASI_FORMATTED)}</span></td>
                <td><span class="non-routine-quality ${qualityClass}">${quality.length ? `⚠️ ${quality.length} isu` : '✓ Lengkap'}</span></td>`;
            const open = () => openNonRoutineDetail(record);
            tr.addEventListener('click', open);
            tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
            tbody.appendChild(tr);
        });
    }

    function openNonRoutineDetail(record) {
        const modal = document.getElementById('non-routine-detail-modal');
        if (!modal) return;
        const values = {
            'non-modal-id': record.id,
            'non-modal-unit': `${record.UPT || '-'} / ${record.ULTG || '-'}`,
            'non-modal-lokasi': `${record.LOKASI || '-'} / ${record.NAMA_BAY || '-'}`,
            'non-modal-uraian': record.URAIAN_PEKERJAAN || '-',
            'non-modal-padam': `${record.PERALATAN_PADAM || '-'} (${record.PADAM || '-'})`,
            'non-modal-sifat': `${record.SIFAT || '-'} / ${record.PN_JAWAB || '-'}`,
            'non-modal-waktu': `${record.TANGGAL_LABEL || '-'} | ${record.AWAL_JAM || '-'} s.d. ${record.AKHIR_JAM || '-'}`,
            'non-modal-durasi': record.DURASI_MENIT > 0 ? `${record.DURASI_FORMATTED} (${record.DURASI_MENIT} menit)` : '-',
            'non-modal-quality': record.DATA_QUALITY.length ? record.DATA_QUALITY.join(', ') : 'Tidak ada isu terdeteksi'
        };
        Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
        modal.classList.add('open');
    }

    function escapeHtml(value) {
        return String(value ?? '-').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function exportNonRoutineCsv(records) {
        if (!records.length) { alert('Tidak ada data non-rutin yang dapat diekspor.'); return; }
        const headers = ['ID', 'No.', 'UPT', 'ULTG', 'Lokasi', 'Nama Bay', 'Uraian Pekerjaan', 'Peralatan Padam', 'Padam', 'Sifat', 'PN Jawab', 'Tanggal', 'Awal Jam', 'Akhir Jam', 'Durasi Menit', 'Durasi', 'Data Quality'];
        const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = records.map(r => [r.id, r.NO, r.UPT, r.ULTG, r.LOKASI, r.NAMA_BAY, r.URAIAN_PEKERJAAN, r.PERALATAN_PADAM, r.PADAM, r.SIFAT, r.PN_JAWAB, r.TANGGAL_LABEL, r.AWAL_JAM, r.AKHIR_JAM, r.DURASI_MENIT, r.DURASI_FORMATTED, (r.DATA_QUALITY || []).join('; ')].map(quote).join(','));
        const blob = new Blob(['﻿' + headers.map(quote).join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `PLN_UIT_JBB_Realisasi_Non_Rutin_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    }

    /**
     * Render 8 KPI Cards (SPEC Section 12)
     */
    function renderKpiCards(s) {
        setKpiValue('kpi-rencana', s.totalRencana.toLocaleString());
        setKpiValue('kpi-realisasi', s.totalRealisasi.toLocaleString());
        setKpiValue('kpi-pct', s.persenRealisasi + '%');
        setKpiValue('kpi-belum', s.belumRealisasi.toLocaleString());
        setKpiValue('kpi-jadwal-ulang', s.jadwalUlang.toLocaleString());
        setKpiValue('kpi-laptek-ada', s.laporanTersedia.toLocaleString());
        setKpiValue('kpi-laptek-belum', s.laporanBelumTersedia.toLocaleString());
        setKpiValue('kpi-personil', s.totalPersonil.toLocaleString());

        const subPersonil = document.getElementById('kpi-personil-sub');
        if (subPersonil) subPersonil.textContent = `Avg: ${s.avgPersonil} org/bay`;

        const subLaptek = document.getElementById('kpi-laptek-sub');
        if (subLaptek) subLaptek.textContent = `${s.persenLaporan}% Terverifikasi`;

        const subPct = document.getElementById('kpi-pct-sub');
        if (subPct) subPct.textContent = `${s.totalRealisasi} dari ${s.totalRencana}`;
    }

    function setKpiValue(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    /**
     * Render Active Filter Chips
     */
    function renderActiveFilterChips() {
        const wrap = document.getElementById('active-filter-chips');
        if (!wrap) return;

        wrap.innerHTML = '';
        const activeKeys = Object.entries(state.filters).filter(([k, v]) => v !== 'ALL' && v !== '' && k !== 'search');

        if (activeKeys.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        wrap.style.display = 'flex';
        wrap.innerHTML = '<span class="chip-label">Filter Aktif:</span>';

        activeKeys.forEach(([key, val]) => {
            const chip = document.createElement('span');
            chip.className = 'chip-tag';
            chip.innerHTML = `${formatFilterKey(key)}: <strong>${val}</strong> <span class="remove-chip" data-key="${key}">×</span>`;
            wrap.appendChild(chip);
        });

        // Add remove click listener
        wrap.querySelectorAll('.remove-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const k = e.currentTarget.getAttribute('data-key');
                state.filters[k] = 'ALL';
                const el = document.getElementById(`filter-${formatInputId(k)}`);
                if (el) el.value = 'ALL';
                if (k === 'upt') updateUltgOptions();
                updateDashboard();
            });
        });
    }

    function formatFilterKey(key) {
        const dict = {
            periode: 'Periode',
            upt: 'UPT',
            ultg: 'ULTG',
            lokasi: 'Gardu Induk',
            jenisBay: 'Jenis Bay',
            tegangan: 'Tegangan',
            status: 'Status',
            penanggungJawab: 'PJ',
            pelaksana: 'Pelaksana',
            ketersediaanLaporan: 'Laporan'
        };
        return dict[key] || key;
    }

    function formatInputId(key) {
        return key.replace(/([A-Z])/g, "-$1").toLowerCase();
    }

    /**
     * Render Visual Analytics across Tabs
     */
    function renderAnalytics() {
        // Chart 1: Rencana vs Realisasi Bulan
        const trend = dataService.getMonthlyTrend(state.filters);
        charts.renderMonthlyTrendChart('chart-monthly-trend', trend);

        // Chart 2: Realisasi Berdasarkan UPT (Horizontal Bar with Click Filter)
        const uptAnalytics = dataService.getUptAnalytics(state.filters);
        charts.renderUptChart('chart-upt-analytics', uptAnalytics, (clickedUpt) => {
            state.filters.upt = clickedUpt;
            const uptSelect = document.getElementById('filter-upt');
            if (uptSelect) uptSelect.value = clickedUpt;
            updateUltgOptions();
            updateDashboard();
        });

        // Chart 3: Realisasi Berdasarkan ULTG
        const ultgAnalytics = dataService.getUltgAnalytics(state.filters);
        charts.renderUltgChart('chart-ultg-analytics', ultgAnalytics);

        // Chart 4: Top Gardu Induk
        const topGi = dataService.getTopLocations(state.filters, 10);
        charts.renderTopLocationsChart('chart-top-gi', topGi);

        // Chart: Realisasi Durasi Pemeliharaan per Lokasi (GI)
        const durasiData = dataService.getDurasiPemeliharaanPerLokasi(state.filters, 12);
        charts.renderDurasiPerLokasiChart('chart-durasi-lokasi', durasiData);
        renderDurasiInsightsSummary(durasiData);

        // Chart 5: Jadwal Ulang Reasons
        const rescheduleStats = dataService.getPenyebabJadwalUlang(state.filters);
        charts.renderPenyebabJadwalUlangChart('chart-reschedule-causes', rescheduleStats);

        // Chart 6: Ketersediaan Laporan (Laptek)
        const laporanAnalytics = dataService.getLaporanAnalytics(state.filters);
        charts.renderLaporanChart('chart-laporan-compliance', laporanAnalytics);

        // Chart 7: Personil Analysis
        const personilAnalytics = dataService.getPersonilAnalytics(state.filters);
        charts.renderPersonilChart('chart-personil-bay', personilAnalytics);
    }

    /**
     * Render Durasi Insights Summary Card
     */
    function renderDurasiInsightsSummary(durasiList) {
        const container = document.getElementById('durasi-insights-summary');
        if (!container) return;

        if (!durasiList || durasiList.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 12px;">Belum ada data durasi realisasi pemeliharaan pada filter saat ini.</p>`;
            return;
        }

        const topSlow = durasiList[0];
        const topFast = durasiList[durasiList.length - 1];
        
        let totalMenitAll = 0;
        let totalPekerjaanAll = 0;
        durasiList.forEach(d => {
            totalMenitAll += d.totalMenit;
            totalPekerjaanAll += d.totalPekerjaan;
        });
        const overallAvgJam = totalPekerjaanAll > 0 ? ((totalMenitAll / totalPekerjaanAll) / 60).toFixed(1) : 0;

        container.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 14px;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Rata-rata Durasi Pemeliharaan Global</div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                    <span style="font-size: 22px; font-weight: 800; color: var(--pln-cyan); font-family: var(--font-heading);">${overallAvgJam} Jam</span>
                    <span style="font-size: 11px; color: var(--text-secondary);">per pekerjaan terlaksana</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 9px 12px;">
                    <div style="font-size: 10px; font-weight: 700; color: #FCA5A5; text-transform: uppercase;">Durasi Terpanjang (Avg)</div>
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 12px; margin-top: 2px;">${topSlow.lokasi.replace('GIS 150KV ', '').replace('GI 150KV ', '').replace('GITET 500KV ', '')}</div>
                    <div style="font-size: 11px; color: #F87171; font-weight: 700;">⏱️ ${topSlow.avgJam} Jam (${topSlow.avgFormatted})</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${topSlow.totalPekerjaan} bay &bull; ${topSlow.upt}</div>
                </div>

                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); padding: 9px 12px;">
                    <div style="font-size: 10px; font-weight: 700; color: #6EE7B7; text-transform: uppercase;">Paling Efisien (Avg)</div>
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 12px; margin-top: 2px;">${topFast.lokasi.replace('GIS 150KV ', '').replace('GI 150KV ', '').replace('GITET 500KV ', '')}</div>
                    <div style="font-size: 11px; color: #34D399; font-weight: 700;">⚡ ${topFast.avgJam} Jam (${topFast.avgFormatted})</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${topFast.totalPekerjaan} bay &bull; ${topFast.upt}</div>
                </div>
            </div>

            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.45; background: rgba(0, 163, 224, 0.06); padding: 8px 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--pln-cyan);">
                💡 <strong>Catatan Durasi:</strong> Dihitung otomatis dari <em>Realisasi Mulai Pekerjaan</em> hingga <em>Selesai Pekerjaan</em>. Waktu normal shift pemeliharaan berada pada rentang 6-8 jam.
            </div>
        `;
    }

    /**
     * Render Anomalies & Early Warning Signals
     */
    function renderAnomalies() {
        const anomalies = dataService.detectAnomalies(state.filters);
        const container = document.getElementById('anomaly-cards-container');
        const alertBadge = document.getElementById('header-alert-count');
        
        if (alertBadge) {
            alertBadge.textContent = anomalies.length;
            alertBadge.style.display = anomalies.length > 0 ? 'inline-block' : 'none';
        }

        if (!container) return;
        container.innerHTML = '';

        if (anomalies.length === 0) {
            container.innerHTML = `
                <div class="anomaly-card sev-MEDIUM" style="grid-column: 1 / -1; border-left-color: var(--pln-emerald); background: rgba(16, 185, 129, 0.08);">
                    <div class="anomaly-header">
                        <span class="anomaly-title" style="color: var(--pln-emerald)">✅ Seluruh Metrik Dalam Ambang Batas Normal</span>
                        <span class="anomaly-metric" style="background: rgba(16, 185, 129, 0.2); color: #A7F3D0;">NORMAL</span>
                    </div>
                    <p class="anomaly-desc">Tidak ditemukan deviasi kritis atau anomali penjadwalan pemeliharaan pada kriteria filter saat ini.</p>
                </div>
            `;
            return;
        }

        anomalies.forEach(a => {
            const card = document.createElement('div');
            card.className = `anomaly-card sev-${a.severity}`;
            card.innerHTML = `
                <div class="anomaly-header">
                    <span class="anomaly-title">${a.title}</span>
                    <span class="anomaly-metric">${a.metric}</span>
                </div>
                <p class="anomaly-desc">${a.description}</p>
            `;
            container.appendChild(card);
        });
    }

    /**
     * Refresh AI Strategic Briefing using AiService
     */
    async function refreshAiBriefing() {
        const contentBox = document.getElementById('ai-briefing-content');
        const btn = document.getElementById('btn-refresh-ai');
        if (!contentBox) return;

        if (btn) btn.disabled = true;
        contentBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: var(--pln-cyan); padding: 20px 0;">
                <div class="pulse-dot" style="background: var(--pln-cyan); width: 12px; height: 12px;"></div>
                <span>Menganalisis dataset PLN UIT JBB dengan mesin insight lokal...</span>
            </div>
        `;

        const summary = dataService.getMaintenanceSummary(state.filters);
        const uptAnalytics = dataService.getUptAnalytics(state.filters);
        const anomalies = dataService.detectAnomalies(state.filters);
        const rescheduleStats = dataService.getPenyebabJadwalUlang(state.filters);

        const filterSummaryStr = Object.entries(state.filters)
            .filter(([k, v]) => v !== 'ALL' && v !== '' && k !== 'search')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');

        try {
            const markdown = await aiService.generateExecutiveSummary(
                summary,
                uptAnalytics,
                anomalies,
                rescheduleStats,
                filterSummaryStr
            );
            contentBox.innerHTML = renderMarkdown(markdown);
        } catch (e) {
            console.error(e);
            contentBox.innerHTML = `<p style="color: var(--pln-crimson)">Gagal memuat AI Briefing: ${e.message}</p>`;
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Simple Markdown Parser for AI Output
     */
    function renderMarkdown(md) {
        if (!md) return '';
        return md
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\n\n/gim, '<p></p>')
            .replace(/\n/gim, '<br>');
    }

    /**
     * Render Detailed Data Table
     */
    function renderTable(dataset) {
        const tbody = document.getElementById('table-body');
        const countInfo = document.getElementById('table-count-info');
        if (!tbody) return;

        // Sorting
        const sorted = [...dataset].sort((a, b) => {
            const vA = a[state.table.sortCol] ?? '';
            const vB = b[state.table.sortCol] ?? '';
            if (typeof vA === 'number' && typeof vB === 'number') {
                return state.table.sortAsc ? vA - vB : vB - vA;
            }
            return state.table.sortAsc 
                ? String(vA).localeCompare(String(vB)) 
                : String(vB).localeCompare(String(vA));
        });

        // Pagination
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / state.table.pageSize));
        if (state.table.page > totalPages) state.table.page = totalPages;

        const startIdx = (state.table.page - 1) * state.table.pageSize;
        const pageItems = sorted.slice(startIdx, startIdx + state.table.pageSize);

        if (countInfo) {
            countInfo.innerHTML = `Menampilkan <strong>${total > 0 ? startIdx + 1 : 0}-${Math.min(startIdx + state.table.pageSize, total)}</strong> dari <strong>${total.toLocaleString()}</strong> pekerjaan`;
        }

        // Render Rows
        tbody.innerHTML = '';
        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted)">Tidak ada data pekerjaan yang sesuai dengan kriteria filter.</td></tr>`;
            return;
        }

        pageItems.forEach(r => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', r.id);
            const statusClass = r.STATUS === 'TERLAKSANA' ? 'TERLAKSANA' : (r.STATUS === 'JADWAL ULANG' ? 'JADWAL_ULANG' : 'BELUM_REALISASI');
            const laptekClass = r.KETERSEDIAAN_LAPORAN === 'ADA' ? 'ADA' : 'BELUM_ADA';

            let durasiHtml = '<span class="badge-durasi empty">-</span>';
            if (r.STATUS === 'TERLAKSANA' && Number(r.DURASI_MENIT) > 0) {
                const durJam = Number(r.DURASI_JAM) || (r.DURASI_MENIT / 60);
                const dClass = durJam <= 8 ? 'normal' : (durJam <= 11 ? 'warning' : 'critical');
                durasiHtml = `<span class="badge-durasi ${dClass}" title="Realisasi Mulai: ${r.REALISASI_MULAI || '-'} &#10;Realisasi Selesai: ${r.REALISASI_SELESAI || '-'}">⏱️ ${r.DURASI_FORMATTED}</span>`;
            }

            tr.innerHTML = `
                <td><strong style="color: var(--pln-cyan)">${r.id}</strong></td>
                <td><span style="font-weight: 600;">${r.UPT.replace('UPT ', '')}</span><br><small style="color: var(--text-muted)">${r.ULTG}</small></td>
                <td><strong>${r.LOKASI}</strong></td>
                <td>${r.BAY}<br><small style="color: var(--text-muted)">${r.JENIS_BAY} (${r.TEGANGAN})</small></td>
                <td>${r.RENCANA || '-'}</td>
                <td>${r.REALISASI || '-'}</td>
                <td>${durasiHtml}</td>
                <td><span class="badge-status ${statusClass}">${r.STATUS}</span></td>
                <td><span class="badge-laptek ${laptekClass}">${r.KETERSEDIAAN_LAPORAN}</span></td>
                <td style="text-align: right;"><strong>${r.JUMLAH_PERSONIL}</strong> org</td>
            `;

            tr.addEventListener('click', () => {
                openDetailModal(r);
            });

            tbody.appendChild(tr);
        });

        // Update pagination controls
        const pageInfo = document.getElementById('page-indicator');
        if (pageInfo) pageInfo.textContent = `Halaman ${state.table.page} / ${totalPages}`;

        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        if (btnPrev) btnPrev.disabled = state.table.page <= 1;
        if (btnNext) btnNext.disabled = state.table.page >= totalPages;
    }

    /**
     * Open Detail Modal (16 Columns of SPEC.MD + Realisasi Durasi)
     */
    function openDetailModal(record) {
        const modal = document.getElementById('detail-modal');
        if (!modal) return;

        document.getElementById('modal-id').textContent = record.id;
        document.getElementById('modal-upt').textContent = record.UPT;
        document.getElementById('modal-ultg').textContent = record.ULTG;
        document.getElementById('modal-lokasi').textContent = record.LOKASI;
        document.getElementById('modal-bay').textContent = record.BAY;
        document.getElementById('modal-jenis-bay').textContent = record.JENIS_BAY;
        document.getElementById('modal-tegangan').textContent = record.TEGANGAN;
        document.getElementById('modal-uraian').textContent = record.URAIAN_PEKERJAAN;
        document.getElementById('modal-pj').textContent = record.PENANGGUNG_JAWAB;
        document.getElementById('modal-pelaksana').textContent = record.PELAKSANA;
        document.getElementById('modal-rencana').textContent = record.RENCANA || '-';
        document.getElementById('modal-status').textContent = record.STATUS;
        document.getElementById('modal-penyebab').textContent = record.PENYEBAB_JADWAL_ULANG || '-';
        document.getElementById('modal-keterangan').textContent = record.KETERANGAN || '-';
        document.getElementById('modal-realisasi').textContent = record.REALISASI || '-';
        
        const waktuKerjaEl = document.getElementById('modal-waktu-kerja');
        if (waktuKerjaEl) {
            waktuKerjaEl.textContent = (record.REALISASI_MULAI && record.REALISASI_SELESAI) 
                ? `${record.REALISASI_MULAI} s.d. ${record.REALISASI_SELESAI}` 
                : (record.REALISASI_MULAI ? `Mulai: ${record.REALISASI_MULAI}` : '-');
        }

        const durasiEl = document.getElementById('modal-durasi');
        if (durasiEl) {
            durasiEl.textContent = record.DURASI_MENIT > 0
                ? `${record.DURASI_FORMATTED} (${record.DURASI_MENIT} Menit / ${record.DURASI_JAM} Jam)`
                : '-';
        }

        document.getElementById('modal-laporan').textContent = record.KETERSEDIAAN_LAPORAN;
        document.getElementById('modal-personil').textContent = `${record.JUMLAH_PERSONIL} Personil`;

        modal.classList.add('open');
    }

    /**
     * Non-routine dashboard controller.  This is deliberately kept alongside the
     * routine controller so both tabs share the same render/update lifecycle,
     * while their data access remains isolated in their respective services.
     */
    function populateNonRoutineFilterDropdowns() {
        const opts = nonRoutineDataService.getDistinctFilterOptions();
        fillSelect('non-filter-tahun', opts.years, 'Semua Tahun');
        fillSelect('non-filter-bulan', opts.months, 'Semua Bulan');
        fillSelect('non-filter-upt', opts.upts, 'Semua UPT');
        fillSelect('non-filter-ultg', opts.ultgs, 'Semua ULTG');
        fillSelect('non-filter-lokasi', opts.lokasis, 'Semua Lokasi');
        fillSelect('non-filter-padam', opts.padams, 'Semua Kategori');
        fillSelect('non-filter-sifat', opts.sifats, 'Semua Sifat');
    }

    function renderNonRoutineSourceMeta() {
        const meta = nonRoutineDataService.getMetadata();
        const info = document.getElementById('non-routine-source-meta');
        const source = document.getElementById('btn-non-routine-source');
        if (info) {
            const snapshot = meta.snapshotAt ? `Snapshot: ${meta.snapshotAt}` : 'Snapshot lokal siap digunakan';
            info.textContent = `${meta.worksheet} • ${snapshot}`;
        }
        if (source) source.href = meta.sourceUrl || '#';
    }

    function updateNonRoutineDashboard() {
        const summary = nonRoutineDataService.getSummary(state.nonRoutineFilters);
        const records = nonRoutineDataService.getFilteredData(state.nonRoutineFilters);
        setKpiValue('non-kpi-total', summary.total.toLocaleString());
        setKpiValue('non-kpi-padam', summary.padam.toLocaleString());
        setKpiValue('non-kpi-tanpa-padam', summary.tanpaPadam.toLocaleString());
        setKpiValue('non-kpi-complete', summary.completeTiming.toLocaleString());
        setKpiValue('non-kpi-issues', summary.dataIssues.toLocaleString());
        const duration = document.getElementById('non-kpi-duration');
        if (duration) duration.textContent = `Rata-rata ${summary.avgDurasiFormatted}`;
        const reference = document.getElementById('non-kpi-ref');
        if (reference) reference.textContent = `Termasuk ${summary.refErrors} error referensi`;

        charts.renderNonRoutineTrendChart('chart-non-routine-trend', nonRoutineDataService.getTrend(state.nonRoutineFilters));
        charts.renderNonRoutineUptChart('chart-non-routine-upt', nonRoutineDataService.getDistribution(state.nonRoutineFilters).byUpt);
        renderNonRoutineTable(records);
    }

    function renderNonRoutineTable(records) {
        const tbody = document.getElementById('non-routine-table-body');
        if (!tbody) return;
        const tableState = state.nonRoutineTable;
        const sorted = [...records].sort((a, b) => {
            const left = a[tableState.sortCol] ?? '';
            const right = b[tableState.sortCol] ?? '';
            const order = typeof left === 'number' && typeof right === 'number'
                ? left - right
                : String(left).localeCompare(String(right), 'id');
            return tableState.sortAsc ? order : -order;
        });
        const totalPages = Math.max(1, Math.ceil(sorted.length / tableState.pageSize));
        tableState.page = Math.min(tableState.page, totalPages);
        const start = (tableState.page - 1) * tableState.pageSize;
        const pageItems = sorted.slice(start, start + tableState.pageSize);
        const countInfo = document.getElementById('non-routine-count-info');
        if (countInfo) countInfo.textContent = `Menampilkan ${pageItems.length ? start + 1 : 0}-${Math.min(start + tableState.pageSize, sorted.length)} dari ${sorted.length.toLocaleString()} kejadian`;
        const pageInfo = document.getElementById('non-routine-page-indicator');
        if (pageInfo) pageInfo.textContent = `Halaman ${tableState.page} / ${totalPages}`;
        const previous = document.getElementById('btn-non-prev-page');
        const next = document.getElementById('btn-non-next-page');
        if (previous) previous.disabled = tableState.page <= 1;
        if (next) next.disabled = tableState.page >= totalPages;

        tbody.replaceChildren();
        if (!pageItems.length) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Tidak ada kejadian non-rutin yang sesuai dengan filter.</td>';
            tbody.appendChild(row);
            return;
        }
        pageItems.forEach(record => {
            const row = document.createElement('tr');
            const values = [
                record.NO || '-',
                [record.UPT, record.ULTG].filter(Boolean).join(' / ') || '-',
                [record.LOKASI, record.NAMA_BAY].filter(Boolean).join(' / ') || '-',
                record.URAIAN_PEKERJAAN || '-', record.KATEGORI_PADAM || '-', record.SIFAT || '-',
                [record.TANGGAL_LABEL, record.AWAL_JAM].filter(Boolean).join(' • ') || '-',
                record.DURASI_FORMATTED || '-'
            ];
            values.forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
            const quality = document.createElement('td');
            quality.textContent = record.DATA_QUALITY.length ? `⚠ ${record.DATA_QUALITY.length} isu` : '✓ Valid';
            quality.className = record.DATA_QUALITY.length ? 'status-badge status-reschedule' : 'status-badge status-done';
            row.appendChild(quality);
            tbody.appendChild(row);
        });
    }

    function exportNonRoutineCsv(records) {
        if (!records.length) return alert('Tidak ada data non-rutin yang dapat diekspor.');
        const fields = ['NO', 'UPT', 'ULTG', 'LOKASI', 'NAMA_BAY', 'URAIAN_PEKERJAAN', 'KATEGORI_PADAM', 'SIFAT', 'TANGGAL_LABEL', 'AWAL_JAM', 'AKHIR_JAM', 'DURASI_MENIT', 'DURASI_FORMATTED'];
        const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = '\uFEFF' + fields.join(',') + '\n' + records.map(row => fields.map(field => quote(row[field])).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `PLN_UIT_JBB_Realisasi_Non_Rutin_${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Setup Event Listeners
     */
    function setupEventListeners() {
        // Navigation Tabs (SPEC Section 5)
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                const targetTab = e.currentTarget.getAttribute('data-tab');
                e.currentTarget.classList.add('active');
                const targetPane = document.getElementById(`tab-${targetTab}`);
                if (targetPane) targetPane.classList.add('active');
                state.activeTab = targetTab;
            });
        });

        // Filter Changes
        const filterIds = [
            'periode', 'upt', 'ultg', 'lokasi', 'bay', 'jenis-bay',
            'tegangan', 'status', 'penanggung-jawab', 'pelaksana', 'ketersediaan-laporan'
        ];

        filterIds.forEach(id => {
            const el = document.getElementById(`filter-${id}`);
            if (!el) return;
            el.addEventListener('change', (e) => {
                const camelKey = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                state.filters[camelKey] = e.target.value;
                if (id === 'upt') {
                    updateUltgOptions();
                }
                state.table.page = 1;
                updateDashboard();
            });
        });

        // Reset Filter Button
        const btnReset = document.getElementById('btn-reset-filters');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                Object.keys(state.filters).forEach(k => state.filters[k] = (k === 'search' ? '' : 'ALL'));
                filterIds.forEach(id => {
                    const el = document.getElementById(`filter-${id}`);
                    if (el) el.value = 'ALL';
                });
                const searchEl = document.getElementById('table-search-input');
                if (searchEl) searchEl.value = '';
                updateUltgOptions();
                state.table.page = 1;
                updateDashboard();
            });
        }

        // Refresh Data Button
        const btnRefresh = document.getElementById('btn-refresh-data');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', refreshDashboardData);
        }

        // Refresh AI Button
        const btnRefreshAi = document.getElementById('btn-refresh-ai');
        if (btnRefreshAi) {
            btnRefreshAi.addEventListener('click', () => {
                refreshAiBriefing();
            });
        }

        // KPI Card Clicks (Drill-down filters)
        document.querySelectorAll('.kpi-card').forEach(card => {
            card.addEventListener('click', () => {
                const filterType = card.getAttribute('data-filter-type');
                const filterVal = card.getAttribute('data-filter-val');
                if (!filterType || !filterVal) return;

                if (state.filters[filterType] === filterVal) {
                    state.filters[filterType] = 'ALL';
                    card.classList.remove('kpi-active-filter');
                } else {
                    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('kpi-active-filter'));
                    state.filters[filterType] = filterVal;
                    card.classList.add('kpi-active-filter');
                }

                const selectEl = document.getElementById(`filter-${formatInputId(filterType)}`);
                if (selectEl) selectEl.value = state.filters[filterType];
                state.table.page = 1;
                updateDashboard();
            });
        });

        // Table Search
        const searchInput = document.getElementById('table-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.filters.search = e.target.value;
                state.table.page = 1;
                renderTable(dataService.getFilteredMaintenance(state.filters));
            });
        }

        // Table Column Sorting
        document.querySelectorAll('.dash-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-sort');
                if (state.table.sortCol === col) {
                    state.table.sortAsc = !state.table.sortAsc;
                } else {
                    state.table.sortCol = col;
                    state.table.sortAsc = true;
                }
                renderTable(dataService.getFilteredMaintenance(state.filters));
            });
        });

        // Pagination buttons
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (state.table.page > 1) {
                    state.table.page--;
                    renderTable(dataService.getFilteredMaintenance(state.filters));
                }
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                state.table.page++;
                renderTable(dataService.getFilteredMaintenance(state.filters));
            });
        }

        // Export to CSV
        const btnExport = document.getElementById('btn-export-csv');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                exportFilteredCsv(dataService.getFilteredMaintenance(state.filters));
            });
        }

        // Modal Close
        const modal = document.getElementById('detail-modal');
        const btnCloseModal = document.getElementById('btn-close-modal');
        if (btnCloseModal && modal) {
            btnCloseModal.addEventListener('click', () => modal.classList.remove('open'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
        }

        // AI Assistant Drawer
        const drawer = document.getElementById('ai-assistant-drawer');
        const overlay = document.getElementById('ai-drawer-overlay');
        const btnOpenAi = document.getElementById('btn-header-ai');
        const btnCloseDrawer = document.getElementById('btn-close-drawer');

        if (btnOpenAi && drawer && overlay) {
            btnOpenAi.addEventListener('click', () => {
                drawer.classList.add('open');
                overlay.classList.add('open');
            });
            btnCloseDrawer.addEventListener('click', () => {
                drawer.classList.remove('open');
                overlay.classList.remove('open');
            });
            overlay.addEventListener('click', () => {
                drawer.classList.remove('open');
                overlay.classList.remove('open');
            });
        }

        // AI Assistant Chat Send
        const btnSendAi = document.getElementById('btn-send-ai-chat');
        const inputAi = document.getElementById('ai-chat-input');
        if (btnSendAi && inputAi) {
            btnSendAi.addEventListener('click', () => handleAiChatSubmit());
            inputAi.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAiChatSubmit();
            });
        }

        // AI Quick Prompts
        document.querySelectorAll('.quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.textContent.replace(/^💡\s*/, '');
                if (inputAi) inputAi.value = text;
                handleAiChatSubmit();
            });
        });

        // Non-routine filters, table controls, and snapshot refresh.
        ['tahun', 'bulan', 'upt', 'ultg', 'lokasi', 'padam', 'sifat'].forEach(key => {
            const input = document.getElementById(`non-filter-${key}`);
            if (!input) return;
            input.addEventListener('change', event => {
                state.nonRoutineFilters[key] = event.target.value;
                state.nonRoutineTable.page = 1;
                updateNonRoutineDashboard();
            });
        });
        const nonRoutineSearch = document.getElementById('non-routine-search');
        if (nonRoutineSearch) nonRoutineSearch.addEventListener('input', event => {
            state.nonRoutineFilters.search = event.target.value;
            state.nonRoutineTable.page = 1;
            updateNonRoutineDashboard();
        });
        const resetNonRoutine = document.getElementById('btn-reset-non-routine');
        if (resetNonRoutine) resetNonRoutine.addEventListener('click', () => {
            Object.keys(state.nonRoutineFilters).forEach(key => state.nonRoutineFilters[key] = key === 'search' ? '' : 'ALL');
            document.querySelectorAll('[id^="non-filter-"]').forEach(input => input.value = 'ALL');
            if (nonRoutineSearch) nonRoutineSearch.value = '';
            state.nonRoutineTable.page = 1;
            updateNonRoutineDashboard();
        });
        document.querySelectorAll('[data-non-sort]').forEach(header => header.addEventListener('click', () => {
            const column = header.getAttribute('data-non-sort');
            state.nonRoutineTable.sortAsc = state.nonRoutineTable.sortCol === column ? !state.nonRoutineTable.sortAsc : true;
            state.nonRoutineTable.sortCol = column;
            updateNonRoutineDashboard();
        }));
        const nonPrevious = document.getElementById('btn-non-prev-page');
        if (nonPrevious) nonPrevious.addEventListener('click', () => {
            if (state.nonRoutineTable.page > 1) { state.nonRoutineTable.page--; updateNonRoutineDashboard(); }
        });
        const nonNext = document.getElementById('btn-non-next-page');
        if (nonNext) nonNext.addEventListener('click', () => { state.nonRoutineTable.page++; updateNonRoutineDashboard(); });
        const exportNonRoutine = document.getElementById('btn-export-non-routine');
        if (exportNonRoutine) exportNonRoutine.addEventListener('click', () => exportNonRoutineCsv(nonRoutineDataService.getFilteredData(state.nonRoutineFilters)));
        const refreshNonRoutine = document.getElementById('btn-refresh-non-routine');
        if (refreshNonRoutine) refreshNonRoutine.addEventListener('click', async () => {
            refreshNonRoutine.disabled = true;
            refreshNonRoutine.textContent = 'Memperbarui...';
            try {
                await nonRoutineDataService.refresh();
                populateNonRoutineFilterDropdowns();
                renderNonRoutineSourceMeta();
                updateNonRoutineDashboard();
            } catch (error) {
                console.warn('Non-routine refresh failed:', error);
                alert('Snapshot non-rutin tidak dapat diperbarui. Data yang telah dimuat tetap tersedia.');
            } finally {
                refreshNonRoutine.disabled = false;
                refreshNonRoutine.textContent = '🔄 Refresh Snapshot';
            }
        });
    }

    /**
     * Handle AI Assistant Chat Message
     */
    async function handleAiChatSubmit() {
        const input = document.getElementById('ai-chat-input');
        const container = document.getElementById('ai-messages-container');
        if (!input || !container) return;

        const query = input.value.trim();
        if (!query) return;

        // Append User Message
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-bubble user';
        userMsg.textContent = query;
        container.appendChild(userMsg);
        input.value = '';
        container.scrollTop = container.scrollHeight;

        // Append Thinking Bubble
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-bubble ai';
        aiMsg.innerHTML = `<em>Menganalisis data pemeliharaan PLN UIT JBB...</em>`;
        container.appendChild(aiMsg);
        container.scrollTop = container.scrollHeight;

        const summary = dataService.getMaintenanceSummary(state.filters);
        const activeFilterSummary = Object.entries(state.filters)
            .filter(([k, v]) => v !== 'ALL' && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');

        const reply = await aiService.askAssistant(query, {
            ...summary,
            activeFilters: activeFilterSummary
        });

        aiMsg.innerHTML = renderMarkdown(reply);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Export Filtered Dataset to CSV
     */
    function exportFilteredCsv(records) {
        if (!records || records.length === 0) {
            alert('Tidak ada data yang dapat diekspor.');
            return;
        }

        const headers = [
            'ID', 'UPT', 'ULTG', 'LOKASI', 'BAY', 'JENIS BAY', 'TEGANGAN',
            'URAIAN PEKERJAAN', 'PENANGGUNG JAWAB', 'PELAKSANA', 'RENCANA',
            'STATUS', 'PENYEBAB JADWAL ULANG', 'KETERANGAN', 'REALISASI',
            'REALISASI MULAI', 'REALISASI SELESAI', 'DURASI MENIT', 'DURASI FORMATTED',
            'KETERSEDIAAN LAPORAN', 'JUMLAH PERSONIL'
        ];

        const rows = records.map(r => [
            `"${r.id || ''}"`,
            `"${r.UPT || ''}"`,
            `"${r.ULTG || ''}"`,
            `"${r.LOKASI || ''}"`,
            `"${r.BAY || ''}"`,
            `"${r.JENIS_BAY || ''}"`,
            `"${r.TEGANGAN || ''}"`,
            `"${(r.URAIAN_PEKERJAAN || '').replace(/"/g, '""')}"`,
            `"${r.PENANGGUNG_JAWAB || ''}"`,
            `"${r.PELAKSANA || ''}"`,
            `"${r.RENCANA || ''}"`,
            `"${r.STATUS || ''}"`,
            `"${(r.PENYEBAB_JADWAL_ULANG || '').replace(/"/g, '""')}"`,
            `"${(r.KETERANGAN || '').replace(/"/g, '""')}"`,
            `"${r.REALISASI || ''}"`,
            `"${r.REALISASI_MULAI || ''}"`,
            `"${r.REALISASI_SELESAI || ''}"`,
            r.DURASI_MENIT || 0,
            `"${r.DURASI_FORMATTED || ''}"`,
            `"${r.KETERSEDIAAN_LAPORAN || ''}"`,
            r.JUMLAH_PERSONIL || 0
        ]);

        const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PLN_UIT_JBB_Realisasi_Har_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
