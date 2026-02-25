import React, { useMemo, useEffect, useState } from 'react';
import { getPartyColor } from './api';
import { CheckCircle2, XCircle, MinusCircle, ListCollapse, Check } from 'lucide-react';

const VotesList = ({ votes }) => {
    // Group individual votes per "ärende"
    const recentVotes = useMemo(() => {
        if (!votes || !votes.length) return [];
        const vMap = {};

        votes.forEach(v => {
            if (!v.votering_id) return;
            if (!vMap[v.votering_id]) {
                vMap[v.votering_id] = {
                    id: v.votering_id,
                    date: v.systemdatum, // "2024-11-20 16:33:21"
                    bet: v.beteckning,   // "AU10"
                    punkt: v.punkt,      // 1
                    avser: v.avser,      // "sakfrågan"
                    dok_id: v.dok_id,    // "HC01AU10"
                    partyVotes: {},
                    total: { 'Ja': 0, 'Nej': 0, 'Avstår': 0, 'Frånvarande': 0 }
                };
            }

            vMap[v.votering_id].total[v.rost] = (vMap[v.votering_id].total[v.rost] || 0) + 1;

            if (!vMap[v.votering_id].partyVotes[v.parti]) {
                vMap[v.votering_id].partyVotes[v.parti] = { 'Ja': 0, 'Nej': 0, 'Avstår': 0, 'Frånvarande': 0 };
            }
            vMap[v.votering_id].partyVotes[v.parti][v.rost] = (vMap[v.votering_id].partyVotes[v.parti][v.rost] || 0) + 1;
        });

        // Convert to array and sort by latest date
        return Object.values(vMap)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [votes]);

    const [visibleCount, setVisibleCount] = useState(15);
    const [titles, setTitles] = useState({});

    const visibleVotes = useMemo(() => recentVotes.slice(0, visibleCount), [recentVotes, visibleCount]);

    useEffect(() => {
        const fetchTitles = async () => {
            const newTitles = { ...titles };
            let hasNew = false;

            for (const v of visibleVotes) {
                if (!newTitles[v.bet]) {
                    try {
                        const res = await fetch(`https://data.riksdagen.se/dokumentlista/?sok=${v.bet}&rm=2025%2F26&utformat=json`);
                        const data = await res.json();
                        const doc = data.dokumentlista?.dokument?.[0];
                        if (doc) {
                            let summaryRaw = doc.notis || doc.sammanfattning || doc.notisrubrik || '';
                            let summary = summaryRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

                            let utskottsForslagText = '';
                            if (v.dok_id) {
                                try {
                                    const dsRes = await fetch(`https://data.riksdagen.se/dokumentstatus/${v.dok_id}.json`);
                                    const dsData = await dsRes.json();
                                    const puf = dsData.dokumentstatus?.dokutskottsforslag?.utskottsforslag;
                                    if (puf) {
                                        const ufList = Array.isArray(puf) ? puf : [puf];
                                        const targetForslag = ufList.find(f => String(f.punkt) === String(v.punkt));
                                        if (targetForslag && targetForslag.forslag) {
                                            utskottsForslagText = targetForslag.forslag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to fetch utskottsförslag for', v.dok_id);
                                }
                            }

                            if (utskottsForslagText) {
                                summary = `Utskottets förslag: ${utskottsForslagText}\n\n${summary}`;
                            }

                            if (summary.length > 500) summary = summary.substring(0, 497) + '...';

                            newTitles[v.bet] = {
                                titel: doc.titel || '',
                                summary: summary
                            };
                            hasNew = true;
                        }
                    } catch (e) {
                        console.error('Failed to fetch doc info for', v.bet);
                    }
                }
            }

            if (hasNew) setTitles(newTitles);
        };
        if (visibleVotes.length > 0) fetchTitles();
    }, [visibleVotes]);

    const formatRost = (partyCounts) => {
        let maj = 'Avstår';
        let max = -1;
        Object.entries(partyCounts).forEach(([r, c]) => {
            if (r !== 'Frånvarande' && c > max) { max = c; maj = r; }
        });

        let icon = <MinusCircle size={14} color="var(--text-muted)" />;
        if (maj === 'Ja') icon = <CheckCircle2 size={14} color="#10b981" />;
        else if (maj === 'Nej') icon = <XCircle size={14} color="#ef4444" />;

        return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{icon} {maj}</div>;
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ListCollapse /> Senaste Voteringar i Kammaren
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    En detaljerad vy över de allra senaste omröstningarna i Riksdagen,
                    hur rösterna fördelades, och hur respektive partis majoritet valde att ställa sig i just den frågan.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visibleVotes.map((v) => {
                    const passed = v.total['Ja'] > v.total['Nej'];

                    return (
                        <div key={v.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem' }}>
                                        Betänkande {v.bet} (Punkt {v.punkt})
                                        {passed ?
                                            <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}><Check size={14} /> Bifall</span> :
                                            <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}><XCircle size={14} /> Avslag</span>
                                        }
                                    </h3>
                                    {titles[v.bet] && (titles[v.bet].titel || typeof titles[v.bet] === 'string') && (
                                        <div style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                            "{typeof titles[v.bet] === 'string' ? titles[v.bet] : titles[v.bet].titel}"
                                        </div>
                                    )}
                                    {titles[v.bet] && titles[v.bet].summary && (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: '1.5', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--glass-border)', whiteSpace: 'pre-line' }}>
                                            {titles[v.bet].summary}
                                        </div>
                                    )}
                                    <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                        Avser: {v.avser} | {v.date ? v.date.split(' ')[0] : ''}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'center' }}><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.5rem' }}>{v.total['Ja']}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ja</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.5rem' }}>{v.total['Nej']}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nej</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '1.5rem' }}>{v.total['Avstår']}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avstår</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ color: '#64748b', fontWeight: 'bold', fontSize: '1.5rem' }}>{v.total['Frånvarande']}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Frånvarande</div></div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Partiernas majoritetsröst</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP'].map(party => {
                                        if (!v.partyVotes[party]) return null;
                                        return (
                                            <div key={party} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getPartyColor(party) }}></div>
                                                <div style={{ fontWeight: 'bold', width: '2rem' }}>{party}</div>
                                                <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)' }}></div>
                                                <div style={{ fontSize: '0.9rem', minWidth: '70px' }}>{formatRost(v.partyVotes[party])}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {visibleCount < recentVotes.length && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setVisibleCount(c => c + 15)}
                        style={{ padding: '0.75rem 3rem' }}
                    >
                        Visa äldre voteringar
                    </button>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
                        Visar {visibleCount} av {recentVotes.length} inlästa voteringar
                    </p>
                </div>
            )}
        </div>
    );
};

export default VotesList;
