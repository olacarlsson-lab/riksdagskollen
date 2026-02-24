import React, { useState, useMemo, useEffect } from 'react';
import { getPartyColor } from './api';
import { Users, Activity, Briefcase } from 'lucide-react';

const Committees = ({ members, votes, onMemberClick, initialCommitteeCode }) => {
    // 1. Group active assignments by committee
    const committees = useMemo(() => {
        const commMap = {};

        members.forEach(m => {
            const uppdrag = m.personuppdrag?.uppdrag || [];
            const activeUtskott = uppdrag.filter(u => {
                const isCurrent = !u.tom || new Date(u.tom) >= new Date();
                const isUtskott = u.typ === "uppdrag" && (u.roll_kod?.toLowerCase().includes("utskott") || (u.uppgift && u.uppgift[0]?.toLowerCase().includes("utskott")));
                return isCurrent && isUtskott;
            });

            activeUtskott.forEach(u => {
                // Determine name and code
                let name = u.uppgift && u.uppgift[0] ? u.uppgift[0] : u.organ_kod;
                if (!name) return;

                // standarize name slightly if it's missing the word utskott somehow, but Riksdagen data is usually fine
                if (!commMap[name]) {
                    commMap[name] = { name: name, code: u.organ_kod, members: [] };
                }

                // Avoid adding the same person multiple times if they have multiple roles in the same committee
                if (!commMap[name].members.find(x => x.member.intressent_id === m.intressent_id)) {
                    commMap[name].members.push({
                        member: m,
                        role: u.roll_kod
                    });
                }
            });
        });

        return Object.values(commMap).sort((a, b) => a.name.localeCompare(b.name));
    }, [members]);

    const [selectedComm, setSelectedComm] = useState(committees[0] || null);

    useEffect(() => {
        if (initialCommitteeCode && committees.length > 0) {
            const found = committees.find(c => c.code === initialCommitteeCode);
            if (found) {
                setSelectedComm(found);
            }
        }
    }, [initialCommitteeCode, committees]);

    // Compute stats for selected committee
    const commStats = useMemo(() => {
        if (!selectedComm) return null;
        const memberIds = selectedComm.members.map(x => x.member.intressent_id);
        const commVotes = votes.filter(v => memberIds.includes(v.intressent_id));
        const total = commVotes.length;
        const absent = commVotes.filter(v => v.rost === 'Frånvarande').length;
        const presence = total > 0 ? (((total - absent) / total) * 100).toFixed(1) : 0;

        return { total, absent, presence };
    }, [selectedComm, votes]);

    const sortOrder = {
        "Ordförande": 1,
        "1:e vice ordförande": 2,
        "2:e vice ordförande": 3,
        "3:e vice ordförande": 4,
        "Vice ordförande": 5,
        "Ledamot": 6,
        "Suppleant": 7,
        "Extra suppleant": 8
    };

    return (
        <div className="committee-layout">
            {/* Committee List (Sidebar) */}
            <div className="glass-panel committee-sidebar">
                <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase /> Utskott</h2>

                <div className="mobile-only" style={{ marginBottom: '1rem' }}>
                    <select
                        className="search-input"
                        value={selectedComm?.code || ''}
                        onChange={(e) => {
                            const found = committees.find(c => c.code === e.target.value);
                            if (found) setSelectedComm(found);
                        }}
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                    >
                        <option value="" disabled>Välj ett utskott...</option>
                        {committees.map((c, i) => (
                            <option key={i} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                    {committees.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Laddar utskott...</p>}
                    {committees.map((c, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedComm(c)}
                            style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                background: selectedComm?.name === c.name ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: '1px solid',
                                borderColor: selectedComm?.name === c.name ? 'white' : 'transparent',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: '0.2s ease',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem'
                            }}
                            onMouseOver={e => {
                                if (selectedComm?.name !== c.name) {
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }
                            }}
                            onMouseOut={e => {
                                if (selectedComm?.name !== c.name) {
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <span style={{ fontWeight: selectedComm?.name === c.name ? 'bold' : 'normal' }}>{c.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Committee Details */}
            <div className="committee-content">
                {selectedComm ? (
                    <>
                        <div className="glass-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                                <div style={{ flex: '1 1 250px' }}>
                                    <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', lineHeight: '1.1' }}>{selectedComm.name}</h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: 0 }}>Riksdagsorgan ({selectedComm.code})</p>
                                    <p style={{ color: 'var(--text-muted)' }}>{selectedComm.members.length} verksamma ledamöter</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', flex: '1 1 auto', minWidth: '160px', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Activity size={16} /> Närvaro i kammaren
                                        </div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{commStats?.total > 0 ? `${commStats.presence}%` : '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel">
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users /> Medlemmar</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
                                {selectedComm.members
                                    .sort((a, b) => (sortOrder[a.role] || 99) - (sortOrder[b.role] || 99))
                                    .map((mInfo, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => onMemberClick && onMemberClick(mInfo.member.intressent_id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                background: 'rgba(255,255,255,0.05)', padding: '1rem',
                                                borderRadius: '8px', cursor: 'pointer',
                                                border: '1px solid transparent',
                                                transition: '0.2s ease'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = 'white'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                                        >
                                            <img src={mInfo.member.bild_url_80} alt={mInfo.member.sorteringsnamn} style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{mInfo.member.tilltalsnamn} {mInfo.member.efternamn}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{mInfo.role}</div>
                                            </div>
                                            <div className="party-tag" style={{ background: getPartyColor(mInfo.member.parti), width: '32px', height: '32px', fontSize: '0.8rem', border: 'none', padding: 0 }}>
                                                {mInfo.member.parti}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        Välj ett utskott i listan till vänster för att se detaljer.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Committees;
