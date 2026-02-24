import React, { useState, useMemo } from 'react';
import { fetchCustomVotings, getPartyColor } from './api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Download, Filter, BarChart2 } from 'lucide-react';

const PARTIES = ['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP', '-'];
const PERIODS = [
    { label: '2024/25', value: '2024%2F25' },
    { label: '2023/24', value: '2023%2F24' },
    { label: '2022/23', value: '2022%2F23' }
];

const CustomBuilder = ({ members = [] }) => {
    const [selectedParties, setSelectedParties] = useState([...PARTIES]);
    const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0].value);
    const [customData, setCustomData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const handlePartyToggle = (party) => {
        if (selectedParties.includes(party)) {
            setSelectedParties(selectedParties.filter(p => p !== party));
        } else {
            setSelectedParties([...selectedParties, party]);
        }
    };

    const handleDataFetch = async () => {
        setLoading(true);
        try {
            const votes = await fetchCustomVotings(selectedPeriod, 2000);
            // Ensures we get an array
            setCustomData(Array.isArray(votes) ? votes : [votes]);
            setHasLoaded(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        return customData.filter(v => selectedParties.includes(v.parti || '-'));
    }, [customData, selectedParties]);

    // Aggregate graph data: How did the selected parties vote in total?
    const graphData = useMemo(() => {
        const stats = { 'Ja': 0, 'Nej': 0, 'Avstår': 0, 'Frånvarande': 0 };
        filteredData.forEach(v => {
            if (stats[v.rost] !== undefined) {
                stats[v.rost]++;
            }
        });
        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    // Party Breakdown Data for secondary chart
    const partyBreakdown = useMemo(() => {
        const map = {};
        filteredData.forEach(v => {
            const p = v.parti || '-';
            if (!map[p]) map[p] = { name: p, Ja: 0, Nej: 0, Avstår: 0, Frånvarande: 0 };
            if (map[p][v.rost] !== undefined) {
                map[p][v.rost]++;
            }
        });
        return Object.values(map);
    }, [filteredData]);

    const exportBlob = (dataString, type, filename) => {
        const blob = new Blob([dataString], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        // Build CSV string
        const headers = ['rm', 'beteckning', 'punkt', 'namn', 'parti', 'rost', 'avser', 'datum'];
        const csvRows = [headers.join(',')];

        filteredData.forEach(v => {
            const row = [
                v.rm,
                v.beteckning,
                v.punkt,
                `"${v.namn}"`,
                v.parti,
                v.rost,
                v.avser,
                v.systemdatum
            ];
            csvRows.push(row.join(','));
        });

        exportBlob(csvRows.join('\n'), 'text/csv;charset=utf-8;', `riksdagen_votering_export_${selectedPeriod}.csv`);
    };

    const handleExportJSON = () => {
        if (filteredData.length === 0) return;
        exportBlob(JSON.stringify(filteredData, null, 2), 'application/json;charset=utf-8;', `riksdagen_votering_export_${selectedPeriod}.json`);
    };

    const handleExportMembersCSV = () => {
        if (members.length === 0) return;

        const headers = ['intressent_id', 'namn', 'parti', 'valkrets', 'status', 'fodd_ar', 'kon'];
        const csvRows = [headers.join(',')];

        members.forEach(m => {
            const row = [
                m.intressent_id,
                `"${m.tilltalsnamn} ${m.efternamn}"`,
                m.parti,
                `"${m.valkrets}"`,
                `"${m.status}"`,
                m.fodd_ar,
                m.kon
            ];
            csvRows.push(row.join(','));
        });

        exportBlob(csvRows.join('\n'), 'text/csv;charset=utf-8;', `riksdagen_ledamoter.csv`);
    };

    const handleExportMembersJSON = () => {
        if (members.length === 0) return;
        exportBlob(JSON.stringify(members, null, 2), 'application/json;charset=utf-8;', `riksdagen_ledamoter.json`);
    };

    return (
        <div className="custom-builder" style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter /> Filtrera och Bygg
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '2rem' }}>
                    <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Valt Riksmöte (Tidsperiod)</h4>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem',
                                background: 'transparent', color: 'white',
                                border: '1px solid var(--glass-border)',
                                fontFamily: 'inherit', fontSize: '1rem'
                            }}
                        >
                            {PERIODS.map(p => (
                                <option key={p.value} value={p.value} style={{ color: 'black' }}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Partier</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {PARTIES.map(p => (
                                <button
                                    key={p}
                                    onClick={() => handlePartyToggle(p)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: selectedParties.includes(p) ? getPartyColor(p) : 'transparent',
                                        color: selectedParties.includes(p) ? 'var(--bg-darker)' : 'white',
                                        border: `1px solid ${selectedParties.includes(p) ? 'transparent' : 'var(--glass-border)'}`,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-primary" onClick={handleDataFetch} disabled={loading}>
                        {loading ? 'Hämtar Voteringar...' : 'Hämta och Rendera Voteringar'}
                    </button>
                    <button className="btn btn-ghost" onClick={handleExportCSV} disabled={filteredData.length === 0}>
                        <Download size={18} /> Voteringar (CSV)
                    </button>
                    <button className="btn btn-ghost" onClick={handleExportJSON} disabled={filteredData.length === 0}>
                        <Download size={18} /> Voteringar (JSON)
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download /> Snabbexport: Riksdagens Ledamöter
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Exportera aktuellt register över alla inlästa riksdagsledamöter, inklusive partitillhörighet, valkrets och mandatstatus.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={handleExportMembersCSV} disabled={members.length === 0}>
                        <Download size={18} /> Ledamöter (CSV)
                    </button>
                    <button className="btn btn-ghost" onClick={handleExportMembersJSON} disabled={members.length === 0}>
                        <Download size={18} /> Ledamöter (JSON)
                    </button>
                </div>
            </div>

            {hasLoaded && (
                <div className="grid-dashboard">
                    <div className="glass-panel col-span-12">
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart2 /> Resultat ({filteredData.length} datapunkter)
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem' }}>

                            {/* Total Votes Chart */}
                            <div style={{ minHeight: '300px' }}>
                                <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Total Fördelning</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={graphData}>
                                        <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" tickLine={false} />
                                        <Tooltip cursor={{ fill: 'var(--glass-highlight)' }} contentStyle={{ background: 'var(--bg-darker)', border: '1px solid var(--glass-border)' }} />
                                        <Bar dataKey="value" fill="#ffffff" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Party Breakdown Chart */}
                            <div style={{ minHeight: '300px' }}>
                                <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Fördelning per Parti</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={partyBreakdown}>
                                        <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" tickLine={false} />
                                        <Tooltip cursor={{ fill: 'var(--glass-highlight)' }} contentStyle={{ background: 'var(--bg-darker)', border: '1px solid var(--glass-border)' }} />
                                        <Legend />
                                        <Bar dataKey="Ja" stackId="a" fill="#16a34a" />
                                        <Bar dataKey="Nej" stackId="a" fill="#dc2626" />
                                        <Bar dataKey="Avstår" stackId="a" fill="#ca8a04" />
                                        <Bar dataKey="Frånvarande" stackId="a" fill="#475569" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomBuilder;
