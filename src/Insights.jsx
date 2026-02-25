import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, Legend, ReferenceLine
} from 'recharts';
import { getPartyColor } from './api';

const BASE_URL = 'https://data.riksdagen.se';
const localCache = new Map();

async function fetchJSON(url) {
    if (localCache.has(url)) return localCache.get(url);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    localCache.set(url, data);
    return data;
}

const PARTIES = ['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP'];
const PERIODS = [
    { label: '2025/26', value: '2025%2F26' },
    { label: '2024/25', value: '2024%2F25' },
    { label: '2023/24', value: '2023%2F24' },
    { label: '2022/23', value: '2022%2F23' },
];

const SW_STOPWORDS = new Set([
    'och', 'att', 'det', 'en', 'av', 'i', 'för', 'på', 'med', 'om', 'till',
    'är', 'som', 'inte', 'den', 'vi', 'har', 'ett', 'de', 'kan', 'ska', 'sig',
    'men', 'eller', 'han', 'hon', 'var', 'från', 'se', 'mot', 'vid', 'bli',
    'under', 'ut', 'efter', 'upp', 'dem', 'man', 'nu', 'hur', 'när', 'vad',
    'bör', 'även', 'alla', 'sverige', 'riksdag', 'riksdagen', 'genom', 'samt',
    'kring', 'inom', 'dess', 'dessa', 'detta', 'denna', 'sina', 'sin', 'hans',
    'hennes', 'deras', 'varje', 'andra', 'mer', 'mest', 'ny', 'nya', 'god',
    'goda', 'vidare', 'a', 'b', 'c', 'svar', 'fråga', 'motion', 'ledamot',
    'ledamöter', 'interpellation', 'ärende', 'ang', 'dels', 'dock', 'dock',
    'resp', 'etc', 'hos', 'vid', 'per', 'dels', 'dels', 'dels', 'dels',
]);

function extractKeywords(titles) {
    const counts = {};
    titles.forEach(title => {
        if (!title) return;
        title.toLowerCase()
            .replace(/[^a-zåäö\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !SW_STOPWORDS.has(w))
            .forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));
}

function computePartyLoyalty(votes) {
    if (!votes || votes.length === 0) return 0;
    const issues = {};
    votes.forEach(v => {
        if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
        if (!issues[v.votering_id]) issues[v.votering_id] = {};
        if (!issues[v.votering_id][v.parti]) issues[v.votering_id][v.parti] = { Ja: 0, Nej: 0, Avstår: 0 };
        if (issues[v.votering_id][v.parti][v.rost] !== undefined) {
            issues[v.votering_id][v.parti][v.rost]++;
        }
    });
    const majorities = {};
    Object.entries(issues).forEach(([vid, parties]) => {
        majorities[vid] = {};
        Object.entries(parties).forEach(([p, t]) => {
            const max = Math.max(t.Ja, t.Nej, t.Avstår);
            majorities[vid][p] = t.Ja === max ? 'Ja' : t.Nej === max ? 'Nej' : 'Avstår';
        });
    });
    let total = 0, loyal = 0;
    votes.forEach(v => {
        if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
        const maj = majorities[v.votering_id]?.[v.parti];
        if (maj) { total++; if (v.rost === maj) loyal++; }
    });
    return total > 0 ? ((loyal / total) * 100).toFixed(1) : 0;
}

const tooltipStyle = {
    contentStyle: { background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white' },
    itemStyle: { color: 'white' },
    cursor: { fill: 'var(--glass-highlight)' },
};

// ─────────────────────────────────────────────────────────────
// TAB 1: Politiskt Fingeravtryck
// ─────────────────────────────────────────────────────────────
const FingerprintTab = ({ members }) => {
    const [selectedId, setSelectedId] = useState('');
    const [motions, setMotions] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const url = `${BASE_URL}/dokumentlista/?iid=${selectedId}&doktyp=mot&rm=2025%2F26&sz=100&utformat=json`;
            const data = await fetchJSON(url);
            const docs = data.dokumentlista?.dokument || [];
            setMotions(Array.isArray(docs) ? docs : [docs]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const keywords = useMemo(() => extractKeywords(motions.map(m => m.titel)), [motions]);
    const selectedMember = members.find(m => m.intressent_id === selectedId);
    const sortedMembers = useMemo(
        () => [...members].sort((a, b) => (a.sorteringsnamn || '').localeCompare(b.sorteringsnamn || '', 'sv')),
        [members]
    );

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Välj en ledamot för att se vilka ämnesord som förekommer mest i deras motioner — ett politiskt fingeravtryck baserat på faktisk aktivitet snarare än partiprogram.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    style={{ flex: '1 1 300px', padding: '0.75rem', background: 'transparent', color: 'white', border: '1px solid var(--glass-border)', fontFamily: 'inherit', fontSize: '1rem' }}
                >
                    <option value="">-- Välj ledamot --</option>
                    {sortedMembers.map(m => (
                        <option key={m.intressent_id} value={m.intressent_id} style={{ color: 'black' }}>
                            {m.tilltalsnamn} {m.efternamn} ({m.parti})
                        </option>
                    ))}
                </select>
                <button className="btn btn-primary" onClick={handleFetch} disabled={!selectedId || loading}>
                    {loading ? 'Analyserar...' : 'Analysera'}
                </button>
            </div>

            {keywords.length > 0 && (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '0.5rem' }}>
                        Toppord: {selectedMember?.tilltalsnamn} {selectedMember?.efternamn}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Baserat på {motions.length} motioner under riksmötet 2025/26
                    </p>
                    <ResponsiveContainer width="100%" height={420}>
                        <BarChart data={keywords} layout="vertical" margin={{ left: 90, right: 40, top: 10, bottom: 10 }}>
                            <XAxis type="number" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis dataKey="word" type="category" stroke="white" width={90} fontSize={13} tickLine={false} />
                            <Tooltip
                                formatter={v => [v, 'förekomster']}
                                {...tooltipStyle}
                            />
                            <Bar dataKey="count" fill={getPartyColor(selectedMember?.parti || '-')} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!loading && selectedId && keywords.length === 0 && motions.length > 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Inga tydliga ämnesord hittades i motionerna.
                </div>
            )}
            {!loading && selectedId && motions.length === 0 && keywords.length === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Inga motioner hittades för denna ledamot under 2025/26.
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 2: Koalitioner per Sakfråga
// ─────────────────────────────────────────────────────────────
const CoalitionTab = ({ votes }) => {
    const [keyword, setKeyword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParty, setSelectedParty] = useState('S');

    const filteredVotes = useMemo(() => {
        if (!searchTerm || !votes.length) return [];
        const term = searchTerm.toLowerCase();
        return votes.filter(v =>
            (v.beteckning || '').toLowerCase().includes(term) ||
            (v.rubrik || '').toLowerCase().includes(term)
        );
    }, [votes, searchTerm]);

    const matchCount = useMemo(() => new Set(filteredVotes.map(v => v.votering_id)).size, [filteredVotes]);

    const similarityScores = useMemo(() => {
        if (filteredVotes.length === 0) return [];
        const issues = {};
        filteredVotes.forEach(v => {
            if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
            if (!issues[v.votering_id]) issues[v.votering_id] = {};
            if (!issues[v.votering_id][v.parti]) issues[v.votering_id][v.parti] = { Ja: 0, Nej: 0, Avstår: 0 };
            if (issues[v.votering_id][v.parti][v.rost] !== undefined) {
                issues[v.votering_id][v.parti][v.rost]++;
            }
        });
        const partyLines = {};
        Object.entries(issues).forEach(([vid, parties]) => {
            partyLines[vid] = {};
            Object.entries(parties).forEach(([p, t]) => {
                const max = Math.max(t.Ja, t.Nej, t.Avstår);
                partyLines[vid][p] = t.Ja === max ? 'Ja' : t.Nej === max ? 'Nej' : 'Avstår';
            });
        });
        const counts = {};
        PARTIES.forEach(p => { if (p !== selectedParty) counts[p] = { agreed: 0, total: 0 }; });
        Object.values(partyLines).forEach(issue => {
            const base = issue[selectedParty];
            if (!base) return;
            PARTIES.forEach(p => {
                if (p === selectedParty || !counts[p]) return;
                const other = issue[p];
                if (other) { counts[p].total++; if (base === other) counts[p].agreed++; }
            });
        });
        return Object.entries(counts)
            .map(([name, s]) => ({ name, agreed: s.total > 0 ? (s.agreed / s.total) * 100 : 0, total: s.total }))
            .sort((a, b) => b.agreed - a.agreed);
    }, [filteredVotes, selectedParty]);

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Filtrera röstningsdata på ett ämnesord (t.ex. "klimat", "skatt", "vård") och se vilka partier som tenderar att rösta lika i just den sakfrågan — till skillnad från det övergripande likhetsindexet.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setSearchTerm(keyword)}
                    placeholder="Sök i beteckning (t.ex. klimat, skola, migration…)"
                    style={{ flex: '1 1 300px', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', fontFamily: 'inherit', fontSize: '1rem' }}
                />
                <select
                    value={selectedParty}
                    onChange={e => setSelectedParty(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', fontFamily: 'inherit', fontSize: '1rem' }}
                >
                    {PARTIES.map(p => <option key={p} value={p} style={{ color: 'black' }}>{p} (basparti)</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => setSearchTerm(keyword)} disabled={!keyword}>Sök</button>
            </div>

            {searchTerm && (
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Hittade <strong style={{ color: 'white' }}>{matchCount} voteringar</strong> som matchar "{searchTerm}"
                </p>
            )}

            {similarityScores.length > 0 && (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Hur ofta röstade partierna som {selectedParty} i frågor om "{searchTerm}"</h3>
                    <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={similarityScores} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" tickFormatter={v => `${v}%`} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="white" width={50} fontSize={16} fontWeight="bold" tickLine={false} />
                            <Tooltip
                                formatter={(v, _n, p) => [`${v.toFixed(1)}% (${p.payload.total} voteringar)`, 'Överlapp']}
                                {...tooltipStyle}
                            />
                            <ReferenceLine x={50} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                            <Bar dataKey="agreed" radius={[0, 4, 4, 0]} barSize={32}>
                                {similarityScores.map((e, i) => <Cell key={i} fill={getPartyColor(e.name)} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {searchTerm && similarityScores.length === 0 && matchCount === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Inga voteringar hittades för "{searchTerm}" i aktuell data. Prova ett annat ord.
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 3: Säsongsmönster
// ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

const SeasonalityTab = () => {
    const [doctype, setDoctype] = useState('mot');
    const [rm, setRm] = useState('2025%2F26');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const url = `${BASE_URL}/dokumentlista/?doktyp=${doctype}&rm=${rm}&sz=5000&utformat=json`;
            const resp = await fetchJSON(url);
            const docs = resp.dokumentlista?.dokument || [];
            const list = Array.isArray(docs) ? docs : [docs];
            setTotal(parseInt(resp.dokumentlista?.['@traffar'] || '0', 10));
            const counts = {};
            list.forEach(d => {
                if (!d.datum) return;
                const month = new Date(d.datum).getMonth();
                counts[month] = (counts[month] || 0) + 1;
            });
            const maxCount = Math.max(...Object.values(counts), 1);
            setChartData(MONTH_NAMES.map((name, i) => ({
                name,
                count: counts[i] || 0,
                isPeak: (counts[i] || 0) === maxCount && (counts[i] || 0) > 0,
            })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const doctypeLabel = { mot: 'Motioner', fr: 'Skriftliga frågor', ip: 'Interpellationer', prop: 'Propositioner' };

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Analyserar när under riksmötet dokument lämnas in. Rusar ledamöterna att lämna in motioner i starten av hösten? Har frågor ett mönster kopplat till politiska skeenden?
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <select
                    value={doctype}
                    onChange={e => setDoctype(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', fontFamily: 'inherit' }}
                >
                    <option value="mot" style={{ color: 'black' }}>Motioner</option>
                    <option value="fr" style={{ color: 'black' }}>Skriftliga frågor</option>
                    <option value="ip" style={{ color: 'black' }}>Interpellationer</option>
                    <option value="prop" style={{ color: 'black' }}>Propositioner</option>
                </select>
                <select
                    value={rm}
                    onChange={e => setRm(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', fontFamily: 'inherit' }}
                >
                    {PERIODS.map(p => <option key={p.value} value={p.value} style={{ color: 'black' }}>{p.label}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>
                    {loading ? 'Hämtar…' : 'Analysera'}
                </button>
            </div>

            {chartData.length > 0 && (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '0.5rem' }}>{doctypeLabel[doctype]} per månad</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Totalt {total.toLocaleString('sv')} dokument det riksmötet (visar urval av upp till 5 000)
                    </p>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" tickLine={false} />
                            <Tooltip
                                formatter={v => [v, doctypeLabel[doctype]]}
                                {...tooltipStyle}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {chartData.map((e, i) => (
                                    <Cell key={i} fill={e.isPeak ? '#fadb14' : 'rgba(255,255,255,0.75)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                        Gul stapel = månaden med flest inlämningar.
                    </p>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 4: Veteran vs. Ny Ledamot
// ─────────────────────────────────────────────────────────────
const VeteranTab = ({ members, votes }) => {
    const analysis = useMemo(() => {
        if (!members.length || !votes.length) return null;
        const ELECTION_2022 = '2022-09-12';
        const memberEra = {};
        members.forEach(m => {
            const uppdrag = m.personuppdrag?.uppdrag || [];
            const list = Array.isArray(uppdrag) ? uppdrag : [uppdrag];
            const isVeteran = list.some(u => u.from && u.from < ELECTION_2022);
            memberEra[m.intressent_id] = isVeteran ? 'Veteran' : 'Ny';
        });

        const memberCount = { Ny: 0, Veteran: 0 };
        members.forEach(m => { if (memberEra[m.intressent_id]) memberCount[memberEra[m.intressent_id]]++; });

        const issues = {};
        votes.forEach(v => {
            if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
            if (!issues[v.votering_id]) issues[v.votering_id] = {};
            if (!issues[v.votering_id][v.parti]) issues[v.votering_id][v.parti] = { Ja: 0, Nej: 0, Avstår: 0 };
            if (issues[v.votering_id][v.parti][v.rost] !== undefined) {
                issues[v.votering_id][v.parti][v.rost]++;
            }
        });
        const majorities = {};
        Object.entries(issues).forEach(([vid, parties]) => {
            majorities[vid] = {};
            Object.entries(parties).forEach(([p, t]) => {
                const max = Math.max(t.Ja, t.Nej, t.Avstår);
                majorities[vid][p] = t.Ja === max ? 'Ja' : t.Nej === max ? 'Nej' : 'Avstår';
            });
        });

        const groups = {
            Ny: { total: 0, absent: 0, rebel: 0, rebelTotal: 0 },
            Veteran: { total: 0, absent: 0, rebel: 0, rebelTotal: 0 },
        };
        votes.forEach(v => {
            const era = memberEra[v.intressent_id];
            if (!era || !groups[era]) return;
            groups[era].total++;
            if (v.rost === 'Frånvarande') groups[era].absent++;
            if (v.parti !== '-' && v.rost !== 'Frånvarande') {
                const maj = majorities[v.votering_id]?.[v.parti];
                if (maj) { groups[era].rebelTotal++; if (v.rost !== maj) groups[era].rebel++; }
            }
        });

        return [
            {
                name: 'Ny (vald 2022–)',
                antal: memberCount.Ny,
                franvaro: groups.Ny.total > 0 ? parseFloat((groups.Ny.absent / groups.Ny.total * 100).toFixed(1)) : 0,
                lojalitet: groups.Ny.rebelTotal > 0 ? parseFloat((100 - groups.Ny.rebel / groups.Ny.rebelTotal * 100).toFixed(1)) : 0,
            },
            {
                name: 'Veteran (před 2022)',
                antal: memberCount.Veteran,
                franvaro: groups.Veteran.total > 0 ? parseFloat((groups.Veteran.absent / groups.Veteran.total * 100).toFixed(1)) : 0,
                lojalitet: groups.Veteran.rebelTotal > 0 ? parseFloat((100 - groups.Veteran.rebel / groups.Veteran.rebelTotal * 100).toFixed(1)) : 0,
            },
        ];
    }, [members, votes]);

    if (!analysis) return <p style={{ color: 'var(--text-muted)' }}>Laddar data…</p>;

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Jämför ledamöter valda 2022 eller senare ("Ny") mot dem som hade riksdagsmandat redan före 2022 ("Veteran"). Uppvisar nya ledamöter högre lojalitet för att markera sig? Eller beter de sig annorlunda?
            </p>
            <div className="grid-dashboard">
                {analysis.map((group, i) => (
                    <div key={i} className="glass-panel col-span-6">
                        <h3 style={{ marginBottom: '1.5rem' }}>{group.name}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { label: 'Antal ledamöter', value: group.antal, unit: 'st', color: 'white' },
                                { label: 'Frånvaro', value: `${group.franvaro}%`, color: group.franvaro > 10 ? 'var(--party-s)' : '#10b981' },
                                { label: 'Partilojalitet', value: `${group.lojalitet}%`, color: '#10b981' },
                            ].map(({ label, value, color }) => (
                                <div key={label} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 'bold', marginTop: '0.25rem', color }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="glass-panel col-span-12">
                    <h3 style={{ marginBottom: '1.5rem' }}>Frånvaro & Lojalitet — Jämförelse</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analysis} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} />
                            <Tooltip {...tooltipStyle} formatter={v => `${v}%`} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
                            <Bar dataKey="franvaro" name="Frånvaro %" fill="var(--party-s)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="lojalitet" name="Partilojalitet %" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                        * Partilösa ledamöter ("Vilde") ingår ej i lojalitetsberäkningarna — partilojalitet är inte tillämpbart utan partitillhörighet.
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 5: Genus & Aktivitet
// ─────────────────────────────────────────────────────────────
const GenderTab = ({ members, votes }) => {
    const voteAnalysis = useMemo(() => {
        if (!members.length || !votes.length) return null;
        const memberGender = {};
        members.forEach(m => { if (m.kon) memberGender[m.intressent_id] = m.kon; });

        const issues = {};
        votes.forEach(v => {
            if (!v.votering_id || !v.parti || v.parti === '-' || v.rost === 'Frånvarande') return;
            if (!issues[v.votering_id]) issues[v.votering_id] = {};
            if (!issues[v.votering_id][v.parti]) issues[v.votering_id][v.parti] = { Ja: 0, Nej: 0, Avstår: 0 };
            if (issues[v.votering_id][v.parti][v.rost] !== undefined) {
                issues[v.votering_id][v.parti][v.rost]++;
            }
        });
        const majorities = {};
        Object.entries(issues).forEach(([vid, parties]) => {
            majorities[vid] = {};
            Object.entries(parties).forEach(([p, t]) => {
                const max = Math.max(t.Ja, t.Nej, t.Avstår);
                majorities[vid][p] = t.Ja === max ? 'Ja' : t.Nej === max ? 'Nej' : 'Avstår';
            });
        });

        const groups = {
            kvinna: { total: 0, absent: 0, rebel: 0, rebelTotal: 0 },
            man: { total: 0, absent: 0, rebel: 0, rebelTotal: 0 },
        };
        votes.forEach(v => {
            const g = memberGender[v.intressent_id];
            if (!g || !groups[g]) return;
            groups[g].total++;
            if (v.rost === 'Frånvarande') groups[g].absent++;
            if (v.parti !== '-' && v.rost !== 'Frånvarande') {
                const maj = majorities[v.votering_id]?.[v.parti];
                if (maj) { groups[g].rebelTotal++; if (v.rost !== maj) groups[g].rebel++; }
            }
        });

        return [
            {
                name: 'Kvinnor',
                franvaro: groups.kvinna.total > 0 ? parseFloat((groups.kvinna.absent / groups.kvinna.total * 100).toFixed(1)) : 0,
                lojalitet: groups.kvinna.rebelTotal > 0 ? parseFloat((100 - groups.kvinna.rebel / groups.kvinna.rebelTotal * 100).toFixed(1)) : 0,
            },
            {
                name: 'Män',
                franvaro: groups.man.total > 0 ? parseFloat((groups.man.absent / groups.man.total * 100).toFixed(1)) : 0,
                lojalitet: groups.man.rebelTotal > 0 ? parseFloat((100 - groups.man.rebel / groups.man.rebelTotal * 100).toFixed(1)) : 0,
            },
        ];
    }, [members, votes]);

    const partyGender = useMemo(() => {
        if (!members.length) return [];
        const data = {};
        PARTIES.forEach(p => { data[p] = { women: 0, men: 0 }; });
        members.forEach(m => {
            if (!data[m.parti]) return;
            if (m.kon === 'kvinna') data[m.parti].women++;
            else if (m.kon === 'man') data[m.parti].men++;
        });
        return PARTIES.map(p => ({
            name: p,
            Kvinnor: data[p]?.women || 0,
            Män: data[p]?.men || 0,
            andelKvinnor: (data[p]?.women || 0) + (data[p]?.man || 0) > 0
                ? Math.round((data[p]?.women || 0) / ((data[p]?.women || 0) + (data[p]?.men || 0)) * 100)
                : 0,
        })).sort((a, b) => b.andelKvinnor - a.andelKvinnor);
    }, [members]);

    if (!voteAnalysis) return <p style={{ color: 'var(--text-muted)' }}>Laddar data…</p>;

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Skiljer sig manliga och kvinnliga ledamöters röstningsbeteende? Frånvaro och partilojalitet uppdelat på kön, samt könsfördelningen per parti.
            </p>
            <div className="grid-dashboard">
                <div className="glass-panel col-span-12">
                    <h3 style={{ marginBottom: '1.5rem' }}>Röstningsbeteende per kön</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={voteAnalysis} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} />
                            <Tooltip {...tooltipStyle} formatter={v => `${v}%`} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
                            <Bar dataKey="franvaro" name="Frånvaro %" fill="var(--party-s)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="lojalitet" name="Partilojalitet %" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                        * Partilösa ledamöter ("Vilde") ingår ej i lojalitetsberäkningarna — partilojalitet är inte tillämpbart utan partitillhörighet.
                    </p>
                </div>
                <div className="glass-panel col-span-12">
                    <h3 style={{ marginBottom: '0.5rem' }}>Könsfördelning per parti (sorterat efter andel kvinnor)</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        {partyGender[0]?.name} har högst andel kvinnor ({partyGender[0]?.andelKvinnor}%)
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={partyGender} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" tickLine={false} />
                            <Tooltip {...tooltipStyle} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
                            <Bar dataKey="Kvinnor" stackId="a" fill="#ec4899" />
                            <Bar dataKey="Män" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 6: Regional representation i ledarskap
// ─────────────────────────────────────────────────────────────
const RegionalTab = ({ members }) => {
    const data = useMemo(() => {
        if (!members.length) return [];
        const leadershipRoles = new Set(['Ordförande', 'Vice ordförande', '1:e vice ordförande', '2:e vice ordförande']);
        const regionMap = {};
        members.forEach(m => {
            const uppdrag = m.personuppdrag?.uppdrag || [];
            const list = Array.isArray(uppdrag) ? uppdrag : [uppdrag];
            const hasLeadership = list.some(u => leadershipRoles.has(u.roll_kod) && (!u.tom || new Date(u.tom) > new Date()));
            if (hasLeadership) {
                const region = m.valkrets || 'Okänd';
                if (!regionMap[region]) regionMap[region] = { region, count: 0, parties: {} };
                regionMap[region].count++;
                regionMap[region].parties[m.parti] = (regionMap[region].parties[m.parti] || 0) + 1;
            }
        });
        return Object.values(regionMap).sort((a, b) => b.count - a.count);
    }, [members]);

    const totalLeaders = data.reduce((s, r) => s + r.count, 0);
    const maxCount = data[0]?.count || 1;

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Vilka valkretsar är mest representerade bland utskottsledare (ordförande och vice ordförande)? Dominerar storstadsregionerna?
            </p>
            {data.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Ingen data hittades. Kontrollera att ledamotsdata laddats korrekt.
                </div>
            ) : (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '0.5rem' }}>Utskottsledare per valkrets</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Totalt {totalLeaders} ordförande/vice ordförande-poster fördelade på {data.length} valkretsar
                    </p>
                    <div style={{ overflowY: 'auto', maxHeight: '500px', paddingRight: '0.5rem' }}>
                        {data.map((r, i) => (
                            <div key={i} style={{ marginBottom: '1.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: i < 3 ? 'bold' : 'normal' }}>{i + 1}. {r.region}</span>
                                    <span>
                                        <strong>{r.count}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                            {Object.entries(r.parties).sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p}:${c}`).join(' ')}
                                        </span>
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                                    <div style={{
                                        width: `${(r.count / maxCount) * 100}%`,
                                        height: '100%',
                                        background: i < 3 ? '#fadb14' : 'var(--accent-primary)',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 7: Interpellationsmönster
// ─────────────────────────────────────────────────────────────
const InterpellationTab = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rm, setRm] = useState('2025%2F26');

    const handleFetch = async () => {
        setLoading(true);
        try {
            const [interpResults, qResults] = await Promise.all([
                Promise.all(PARTIES.map(async party => {
                    const url = `${BASE_URL}/dokumentlista/?parti=${party}&doktyp=ip&rm=${rm}&sz=1&utformat=json`;
                    const resp = await fetchJSON(url);
                    return { party, count: parseInt(resp.dokumentlista?.['@traffar'] || '0', 10) };
                })),
                Promise.all(PARTIES.map(async party => {
                    const url = `${BASE_URL}/dokumentlista/?parti=${party}&doktyp=fr&rm=${rm}&sz=1&utformat=json`;
                    const resp = await fetchJSON(url);
                    return { party, count: parseInt(resp.dokumentlista?.['@traffar'] || '0', 10) };
                })),
            ]);
            const merged = PARTIES.map(p => ({
                name: p,
                Interpellationer: interpResults.find(r => r.party === p)?.count || 0,
                'Skriftliga frågor': qResults.find(r => r.party === p)?.count || 0,
            })).sort((a, b) => (b.Interpellationer + b['Skriftliga frågor']) - (a.Interpellationer + a['Skriftliga frågor']));
            setData(merged);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Vilka partier ställer flest interpellationer och skriftliga frågor? Interpellationer är ett viktigt verktyg för oppositionen att ifrågasätta regeringen och kräva svar i kammaren.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <select
                    value={rm}
                    onChange={e => setRm(e.target.value)}
                    style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--glass-border)', fontFamily: 'inherit' }}
                >
                    {PERIODS.map(p => <option key={p.value} value={p.value} style={{ color: 'black' }}>{p.label}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>
                    {loading ? 'Hämtar…' : 'Analysera'}
                </button>
            </div>

            {data.length > 0 && (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Interpellationer & Skriftliga Frågor per Parti</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" tickLine={false} />
                            <Tooltip {...tooltipStyle} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
                            <Bar dataKey="Interpellationer" stackId="a" fill="var(--party-s)" />
                            <Bar dataKey="Skriftliga frågor" stackId="a" fill="#40a9ff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                        Partier i regeringssamarbete (M, KD, L, SD) förväntas generellt ha färre interpellationer mot den egna regeringen.
                    </p>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// TAB 8: Partilojalitetstrend
// ─────────────────────────────────────────────────────────────
const PARTY_COLORS = {
    S: 'var(--party-s)', M: 'var(--party-m)', SD: 'var(--party-sd)',
    C: 'var(--party-c)', V: 'var(--party-v)', KD: 'var(--party-kd)',
    L: 'var(--party-l)', MP: 'var(--party-mp)',
};

const LoyaltyTrendTab = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled(
                PERIODS.map(async ({ label, value }) => {
                    const url = `${BASE_URL}/voteringlista/?rm=${value}&sz=2000&utformat=json`;
                    const resp = await fetchJSON(url);
                    const voteringar = resp.voteringlista?.votering || [];
                    const voteList = Array.isArray(voteringar) ? voteringar : [voteringar];
                    const totalLoyalty = parseFloat(computePartyLoyalty(voteList));
                    const partyLoyalty = {};
                    PARTIES.forEach(p => {
                        const pVotes = voteList.filter(v => v.parti === p);
                        partyLoyalty[p] = parseFloat(computePartyLoyalty(pVotes));
                    });
                    return { rm: label, 'Alla partier': totalLoyalty, ...partyLoyalty };
                })
            );
            setData(
                results
                    .filter(r => r.status === 'fulfilled')
                    .map(r => r.value)
                    .reverse()
            );
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '800px' }}>
                Har partipiskan blivit strängare eller lösare? Analyserar genomsnittlig partilojalitet per riksmöte (2022–2026). Baseras på ett urval av 2 000 voteringar per period. Partilösa ledamöter ("Vilde") ingår ej — partilojalitet är inte tillämpbart utan partitillhörighet.
            </p>
            <div style={{ marginBottom: '2rem' }}>
                <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>
                    {loading ? 'Beräknar 4 riksmöten…' : 'Kör Trendanalys'}
                </button>
            </div>

            {data.length > 0 && (
                <div className="grid-dashboard">
                    <div className="glass-panel col-span-12">
                        <h3 style={{ marginBottom: '1rem' }}>Genomsnittlig partilojalitet per riksmöte (%)</h3>
                        <ResponsiveContainer width="100%" height={380}>
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="rm" stroke="var(--text-muted)" tickLine={false} />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    domain={[80, 100]}
                                    tickFormatter={v => `${v}%`}
                                    tickLine={false}
                                />
                                <Tooltip
                                    {...tooltipStyle}
                                    formatter={v => `${parseFloat(v).toFixed(1)}%`}
                                />
                                <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
                                <Line
                                    type="monotone"
                                    dataKey="Alla partier"
                                    stroke="white"
                                    strokeWidth={3}
                                    dot={{ r: 5, fill: 'white' }}
                                />
                                {PARTIES.map(p => (
                                    <Line
                                        key={p}
                                        type="monotone"
                                        dataKey={p}
                                        stroke={PARTY_COLORS[p]}
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: PARTY_COLORS[p] }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-panel col-span-12">
                        <h3 style={{ marginBottom: '1.5rem' }}>Lojalitet per parti och riksmöte</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Parti</th>
                                        {data.map(d => (
                                            <th key={d.rm} style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{d.rm}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {PARTIES.map(p => (
                                        <tr key={p} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span className="party-tag" style={{ background: getPartyColor(p) }}>{p}</span>
                                            </td>
                                            {data.map(d => (
                                                <td key={d.rm} style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 'bold', color: d[p] >= 97 ? '#10b981' : d[p] >= 92 ? 'var(--accent-primary)' : 'var(--party-s)' }}>
                                                    {d[p] ? `${d[p].toFixed(1)}%` : '–'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// HUVUD-KOMPONENT
// ─────────────────────────────────────────────────────────────
const TABS = [
    { id: 'fingerprint', label: 'Fingeravtryck', desc: 'Politiskt fingeravtryck per ledamot' },
    { id: 'coalitions', label: 'Koalitioner', desc: 'Partikoalitioner per sakfråga' },
    { id: 'seasonality', label: 'Säsongsmönster', desc: 'Aktivitetsmönster under riksmötet' },
    { id: 'veteran', label: 'Veteran/Ny', desc: 'Veteran vs. ny ledamot' },
    { id: 'gender', label: 'Genus', desc: 'Genus & aktivitetstyp' },
    { id: 'regional', label: 'Regional Makt', desc: 'Regional representation i ledarskap' },
    { id: 'interpellations', label: 'Interpellationer', desc: 'Frågor & interpellationer per parti' },
    { id: 'loyalty', label: 'Lojalitetstrend', desc: 'Partilojalitet över riksmöten' },
];

const Insights = ({ members, votes }) => {
    const [activeTab, setActiveTab] = useState('fingerprint');

    const activeTabObj = TABS.find(t => t.id === activeTab);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Datainsikter</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {activeTabObj?.desc}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'fingerprint' && <FingerprintTab members={members} />}
            {activeTab === 'coalitions' && <CoalitionTab votes={votes} />}
            {activeTab === 'seasonality' && <SeasonalityTab />}
            {activeTab === 'veteran' && <VeteranTab members={members} votes={votes} />}
            {activeTab === 'gender' && <GenderTab members={members} votes={votes} />}
            {activeTab === 'regional' && <RegionalTab members={members} />}
            {activeTab === 'interpellations' && <InterpellationTab />}
            {activeTab === 'loyalty' && <LoyaltyTrendTab />}
        </div>
    );
};

export default Insights;
