import React, { useState, useMemo, useEffect } from 'react';
import { getPartyColor, fetchPartyMotions } from './api';
import { Users, AlertCircle, Bookmark, ExternalLink } from 'lucide-react';

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
        }
    }, [selectedParty]);

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
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

                        {/* Ledamöter list */}
                        <div className="glass-panel">
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users /> Partiets Ledamöter
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
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
