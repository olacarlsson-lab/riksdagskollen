import React, { useState, useEffect } from 'react';
import { getPartyColor, fetchMemberActivity } from './api';
import { Search, Users, ChevronLeft, MapPin, Calendar, FileText, MessageSquare, Mic, Briefcase, ExternalLink, Activity, ArrowRight } from 'lucide-react';

const MemberDetail = ({ m, onBack, votes = [], onNavigateToCommittee }) => {
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoadingStats(true);
        fetchMemberActivity(m.intressent_id).then(data => {
            if (isMounted) {
                setStats(data);
                setLoadingStats(false);
            }
        });
        return () => { isMounted = false; };
    }, [m.intressent_id]);

    const imageUrl = m.bild_url_192 || m.bild_url_80;
    const currentYear = new Date().getFullYear();
    const age = m.fodd_ar ? currentYear - parseInt(m.fodd_ar, 10) : 'Okänd';

    // Calculate Presence
    const memberVotes = votes.filter(v => v.intressent_id === m.intressent_id);
    const totalVotes = memberVotes.length;
    const absentVotes = memberVotes.filter(v => v.rost === 'Frånvarande').length;
    const presencePercent = totalVotes > 0 ? (((totalVotes - absentVotes) / totalVotes) * 100).toFixed(1) : 0;

    // Parse committee assignments
    const uppdrag = m.personuppdrag?.uppdrag || [];
    const activeAssignments = uppdrag.filter(u => (!u.tom || new Date(u.tom) > new Date()) && u.typ === "uppdrag" && (u.roll_kod?.includes("utskott") || u.uppgift?.[0]?.includes("utskott")));

    const renderExternalLink = (type) => {
        return `https://www.riksdagen.se/sv/dokument-och-lagar/?debattdag=&dokumenttyp=${type}&dokstat=ansvarsomrade=&inlamnaddatum=&inlamnadrost=&ledamot=${m.intressent_id}&org=&parti=&rm=2024%2F25&sok=`;
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <button
                className="btn btn-ghost"
                onClick={onBack}
                style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ChevronLeft size={20} /> Tillbaka till listan
            </button>

            <div className="glass-panel" style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', position: 'relative', marginBottom: '2rem' }}>
                <div style={{ width: '8px', height: '100%', position: 'absolute', left: 0, top: 0, background: getPartyColor(m.parti), borderTopLeftRadius: 'var(--radius-md)', borderBottomLeftRadius: 'var(--radius-md)' }}></div>

                <img src={imageUrl} alt={m.sorteringsnamn} style={{ width: '240px', height: '320px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginLeft: '1rem' }} />

                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div className="party-tag" style={{ background: getPartyColor(m.parti), display: 'inline-flex', marginBottom: '1rem' }}>
                        {m.parti === '-' ? 'Vilde' : m.parti}
                    </div>
                    <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>{m.tilltalsnamn} {m.efternamn}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2rem' }}>{m.status}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-sm)' }}>
                        <div><h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><MapPin size={18} /> Valkrets</h4><p style={{ fontSize: '1.1rem', margin: 0 }}>{m.valkrets}</p></div>
                        <div><h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><Calendar size={18} /> Ålder</h4><p style={{ fontSize: '1.1rem', margin: 0 }}>{age} år (född {m.fodd_ar})</p></div>
                        <div>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                <Activity size={18} /> Voteringsnärvaro
                            </h4>
                            <p style={{ fontSize: '1.1rem', margin: 0 }}>{totalVotes > 0 ? `${presencePercent}%` : 'Ingen data'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-dashboard">
                <div className="glass-panel col-span-6" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><FileText /> Aktivitet (2024/25)</h3>
                    {loadingStats ? <p style={{ color: 'var(--text-muted)' }}>Laddar statistik...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                            <div>
                                <h4 style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}><span>Inlämnade motioner</span> <span style={{ color: 'white' }}>{stats.motCount} st</span></h4>
                                {stats.recentMotions.slice(0, 5).map((mot, i) => (
                                    <a href={mot.dokument_url_html || renderExternalLink('mot')} target="_blank" rel="noreferrer" key={i} className="hover-bg-highlight" style={{ display: 'block', textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.9rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid transparent', transition: 'border 0.2s' }}>
                                        {mot.titel} <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle', color: 'var(--text-muted)' }} />
                                    </a>
                                ))}
                                <a href={renderExternalLink('mot')} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-secondary)', marginTop: '0.75rem', textDecoration: 'none' }}>Visa alla inlämnade motioner hos Riksdagen <ExternalLink size={14} /></a>
                            </div>

                            <div>
                                <h4 style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MessageSquare size={16} /> Frågor & Interpellationer</span> <span style={{ color: 'white' }}>{stats.qCount} st</span></h4>
                                <a href={renderExternalLink('fr')} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-secondary)', marginTop: '0.5rem', textDecoration: 'none' }}>Visa ställda frågor <ExternalLink size={14} /></a>
                            </div>

                            <div>
                                <h4 style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mic size={16} /> Hållna anföranden</span> <span style={{ color: 'white' }}>{stats.speechCount} st</span></h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gäller antalet registrerade taltillfällen i kammaren.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-panel col-span-6" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><Briefcase /> Politiska Uppdrag</h3>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
                        {activeAssignments.length > 0 ? activeAssignments.map((u, idx) => {
                            const isClickable = onNavigateToCommittee && u.organ_kod;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => isClickable && onNavigateToCommittee(u.organ_kod)}
                                    style={{
                                        marginBottom: '1rem',
                                        paddingBottom: '1rem',
                                        borderBottom: '1px solid var(--glass-border)',
                                        cursor: isClickable ? 'pointer' : 'default'
                                    }}
                                    className={isClickable ? "hover-bg-highlight" : ""}
                                >
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{u.uppgift[0] || u.organ_kod}</span>
                                        {isClickable && <ArrowRight size={16} color="var(--text-muted)" />}
                                    </h4>
                                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{u.roll_kod}</p>
                                </div>
                            )
                        }) : (
                            <p style={{ color: 'var(--text-muted)' }}>Inga pågående utskottsuppdrag hittades.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MembersList = ({ members, votes, selectedMember, setSelectedMember, onNavigateToCommittee }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (selectedMember) {
        return <MemberDetail m={selectedMember} onBack={() => setSelectedMember(null)} votes={votes} onNavigateToCommittee={onNavigateToCommittee} />;
    }

    const filteredMembers = members.filter(m => {
        const fullName = `${m.fornamn || ''} ${m.efternamn || ''} ${m.sorteringsnamn || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Users /> Riksdagens Ledamöter
                    </h2>

                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Sök på namn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'white',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredMembers.map((m, idx) => (
                    <div
                        key={idx}
                        className="glass-panel"
                        onClick={() => setSelectedMember(m)}
                        style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '4px',
                            height: '100%',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            background: getPartyColor(m.parti),
                            borderTopLeftRadius: 'var(--radius-md)',
                            borderBottomLeftRadius: 'var(--radius-md)'
                        }}></div>

                        <img
                            src={m.bild_url_80}
                            alt={m.sorteringsnamn}
                            style={{
                                width: '64px', height: '80px',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--glass-border)'
                            }}
                        />

                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{m.tilltalsnamn} {m.efternamn}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                                {m.valkrets}
                            </p>
                            <div className="party-tag" style={{ background: 'transparent', color: 'white', width: 'auto', height: 'auto', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.5rem', borderColor: getPartyColor(m.parti) }}>
                                {m.parti === '-' ? 'Vilde' : m.parti}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredMembers.length === 0 && (
                    <div className="col-span-12" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Inga ledamöter hittades för "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
};

export default MembersList;
