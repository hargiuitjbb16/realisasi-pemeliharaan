/**
 * charts.js
 * Chart.js Visualizations for PLN UIT JBB Maintenance Dashboard
 * Conforms to SPEC.MD Sections 13, 14, 15, 16.
 */

class DashboardCharts {
    constructor() {
        this.instances = {};
        this.chartColors = {
            navy: '#0B192C',
            blue: '#004B87',
            cyan: '#00A3E0',
            cyanLight: 'rgba(0, 163, 224, 0.75)',
            gold: '#FFC107',
            goldLight: 'rgba(255, 193, 7, 0.75)',
            emerald: '#10B981',
            emeraldLight: 'rgba(16, 185, 129, 0.75)',
            crimson: '#EF4444',
            crimsonLight: 'rgba(239, 68, 68, 0.75)',
            purple: '#8B5CF6',
            slateDark: '#1E293B',
            textLight: '#E2E8F0',
            textMuted: '#94A3B8',
            gridLines: 'rgba(255, 255, 255, 0.06)'
        };
    }

    destroyChart(id) {
        if (this.instances[id]) {
            this.instances[id].destroy();
            delete this.instances[id];
        }
    }

    /**
     * Chart 1: Rencana vs Realisasi per Bulan (SPEC Section 13)
     * Combo: Bar (Rencana & Realisasi) + Line (% Realisasi)
     */
    renderMonthlyTrendChart(canvasId, trendData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trendData.labels,
                datasets: [
                    {
                        type: 'line',
                        label: '% Realisasi',
                        data: trendData.persenData,
                        borderColor: this.chartColors.gold,
                        backgroundColor: this.chartColors.gold,
                        borderWidth: 3,
                        pointBackgroundColor: this.chartColors.gold,
                        pointBorderColor: '#0F172A',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        yAxisID: 'y1',
                        tension: 0.35,
                        order: 1
                    },
                    {
                        type: 'bar',
                        label: 'Rencana',
                        data: trendData.rencanaData,
                        backgroundColor: 'rgba(0, 163, 224, 0.65)',
                        borderColor: this.chartColors.cyan,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        type: 'bar',
                        label: 'Realisasi (Terlaksana)',
                        data: trendData.realisasiData,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: this.chartColors.emerald,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        yAxisID: 'y',
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { family: 'Inter', size: 12, weight: '600' }, usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#E2E8F0',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(c) {
                                if (c.dataset.type === 'line') return ` % Realisasi: ${c.parsed.y}%`;
                                return ` ${c.dataset.label}: ${c.parsed.y} Pekerjaan`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted, font: { family: 'Inter', weight: '500' } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Jumlah Pekerjaan', color: this.chartColors.textMuted },
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: '% Capaian', color: this.chartColors.gold },
                        ticks: {
                            color: this.chartColors.gold,
                            callback: v => `${v}%`
                        },
                        grid: { drawOnChartArea: false },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * Chart 2: Realisasi Berdasarkan UPT (SPEC Section 14)
     * Horizontal Bar Chart + Click to Filter
     */
    renderUptChart(canvasId, uptData, onUptClick) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = uptData.map(u => u.upt.replace('UPT ', ''));
        const rencana = uptData.map(u => u.rencana);
        const realisasi = uptData.map(u => u.realisasi);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rencana',
                        data: rencana,
                        backgroundColor: 'rgba(0, 163, 224, 0.6)',
                        borderColor: this.chartColors.cyan,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Realisasi',
                        data: realisasi,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: this.chartColors.emerald,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0 && typeof onUptClick === 'function') {
                        const idx = elements[0].index;
                        const clickedUpt = uptData[idx].upt;
                        onUptClick(clickedUpt);
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { family: 'Inter', size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        callbacks: {
                            afterBody: function(items) {
                                const idx = items[0].dataIndex;
                                const item = uptData[idx];
                                return [
                                    `% Realisasi: ${item.persenRealisasi}%`,
                                    `Jadwal Ulang: ${item.jadwalUlang}`,
                                    `Kepatuhan Laptek: ${item.persenLaporan}%`,
                                    `💡 Klik bar untuk memfilter UPT ini`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: this.chartColors.textLight, font: { weight: '600' } }
                    }
                }
            }
        });
    }

    /**
     * Chart 3: Realisasi Berdasarkan ULTG (SPEC Section 15)
     */
    renderUltgChart(canvasId, ultgData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const displayItems = ultgData.slice(0, 12);
        const labels = displayItems.map(u => u.ultg.replace('ULTG ', ''));
        const rencana = displayItems.map(u => u.rencana);
        const realisasi = displayItems.map(u => u.realisasi);
        const reschedule = displayItems.map(u => u.jadwalUlang);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rencana',
                        data: rencana,
                        backgroundColor: 'rgba(0, 163, 224, 0.6)',
                        borderColor: this.chartColors.cyan,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Terlaksana',
                        data: realisasi,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: this.chartColors.emerald,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Jadwal Ulang',
                        data: reschedule,
                        backgroundColor: 'rgba(239, 68, 68, 0.75)',
                        borderColor: this.chartColors.crimson,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { size: 11 } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted, maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Chart 4: Top Gardu Induk (GI) Analysis (SPEC Section 16)
     */
    renderTopLocationsChart(canvasId, giData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = giData.map(g => g.lokasi.replace('GITET ', '').replace('GIS ', '').replace('GI ', ''));
        const rencana = giData.map(g => g.rencana);
        const realisasi = giData.map(g => g.realisasi);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rencana',
                        data: rencana,
                        backgroundColor: 'rgba(0, 163, 224, 0.5)',
                        borderColor: this.chartColors.cyan,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Terlaksana',
                        data: realisasi,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: this.chartColors.emerald,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { size: 11 } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: this.chartColors.textLight, font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Chart 5: Analisis Jadwal Ulang (Controllable vs Uncontrollable Donut)
     */
    renderPenyebabJadwalUlangChart(canvasId, rescheduleData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const topReasons = rescheduleData.topReasons.slice(0, 5);
        const labels = topReasons.map(r => r.reason.length > 30 ? r.reason.substring(0, 30) + '...' : r.reason);
        const counts = topReasons.map(r => r.count);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: counts,
                        backgroundColor: [
                            '#EF4444',
                            '#F59E0B',
                            '#00A3E0',
                            '#8B5CF6',
                            '#10B981'
                        ],
                        borderWidth: 2,
                        borderColor: '#0F172A'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: this.chartColors.textLight, font: { size: 10 }, boxWidth: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(c) {
                                return ` ${c.label}: ${c.raw} kejadian`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Chart 6: Ketersediaan Laporan (Laptek) Compliance
     */
    renderLaporanChart(canvasId, laporanData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const labels = laporanData.map(l => l.upt.replace('UPT ', ''));
        const ada = laporanData.map(l => l.ada);
        const belumAda = laporanData.map(l => l.belumAda);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Laporan Tersedia (Ada)',
                        data: ada,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: this.chartColors.emerald,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Belum Tersedia',
                        data: belumAda,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: this.chartColors.crimson,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted }
                    },
                    y: {
                        stacked: true,
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Chart 7: Personil per Jenis Bay
     */
    renderPersonilChart(canvasId, personilData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const displayItems = personilData.slice(0, 8);
        const labels = displayItems.map(p => p.jenisBay);
        const totals = displayItems.map(p => p.totalPersonil);
        const avgs = displayItems.map(p => p.avgPersonil);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Total Manpower (Orang)',
                        data: totals,
                        backgroundColor: 'rgba(0, 163, 224, 0.7)',
                        borderColor: this.chartColors.cyan,
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Rata-rata Regu/Bay',
                        data: avgs,
                        borderColor: this.chartColors.gold,
                        backgroundColor: this.chartColors.gold,
                        pointRadius: 4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted, maxRotation: 30, minRotation: 30 }
                    },
                    y: {
                        title: { display: true, text: 'Total Personil', color: this.chartColors.textMuted },
                        grid: { color: this.chartColors.gridLines },
                        ticks: { color: this.chartColors.textMuted }
                    },
                    y1: {
                        position: 'right',
                        title: { display: true, text: 'Avg/Bay', color: this.chartColors.gold },
                        grid: { drawOnChartArea: false },
                        ticks: { color: this.chartColors.gold }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: this.chartColors.textLight, font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * Non-routine trend: total events split by padam category.
     */
    renderNonRoutineTrendChart(canvasId, trendData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trendData.labels,
                datasets: [
                    { label: 'Dengan Padam', data: trendData.padamData, backgroundColor: 'rgba(239, 68, 68, 0.75)', borderColor: this.chartColors.crimson, borderWidth: 1, borderRadius: 4 },
                    { label: 'Tanpa Padam', data: trendData.tanpaPadamData, backgroundColor: 'rgba(16, 185, 129, 0.75)', borderColor: this.chartColors.emerald, borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { color: this.chartColors.gridLines }, ticks: { color: this.chartColors.textMuted } },
                    y: { stacked: true, beginAtZero: true, grid: { color: this.chartColors.gridLines }, ticks: { color: this.chartColors.textMuted } }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: this.chartColors.textLight, font: { size: 11 } } },
                    tooltip: { callbacks: { footer: items => `Total: ${items.reduce((sum, item) => sum + Number(item.raw || 0), 0)} kejadian` } }
                }
            }
        });
    }

    /**
     * Non-routine distribution by UPT.
     */
    renderNonRoutineUptChart(canvasId, uptData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: uptData.map(item => item.label.replace(/^UPT /, '')),
                datasets: [
                    { label: 'Dengan Padam', data: uptData.map(item => item.padam), backgroundColor: 'rgba(239, 68, 68, 0.75)', borderColor: this.chartColors.crimson, borderWidth: 1, borderRadius: 4 },
                    { label: 'Tanpa Padam', data: uptData.map(item => item.tanpaPadam), backgroundColor: 'rgba(16, 185, 129, 0.75)', borderColor: this.chartColors.emerald, borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, beginAtZero: true, grid: { color: this.chartColors.gridLines }, ticks: { color: this.chartColors.textMuted } },
                    y: { stacked: true, grid: { display: false }, ticks: { color: this.chartColors.textLight, font: { weight: '600' } } }
                },
                plugins: { legend: { position: 'top', labels: { color: this.chartColors.textLight, font: { size: 11 } } } }
            }
        });
    }

    /**
     * Chart: Realisasi Durasi Pemeliharaan per Lokasi (Gardu Induk)
     * Perhitungan durasi dari Realisasi Mulai Pekerjaan sampai dengan Selesai Pekerjaan
     */
    renderDurasiPerLokasiChart(canvasId, durationData) {
        this.destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const displayItems = durationData.slice(0, 12);
        const labels = displayItems.map(d => d.lokasi.replace('GITET ', '').replace('GIS ', '').replace('GI ', ''));
        const avgHours = displayItems.map(d => d.avgJam);

        // Dynamic color coding based on duration thresholds
        const bgColors = avgHours.map(h => {
            if (h <= 8) return 'rgba(16, 185, 129, 0.8)'; // Normal standard shift
            if (h <= 11) return 'rgba(245, 158, 11, 0.85)'; // Extended shift
            return 'rgba(239, 68, 68, 0.85)'; // Critical long outage (>11h)
        });

        const borderColors = avgHours.map(h => {
            if (h <= 8) return this.chartColors.emerald;
            if (h <= 11) return this.chartColors.gold;
            return this.chartColors.crimson;
        });

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rata-rata Durasi (Jam)',
                        data: avgHours,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 5
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 12,
                        callbacks: {
                            label: function(c) {
                                const idx = c.dataIndex;
                                const item = displayItems[idx];
                                return ` ⏱️ Rata-rata Durasi: ${item.avgJam} Jam (${item.avgFormatted})`;
                            },
                            afterBody: function(items) {
                                const idx = items[0].dataIndex;
                                const item = displayItems[idx];
                                const lines = [
                                    ` Unit: ${item.upt} (${item.ultg})`,
                                    ` Total Pekerjaan Terlaksana: ${item.totalPekerjaan} bay`,
                                    ` Total Akumulasi Durasi: ${item.totalJam} Jam`
                                ];
                                if (item.longestBay) {
                                    lines.push(` Pekerjaan Terlama: ${item.longestBay} (${Math.round(item.maxMenit/60*10)/10} Jam)`);
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: this.chartColors.gridLines },
                        title: { display: true, text: 'Rata-rata Durasi Pemeliharaan (Jam)', color: this.chartColors.textMuted },
                        ticks: {
                            color: this.chartColors.textMuted,
                            callback: v => `${v} Jam`
                        },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: this.chartColors.textLight, font: { weight: '600', size: 11 } }
                    }
                }
            }
        });
    }
}

// Export as global or module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardCharts;
} else {
    window.DashboardCharts = DashboardCharts;
}
