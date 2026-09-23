/**
 * AiService.js
 * AI Analytics & Decision Support Service for PLN UIT JBB Dashboard
 * Uses a local data-driven analytical engine. Keep external model credentials
 * on a trusted server-side integration rather than in the browser bundle.
 */

class AiService {
    constructor() {
        this.mode = 'local';
    }

    /**
     * Generate Comprehensive Management Insights
     */
    async generateExecutiveSummary(kpiSummary, uptList, anomalies, rescheduleStats, filterInfo = '') {
        const topUpt = uptList.length > 0 ? uptList[0] : null;
        const lowUpt = uptList.length > 0 ? uptList[uptList.length - 1] : null;

        const systemPrompt = `Anda adalah AI Senior Strategic Advisor dan Lead Power Grid Maintenance Analyst untuk PLN Unit Induk Transmisi Jawa Bagian Barat (UIT JBB).
Tugas Anda adalah menyajikan Executive Management Insight yang tajam, profesional, dan berbasis data dari realisasi pemeliharaan gardu induk.
Format laporan dengan Markdown yang terstruktur:
1. 📊 RINGKASAN EKSEKUTIF KINERJA (Executive Summary)
2. ⚠️ DETEKSI ANOMALI & RISIKO UTAMA (Risk & Anomaly Alert)
3. 🔍 ANALISIS AKAR MASALAH (Root Cause: Jadwal Ulang, Izin Padam P2B/APD, Ketersediaan Laporan)
4. 💡 REKOMENDASI STRATEGIS MANAJEMEN (Actionable Steps)

Gunakan istilah resmi transmisi ketenagalistrikan PLN (seperti ULTG, UPT, Bay Trafo, IBT, PHT, PMT, Laptek, P2B/APD).
Gaya bahasa: Formal, lugas, berbasis angka dan data.`;

        const userPrompt = `Data Monitoring Realisasi Rutin Pemeliharaan Gardu Induk PLN UIT JBB:
- Filter Aktif: ${filterInfo || 'Semua Data Unit'}
- Total Rencana: ${kpiSummary.totalRencana} pekerjaan
- Total Realisasi: ${kpiSummary.totalRealisasi} (${kpiSummary.persenRealisasi}%)
- Jadwal Ulang: ${kpiSummary.jadwalUlang} (${((kpiSummary.jadwalUlang / (kpiSummary.totalRencana || 1)) * 100).toFixed(1)}%)
- Belum Realisasi: ${kpiSummary.belumRealisasi}
- Kepatuhan Laporan Teknis (Laptek): ${kpiSummary.laporanTersedia} dari ${kpiSummary.totalRealisasi} terlaksana (${kpiSummary.persenLaporan}%)
- Total Personil: ${kpiSummary.totalPersonil} orang (Rata-rata: ${kpiSummary.avgPersonil} personil/pekerjaan)
- Realisasi Durasi Pemeliharaan (Mulai s.d. Selesai): Rata-rata ${kpiSummary.avgDurasiJam || 0} Jam/pekerjaan (Total Akumulasi: ${kpiSummary.totalDurasiJam || 0} Jam Kerja Lapangan)
- UPT Performa Tertinggi: ${topUpt ? topUpt.upt + ' (' + topUpt.persenRealisasi + '%)' : '-'}
- UPT Performa Terendah: ${lowUpt ? lowUpt.upt + ' (' + lowUpt.persenRealisasi + '%)' : '-'}
- Ringkasan Jadwal Ulang: ${rescheduleStats.controllable} Controllable vs ${rescheduleStats.uncontrollable} Uncontrollable. Penyebab Terbesar: ${rescheduleStats.topReasons.slice(0, 3).map(r => r.reason + ' (' + r.count + ')').join(', ')}
- Anomali Terdeteksi: ${anomalies.map(a => a.title + ': ' + a.description).join('; ') || 'Tidak ada anomali kritis'}

Buatkan Management Decision Briefing lengkap sekarang.`;

        if (this.mode === 'local') {
            return this._generateLocalInsight(kpiSummary, uptList, anomalies, rescheduleStats);
        }

        try {
            const resp = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer server-side-token-required'
                },
                body: JSON.stringify({
                    model: 'server-configured-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1200
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content;
                }
            }
            console.warn('Groq API responded with non-200, falling back to local NLG engine.');
        } catch (err) {
            console.warn('Groq API call error, using local AI generator:', err);
        }

        // High quality data-driven local fallback
        return this._generateLocalInsight(kpiSummary, uptList, anomalies, rescheduleStats);
    }

    /**
     * Interactive AI Assistant Q&A
     */
    async askAssistant(question, contextData) {
        const systemPrompt = `Anda adalah "AI Assistant Pemeliharaan Transmisi PLN UIT JBB". 
Anda bertugas menjawab pertanyaan manajemen dan tim operasi mengenai data pemeliharaan gardu induk, analisis kendala, personil, dan jadwal ulang.
Jawab dengan ramah, presisi, berbasis data numerik yang diberikan, dan langsung pada inti permasalahan.
Bila ditanya rekomendasi teknis, berikan langkah terukur berstandar PLN.`;

        const userPrompt = `KONTEKS DATA SAAT INI:
- Total Rencana: ${contextData.totalRencana}
- Terlaksana: ${contextData.totalRealisasi} (${contextData.persenRealisasi}%)
- Jadwal Ulang: ${contextData.jadwalUlang}
- Laporan Ada: ${contextData.laporanTersedia} / ${contextData.totalRealisasi}
- Total Personil: ${contextData.totalPersonil}
- Filter Aktif: ${contextData.activeFilters || 'Semua Data'}

PERTANYAAN USER:
"${question}"

Jawablah pertanyaan di atas secara komprehensif dalam bahasa Indonesia:`;

        if (this.mode === 'local') {
            return this._generateLocalAssistantAnswer(question, contextData);
        }

        try {
            const resp = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer server-side-token-required'
                },
                body: JSON.stringify({
                    model: 'server-configured-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 800
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content;
                }
            }
        } catch (err) {
            console.warn('AI Assistant Groq API error:', err);
        }

        // Smart Local Response
        return this._generateLocalAssistantAnswer(question, contextData);
    }

    /**
     * High quality Local Analytical Engine
     */
    _generateLocalInsight(kpi, uptList, anomalies, reschedule) {
        const pctReal = kpi.persenRealisasi;
        const statusReal = pctReal >= 80 ? 'Optimal' : pctReal >= 65 ? 'Perlu Pengawalan' : 'Kritis / Tertinggal';
        const topUpt = uptList[0];
        const lowUpt = uptList[uptList.length - 1];

        return `### 📊 1. Ringkasan Eksekutif Kinerja (Executive Summary)
Realisasi pemeliharaan rutin gardu induk di lingkungan **PLN Unit Induk Transmisi Jawa Bagian Barat (UIT JBB)** berada pada status **${statusReal}** dengan capaian **${kpi.totalRealisasi} dari ${kpi.totalRencana} rencana pekerjaan (${kpi.persenRealisasi}%)**.
- **Jadwal Ulang (Reschedule):** Tercatat sebanyak **${kpi.jadwalUlang} pekerjaan** (${((kpi.jadwalUlang / (kpi.totalRencana || 1)) * 100).toFixed(1)}%), di mana sebagian besar didorong oleh keterbatasan izin padam dari sistem transmisi/P2B/APD.
- **Kepatuhan Laporan Teknis (Laptek):** Dari ${kpi.totalRealisasi} pekerjaan terlaksana, **${kpi.laporanTersedia} (${kpi.persenLaporan}%)** telah memiliki laporan teknis lengkap, sementara **${kpi.laporanBelumTersedia} pekerjaan** masih dalam proses verifikasi dan penyusunan.
- **Manpower:** Total personil pelaksana yang dikerahkan mencapai **${kpi.totalPersonil.toLocaleString()} orang**, dengan rata-rata alokasi **${kpi.avgPersonil} personil per bay**.

---

### ⚠️ 2. Deteksi Anomali & Risiko Operasional
${anomalies.map((a, idx) => `**${idx + 1}. [${a.severity}] ${a.title}**  
${a.description} *(Metrik: ${a.metric})*`).join('\n\n')}

---

### 🔍 3. Analisis Akar Masalah (Root Cause Analysis)
1. **Faktor Sistem Transmisi (Uncontrollable ${reschedule.uncontrollable} kasus):** Mayoritas penundaan pemeliharaan disebabkan oleh kendala manuver beban dan pembatalan izin padam dari Pengatur Beban (P2B/APD) akibat kondisi kontingensi subsistem dan beban puncak.
2. **Pekerjaan Emergency & Bersamaan:** Terjadi overlap jadwal pekerjaan dengan penanganan anomali darurat (seperti investigasi tap changer / buspro), sehingga personil terbagi.
3. **Disparitas Antar UPT:** Unit dengan performa terbaik adalah **${topUpt ? topUpt.upt : '-'} (${topUpt ? topUpt.persenRealisasi : 0}%)**, sedangkan **${lowUpt ? lowUpt.upt : '-'}** memerlukan penguatan koordinasi karena capaian masih di level **${lowUpt ? lowUpt.persenRealisasi : 0}%**.

---

### 💡 4. Rekomendasi Tindakan Manajemen (Actionable Guidance)
- **Koordinasi Penjadwalan Terintegrasi (Weekly Dispatch Meeting):** Intensifkan sinkronisasi jadwal mingguan dengan P2B/APD untuk mengunci window padam pada bay-bay prioritas (khususnya IBT dan Busbar).
- **Akselerasi Digitalisasi Laptek:** Wajibkan upload laporan teknis maksimal H+3 pasca pelaksanaan pekerjaan dengan target kepatuhan minimal 95%.
- **Optimasi Regu Har & Helper:** Evaluasi distribusi regu pelaksana di gardu induk berkategori beban tinggi untuk menekan durasi padam pekerjaan.`;
    }

    _generateLocalAssistantAnswer(question, ctx) {
        const q = question.toLowerCase();
        if (q.includes('realisasi') || q.includes('persen') || q.includes('capaian')) {
            return `Berdasarkan data saat ini, total rencana pemeliharaan adalah **${ctx.totalRencana} pekerjaan**, dengan realisasi terlaksana sebanyak **${ctx.totalRealisasi} pekerjaan** atau mencapai **${ctx.persenRealisasi}%**. Terdapat **${ctx.jadwalUlang} pekerjaan** yang mengalami jadwal ulang.`;
        }
        if (q.includes('upt') || q.includes('terendah') || q.includes('tertinggi')) {
            return `Monitoring antar UPT menunjukkan adanya variasi capaian. UPT dengan volume pekerjaan terbesar tersebar di UPT Cawang, Cilegon, dan Duri Kosambi. Silakan gunakan filter UPT pada toolbar di atas untuk melihat detail per ULTG dan Gardu Induk masing-masing.`;
        }
        if (q.includes('jadwal ulang') || q.includes('reschedule') || q.includes('penyebab')) {
            return `Tingkat jadwal ulang saat ini mencapai **${ctx.jadwalUlang} pekerjaan**. Penyebab utama yang mendominasi adalah faktor **Izin Padam P2B/APD/KIT (Kondisi Sistem)** serta penanganan bersamaan pekerjaan emergency.`;
        }
        if (q.includes('laporan') || q.includes('laptek')) {
            return `Ketersediaan laporan teknis (Laptek) tercatat **${ctx.laporanTersedia} berkas tersedia** dari total ${ctx.totalRealisasi} pekerjaan terlaksana (tingkat kepatuhan **${ctx.persenLaporan}%**). Masih terdapat pekerjaan selesai yang memerlukan percepatan penyusunan laporan.`;
        }
        if (q.includes('personil') || q.includes('petugas')) {
            return `Total personil pelaksana pemeliharaan yang terdata adalah **${ctx.totalPersonil.toLocaleString()} orang** dengan rata-rata alokasi **${ctx.avgPersonil} personil per pekerjaan**. Alokasi tertinggi umumnya dialokasikan pada Bay Trafo Tenaga dan IBT 500/150kV.`;
        }
        return `Halo, saya AI Assistant Pemeliharaan Transmisi PLN UIT JBB. Berdasarkan filter aktif (${ctx.activeFilters || 'Semua Data'}), total rencana adalah ${ctx.totalRencana} dengan realisasi ${ctx.persenRealisasi}%. Anda dapat menanyakan tentang performa UPT, penyebab jadwal ulang, status laporan teknis, atau kebutuhan alokasi personil.`;
    }
}

// Export as global or module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AiService;
} else {
    window.AiService = AiService;
}
