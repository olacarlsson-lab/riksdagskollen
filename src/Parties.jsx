import React, { useState, useMemo, useEffect } from 'react';
import { getPartyColor, fetchPartyMotions } from './api';
import { Users, AlertCircle, Bookmark, ExternalLink, Activity, Info, TrendingUp, Zap } from 'lucide-react';

const Parties = ({ members, votes, onMemberClick, initialParty }) => {
    const parties = useMemo(() => {
        const pMap = {};
        members.forEach(m => {
            const p = m.parti || '-';
            if (!pMap[p]) {
                pMap[p] = { name: p, members: [] };
            }
            pMap[p].members.push(m);
        });

        // Sorting by size (mandates)
        return Object.values(pMap).sort((a, b) => b.members.length - a.members.length);
    }, [members]);

    const [selectedParty, setSelectedParty] = useState(parties[0] || null);
    const [motionCount, setMotionCount] = useState(null);
    const [trendingWords, setTrendingWords] = useState([]);
    const [partyStats, setPartyStats] = useState({ presence: 0, loyalty: 0, womenPct: 0, avgAge: 0 });

    useEffect(() => {
        if (initialParty && parties.length > 0) {
            const found = parties.find(p => p.name === initialParty);
            if (found) {
                setSelectedParty(found);
            }
        }
    }, [initialParty, parties]);

    useEffect(() => {
        if (selectedParty && selectedParty.name !== '-') {
            setMotionCount(null);
            fetchPartyMotions([selectedParty.name]).then(data => {
                if (data && data.length > 0) {
                    setMotionCount(data[0].value);
                }
            });

            // Fetch trending words for the party
            const fetchTrendingForParty = async () => {
                try {
                    const res = await fetch(`https://data.riksdagen.se/dokumentlista/?rm=2024%2F25&sz=100&parti=${selectedParty.name}&utformat=json`);
                    const data = await res.json();
                    if (data?.dokumentlista?.dokument) {
                        const docs = Array.isArray(data.dokumentlista.dokument) ? data.dokumentlista.dokument : [data.dokumentlista.dokument];
                        const words = {};
                        const stopwords = ['och', 'att', 'med', 'för', 'som', 'till', 'har', 'den', 'det', 'inte', 'ska', 'kan', 'eller', 'samt', 'från', 'blir', 'skulle', 'om', 'på', 'av', 'vid', 'inom', 'under', 'mot', 'över', 'mellan', 'genom', 'vilka', 'vilket', 'sådan', 'sådant', 'efter', 'även', 'bör', 'säkerställa', 'införa', 'verka', 'ge', 'få', 'vara', 'fler'];

                        docs.forEach(doc => {
                            const title = (doc.titel || "").toLowerCase().replace(/[^\wåäö]/g, ' ');
                            title.split(/\s+/).forEach(w => {
                                if (w.length > 4 && !stopwords.includes(w) && !parseInt(w) && w !== "beslut") {
                                    words[w] = (words[w] || 0) + 1;
                                }
                            });
                        });

                        const top = Object.entries(words)
                            .filter(([w, count]) => count > 1)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(x => x[0].charAt(0).toUpperCase() + x[0].slice(1));
                        setTrendingWords(top);
                    } else {
                        setTrendingWords([]);
                    }
                } catch (e) {
                    setTrendingWords([]);
                }
            };
            fetchTrendingForParty();

            // Calculate demographics
            const currentYear = new Date().getFullYear();
            let totalAge = 0;
            let womenCount = 0;
            selectedParty.members.forEach(m => {
                totalAge += (currentYear - parseInt(m.fodd_ar || currentYear));
                if (m.kon === 'kvinna') womenCount++;
            });
            const avgAge = selectedParty.members.length ? Math.round(totalAge / selectedParty.members.length) : 0;
            const womenPct = selectedParty.members.length ? Math.round((womenCount / selectedParty.members.length) * 100) : 0;

            // Calculate Voting Profile
            let totalVotes = 0;
            let absentVotes = 0;
            const partyVotings = {};

            votes.forEach(v => {
                if (v.parti === selectedParty.name) {
                    totalVotes++;
                    if (v.rost === 'Frånvarande') {
                        absentVotes++;
                    } else {
                        if (!partyVotings[v.votering_id]) partyVotings[v.votering_id] = { 'Ja': 0, 'Nej': 0, 'Avstår': 0 };
                        partyVotings[v.votering_id][v.rost] = (partyVotings[v.votering_id][v.rost] || 0) + 1;
                    }
                }
            });

            const presence = totalVotes > 0 ? (((totalVotes - absentVotes) / totalVotes) * 100).toFixed(1) : 0;

            let totalValuable = 0;
            let totalRebel = 0;
            const majPerVote = {};
            Object.entries(partyVotings).forEach(([vId, tallies]) => {
                let maj = null;
                let max = -1;
                Object.entries(tallies).forEach(([rost, count]) => {
                    if (count > max) { max = count; maj = rost; }
                });
                majPerVote[vId] = maj;
            });

            votes.forEach(v => {
                if (v.parti === selectedParty.name && v.rost !== 'Frånvarande') {
                    totalValuable++;
                    if (majPerVote[v.votering_id] && v.rost !== majPerVote[v.votering_id]) {
                        totalRebel++;
                    }
                }
            });

            const loyalty = totalValuable > 0 ? (((totalValuable - totalRebel) / totalValuable) * 100).toFixed(1) : 0;

            setPartyStats({ presence, loyalty, womenPct, avgAge });
        }
    }, [selectedParty, votes]);

    // Format party names fully if possible
    const partyFullNames = {
        'S': 'Socialdemokraterna',
        'M': 'Moderaterna',
        'SD': 'Sverigedemokraterna',
        'C': 'Centerpartiet',
        'V': 'Vänsterpartiet',
        'KD': 'Kristdemokraterna',
        'L': 'Liberalerna',
        'MP': 'Miljöpartiet',
        '-': 'Partilösa / Vildar'
    };

    return (
        <div className="committee-layout">
            {/* Sidebar */}
            <div className="glass-panel committee-sidebar">
                <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bookmark /> Riksdagspartier</h2>

                <div className="mobile-only" style={{ marginBottom: '1rem' }}>
                    <select
                        className="search-input"
                        value={selectedParty?.name || ''}
                        onChange={(e) => {
                            const found = parties.find(p => p.name === e.target.value);
                            if (found) setSelectedParty(found);
                        }}
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                    >
                        <option value="" disabled>Välj ett parti...</option>
                        {parties.map((p, i) => (
                            <option key={i} value={p.name}>{partyFullNames[p.name] || p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                    {parties.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedParty(p)}
                            style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                background: selectedParty?.name === p.name ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: '1px solid',
                                borderColor: selectedParty?.name === p.name ? getPartyColor(p.name) : 'transparent',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: '0.2s ease',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}
                            className="hover-bg-highlight"
                        >
                            <span style={{ fontWeight: selectedParty?.name === p.name ? 'bold' : 'normal' }}>
                                {partyFullNames[p.name] || p.name}
                            </span>
                            <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>{p.members.length} mandat</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content View */}
            <div className="committee-content">
                {selectedParty ? (
                    <>
                        {/* Header Stats */}
                        <div className="glass-panel" style={{ borderTop: `4px solid ${getPartyColor(selectedParty.name)}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div className="party-tag" style={{ background: getPartyColor(selectedParty.name), marginBottom: '1rem' }}>
                                        {selectedParty.name}
                                    </div>
                                    <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>
                                        {partyFullNames[selectedParty.name] || selectedParty.name}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: 0 }}>
                                        {selectedParty.members.length} ledamöter i nuvarande riksdag
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {motionCount !== null && (
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center', minWidth: '120px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                Motioner 2024/25
                                            </div>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{motionCount}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            {/* Demografi */}
                            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                    <Users size={20} /> Demografi & Ålder
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Könsfördelning</span>
                                    <span style={{ fontWeight: 'bold' }}>{partyStats.womenPct}% Kvinnor / {100 - partyStats.womenPct}% Män</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem', display: 'flex' }}>
                                    <div style={{ width: `${partyStats.womenPct}%`, background: 'var(--party-v)' }}></div>
                                    <div style={{ width: `${100 - partyStats.womenPct}%`, background: 'var(--party-m)' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Genomsnittsålder</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{partyStats.avgAge} år</span>
                                </div>
                            </div>

                            {/* Röstprofil & Lojalitet */}
                            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                    <Zap size={20} /> Röstprofil & Lojalitet
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Partilojalitet i sakfrågor</span>
                                    <span style={{ fontWeight: 'bold', color: partyStats.loyalty > 95 ? '#10b981' : (partyStats.loyalty > 90 ? 'var(--accent-primary)' : 'var(--party-s)') }}>
                                        {partyStats.loyalty}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Närvaro i kammaren</span>
                                    <span style={{ fontWeight: 'bold' }}>{partyStats.presence}%</span>
                                </div>
                            </div>

                            {/* Trendord */}
                            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                    <TrendingUp size={20} /> Aktuella Trendord
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Baserat på de 100 senaste motionerna</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {trendingWords.length > 0 ? trendingWords.map((word, i) => (
                                        <div key={i} className="party-tag" style={{ background: 'transparent', color: 'white', width: 'auto', height: 'auto', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', borderColor: getPartyColor(selectedParty.name) }}>
                                            {word}
                                        </div>
                                    )) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laddar ord...</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ledamöter list */}
                        <div className="glass-panel">
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users /> Partiets Ledamöter
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
                                {selectedParty.members
                                    .sort((a, b) => a.efternamn.localeCompare(b.efternamn))
                                    .map((m, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => onMemberClick && onMemberClick(m.intressent_id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                background: 'rgba(255,255,255,0.05)', padding: '0.75rem',
                                                borderRadius: '8px', cursor: 'pointer',
                                                border: '1px solid transparent',
                                                transition: '0.2s ease'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = 'white'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                                        >
                                            <img src={m.bild_url_80} alt={m.sorteringsnamn} style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{m.tilltalsnamn} {m.efternamn}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.valkrets}</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        Välj ett parti
                    </div>
                )}
            </div>
        </div>
    );
};

export default Parties;
