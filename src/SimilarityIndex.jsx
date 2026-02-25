import React, { useState, useMemo } from 'react';
import { fetchCustomVotings, getPartyColor } from './api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

const PARTIES = ['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP'];
const PERIODS = [
    { label: '2025/26', value: '2025%2F26' },
    { label: '2024/25', value: '2024%2F25' },
    { label: '2023/24', value: '2023%2F24' },
    { label: '2022/23', value: '2022%2F23' }
];

const SimilarityIndex = () => {
    const [period, setPeriod] = useState(PERIODS[0].value);
    const [loading, setLoading] = useState(false);
    const [voteData, setVoteData] = useState([]);
    const [selectedParty, setSelectedParty] = useState('S');

    const handleFetch = async () => {
        setLoading(true);
        try {
            // Fetch a good sample size for similarity
            const data = await fetchCustomVotings(period, 5000);
            setVoteData(Array.isArray(data) ? data : [data]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Calculate similarity
    const similarityScores = useMemo(() => {
        if (!voteData || voteData.length === 0) return [];

        // Group by votering_id (issue) -> parti -> majority vote
        // Since we want to know what the party "line" was, we find the most common vote per party per issue.
        const issues = {};
        voteData.forEach(v => {
            if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
            if (!issues[v.votering_id]) issues[v.votering_id] = {};
            if (!issues[v.votering_id][v.parti]) issues[v.votering_id][v.parti] = { 'Ja': 0, 'Nej': 0, 'Avstår': 0 };

            issues[v.votering_id][v.parti][v.rost]++;
        });

        // Resolve party line per issue
        const partyLines = {};
        Object.entries(issues).forEach(([issueId, parties]) => {
            partyLines[issueId] = {};
            Object.entries(parties).forEach(([party, votes]) => {
                let maxVote = 'Avstår';
                let maxCount = -1;
                Object.entries(votes).forEach(([rost, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        maxVote = rost;
                    }
                });
                partyLines[issueId][party] = maxVote;
            });
        });

        // Now compare selectedParty against everyone else
        const comparisonCounts = {};
        PARTIES.forEach(p => {
            if (p !== selectedParty) {
                comparisonCounts[p] = { agreed: 0, total: 0 };
            }
        });

        Object.values(partyLines).forEach(issue => {
            const baseLine = issue[selectedParty];
            if (!baseLine) return; // Selected party didn't have a clear line or didn't vote

            PARTIES.forEach(p => {
                if (p === selectedParty) return;
                const otherLine = issue[p];
                if (otherLine) {
                    comparisonCounts[p].total++;
                    if (baseLine === otherLine) {
                        comparisonCounts[p].agreed++;
                    }
                }
            });
        });

        const results = Object.entries(comparisonCounts).map(([party, stats]) => {
            return {
                name: party,
                agreed: stats.total > 0 ? (stats.agreed / stats.total) * 100 : 0,
                total: stats.total
            };
        }).sort((a, b) => b.agreed - a.agreed);

        return results;

    }, [voteData, selectedParty]);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity /> Hur ofta röstar de lika?
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                    Ett verktyg för att jämföra partiernas politik i praktiken. Om du väljer till exempel Moderaterna (M) som utgångspunkt (ditt basparti), beräknar systemet hur stor procent av alla voteringar under året som övriga partier har röstat på <u>exakt samma förslag</u> (Ja, Nej eller Avstår). Därmed ser du snabbt vilka partier som politiskt överlappar varandra mest.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Riksmöte</h4>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
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

                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Basparti</h4>
                        <select
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem',
                                background: 'transparent', color: 'white',
                                border: '1px solid var(--glass-border)',
                                fontFamily: 'inherit', fontSize: '1rem'
                            }}
                        >
                            {PARTIES.map(p => (
                                <option key={p} value={p} style={{ color: 'black' }}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>
                        {loading ? 'Analyserar tusentals röster...' : 'Kör Analys'}
                    </button>
                </div>
            </div>

            {similarityScores.length > 0 && (
                <div className="glass-panel col-span-12">
                    <h3 style={{ marginBottom: '1rem' }}>Så ofta röstade partierna likadant som {selectedParty}</h3>
                    <div style={{ width: '100%', height: '400px' }}>
                        <ResponsiveContainer>
                            <BarChart data={similarityScores} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" tickFormatter={(val) => `${val}%`} />
                                <YAxis dataKey="name" type="category" stroke="white" width={50} fontSize={16} fontWeight="bold" />
                                <Tooltip
                                    formatter={(value) => [`${value.toFixed(1)}%`, 'Av voteringarna']}
                                    cursor={{ fill: 'var(--glass-highlight)' }}
                                    contentStyle={{ background: 'var(--bg-darker)', border: '1px solid var(--glass-border)', color: 'white' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <ReferenceLine x={50} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                <Bar dataKey="agreed" radius={[0, 4, 4, 0]} barSize={32}>
                                    {similarityScores.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getPartyColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimilarityIndex;
