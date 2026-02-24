import React, { useMemo, useState, useEffect } from 'react';
import { getPartyColor, fetchPartyMotions } from './api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import { Users, UserX, Flag, Info, FileText, Zap, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from './Calendar';

const Dashboard = ({ members, votes, onMemberClick, onPartyClick }) => {
    // 0. State for fetching party motions
    const [partyMotions, setPartyMotions] = useState([]);
    const [timePeriod, setTimePeriod] = useState('all');

    // Filter votes by selected time period
    const filteredVotes = useMemo(() => {
        if (timePeriod === 'all' || !votes.length) return votes;

        let latestTimestamp = 0;
        votes.forEach(v => {
            const d = new Date(v.datum || v.systemdatum || 0).getTime();
            if (d > latestTimestamp) latestTimestamp = d;
        });

        const cutoff = new Date(latestTimestamp);
        if (timePeriod === '1m') cutoff.setMonth(cutoff.getMonth() - 1);
        else if (timePeriod === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
        else if (timePeriod === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);

        return votes.filter(v => new Date(v.datum || v.systemdatum || 0) >= cutoff);
    }, [votes, timePeriod]);

    useEffect(() => {
        let isMounted = true;
        fetchPartyMotions(['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP']).then(data => {
            if (isMounted) {
                setPartyMotions(data.sort((a, b) => b.value - a.value));
            }
        });
        return () => { isMounted = false; };
    }, []);

    // Aggregate data using useMemo for performance

    // 1. Members grouped by Party
    const partyStats = useMemo(() => {
        const counts = {};
        members.forEach(m => {
            const p = m.parti || '-';
            counts[p] = (counts[p] || 0) + 1;
        });

        // Convert to array for Recharts
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // sort descending
    }, [members]);

    // 2. Compute "Frånvaro" per member from recent votes
    const absenceStats = useMemo(() => {
        const memberCounts = {};
        filteredVotes.forEach(v => {
            if (!v.intressent_id) return;
            if (!memberCounts[v.intressent_id]) {
                memberCounts[v.intressent_id] = { id: v.intressent_id, total: 0, absent: 0, name: `${v.fornamn} ${v.efternamn} `, parti: v.parti };
            }
            memberCounts[v.intressent_id].total++;
            if (v.rost === 'Frånvarande') {
                memberCounts[v.intressent_id].absent++;
            }
        });

        const ObjectValues = Object.values(memberCounts);
        const results = ObjectValues
            .map(entry => ({
                ...entry,
                percentage: entry.total > 0 ? (entry.absent / entry.total) * 100 : 0
            }))
            .filter(entry => entry.total > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10); // Top 10

        return results;
    }, [filteredVotes]);

    // 3. Compute "Rebeller" (Vem röstar oftast mot sitt eget partis majoritet)
    const rebelStats = useMemo(() => {
        const voteringar = {};
        filteredVotes.forEach(v => {
            if (!v.votering_id) return;
            if (!voteringar[v.votering_id]) voteringar[v.votering_id] = { partyVotes: {}, members: [] };

            voteringar[v.votering_id].members.push(v);

            if (!voteringar[v.votering_id].partyVotes[v.parti]) {
                voteringar[v.votering_id].partyVotes[v.parti] = { 'Ja': 0, 'Nej': 0, 'Avstår': 0 };
            }
            if (v.rost !== 'Frånvarande') {
                voteringar[v.votering_id].partyVotes[v.parti][v.rost] = (voteringar[v.votering_id].partyVotes[v.parti][v.rost] || 0) + 1;
            }
        });

        const partyMajorities = {};
        Object.entries(voteringar).forEach(([vId, data]) => {
            partyMajorities[vId] = {};
            Object.entries(data.partyVotes).forEach(([party, tallies]) => {
                let majRost = null;
                let max = -1;
                Object.entries(tallies).forEach(([rost, count]) => {
                    if (count > max) { max = count; majRost = rost; }
                });
                partyMajorities[vId][party] = majRost;
            });
        });

        let totalValuableVotes = 0;
        let totalRebelVotes = 0;
        const memberRebels = {};
        filteredVotes.forEach(v => {
            if (!v.intressent_id || v.parti === '-' || v.rost === 'Frånvarande') return; // ignore Vilde and absent

            if (!memberRebels[v.intressent_id]) {
                memberRebels[v.intressent_id] = { id: v.intressent_id, name: `${v.fornamn} ${v.efternamn} `, parti: v.parti, total: 0, rebelCount: 0 };
            }
            memberRebels[v.intressent_id].total++;
            totalValuableVotes++;

            const majRost = partyMajorities[v.votering_id]?.[v.parti];
            if (majRost && v.rost !== majRost) {
                memberRebels[v.intressent_id].rebelCount++;
                totalRebelVotes++;
            }
        });

        const avgLoyalty = totalValuableVotes > 0 ? (((totalValuableVotes - totalRebelVotes) / totalValuableVotes) * 100).toFixed(1) : 0;

        const list = Object.values(memberRebels)
            .map(entry => ({ ...entry, percentage: entry.total > 10 ? (entry.rebelCount / entry.total) * 100 : 0 }))
            .filter(entry => entry.rebelCount > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10);

        return { list, avgLoyalty };
    }, [filteredVotes]);

    // Total active members count
    const totalCount = members.length;

    return (
        <div className="dashboard">
            <div className="grid-dashboard">

                {/* Kalender */}
                <div className="glass-panel col-span-12" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarIcon /> Riksdagens Kalendarium
                    </h2>
                    <Calendar />
                </div>

                {/* Mandatfördelning */}
                <div className="glass-panel col-span-12">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Users /> Mandatfördelning i Riksdagen ({totalCount} Ledamöter)
                        </h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>*Klicka på ett parti för detaljer</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={partyStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" tickLine={false} />
                            <Tooltip
                                formatter={(value) => [value, 'Mandat']}
                                cursor={{ fill: 'var(--glass-highlight)' }}
                                contentStyle={{
                                    background: 'var(--bg-dark)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'white'
                                }}
                                itemStyle={{ color: 'white' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(data) => onPartyClick && onPartyClick(data.name)} style={{ cursor: 'pointer' }}>
                                {partyStats.map((entry, index) => (
                                    <Cell key={`cell - ${index} `} fill={getPartyColor(entry.name)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Absence */}
                <div className="glass-panel col-span-6" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <UserX /> Frånvaro
                        </h2>
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                            style={{ background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.2rem 0.5rem', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            <option value="all">Nuvarande RM</option>
                            <option value="1y">Senaste året</option>
                            <option value="3m">Senaste 3 mån</option>
                            <option value="1m">Senaste mån</option>
                        </select>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Baserat på urval av voteringar. Visar högsta andel frånvaro i procent.
                    </p>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {absenceStats.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                                Ingen tillräcklig data att visa just nu.
                            </p>
                        ) : (
                            absenceStats.map((person, idx) => (
                                <div key={idx}
                                    onClick={() => onMemberClick && onMemberClick(person.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem 0', borderBottom: '1px solid var(--glass-border)',
                                        cursor: 'pointer'
                                    }}
                                    className="hover-bg-highlight"
                                >
                                    <div className="party-tag" style={{ background: getPartyColor(person.parti) }}>
                                        {person.parti}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0 }}>{person.name}</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {person.absent} frånvarotillfällen ({person.total} mätvärden)
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--party-s)' }}>
                                        {person.percentage.toFixed(1)}%
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Rebeller */}
                <div className="glass-panel col-span-6" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.5rem' }}>
                                <Zap /> Partirebeller
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                                Ledamöter som oftast röstat emot den egna partilinjen i sakfrågor.
                            </p>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                                Genomsnittlig Partilojalitet
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{rebelStats.avgLoyalty}%</div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {rebelStats.list.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                                Ingen data (eller ingen har gjort revolt).
                            </p>
                        ) : (
                            rebelStats.list.map((person, idx) => (
                                <div key={idx}
                                    onClick={() => onMemberClick && onMemberClick(person.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem 0', borderBottom: '1px solid var(--glass-border)',
                                        cursor: 'pointer'
                                    }}
                                    className="hover-bg-highlight"
                                >
                                    <div className="party-tag" style={{ background: getPartyColor(person.parti) }}>
                                        {person.parti}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0 }}>{person.name}</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {person.rebelCount} avvikelser ({person.total} lagda röster)
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--party-s)' }}>
                                        {person.percentage.toFixed(1)}%
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Party Motions Overview */}
                <div className="glass-panel col-span-12" style={{ minHeight: '400px', marginTop: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText /> Inlämnade Motioner per Parti (Nuvarande Riksmöte)
                    </h2>
                    {partyMotions.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>Hämtar data från Riksdagen...</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={partyMotions} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                                <YAxis stroke="var(--text-muted)" tickLine={false} />
                                <Tooltip
                                    formatter={(value) => [value, 'Motioner']}
                                    cursor={{ fill: 'var(--glass-highlight)' }}
                                    contentStyle={{
                                        background: 'var(--bg-dark)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white'
                                    }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {partyMotions.map((entry, index) => (
                                        <Cell key={`cell - ${index} `} fill={getPartyColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
