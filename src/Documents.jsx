import React, { useState } from 'react';
import { Search, Loader2, FileText, ExternalLink } from 'lucide-react';

const Documents = ({ rm = "2025%2F26" }) => {
    const [query, setQuery] = useState('');
    const [doktyp, setDoktyp] = useState('mot'); // Default to motioner
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            // Encode the query cleanly
            const cleanQuery = encodeURIComponent(query.trim());
            const url = `https://data.riksdagen.se/dokumentlista/?sok=${cleanQuery}&doktyp=${doktyp}&rm=${rm}&sz=50&utformat=json`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.dokumentlista && data.dokumentlista.dokument) {
                const docs = Array.isArray(data.dokumentlista.dokument) ? data.dokumentlista.dokument : [data.dokumentlista.dokument];
                setResults(docs);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText /> Dokumentsök (Motioner m.m.)
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Sök och utforska alla inlämnade motioner, betänkanden och andra offentliga dokument i Sveriges Riksdag under det aktuella riksmötet.
                </p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', maxWidth: '800px', flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: 0 }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Sök efter dokument, ämnen eller ledamöter..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <select
                        className="search-input"
                        style={{ width: 'auto', padding: '0.85rem 2rem 0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
                        value={doktyp}
                        onChange={(e) => setDoktyp(e.target.value)}
                    >
                        <option value="">Alla dokument</option>
                        <option value="mot">Motioner</option>
                        <option value="bet">Betänkanden</option>
                        <option value="prop">Propositioner</option>
                        <option value="frs">Svar på skriftlig fråga</option>
                    </select>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <Loader2 className="spinner" style={{ width: 18, height: 18, border: '2px solid', borderTopColor: 'transparent', margin: 0 }} /> : 'Sök'}
                    </button>
                </form>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 className="spinner" style={{ width: 48, height: 48, border: '3px solid var(--glass-border)', borderTopColor: 'white', margin: '0 auto' }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Söker i Riksdagens arkiv...</p>
                </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Inga specifika dokument hittades för din sökning.</p>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Hittade {results.length} dokument</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {results.map((doc, idx) => {
                            const date = doc.datum ? doc.datum.split(' ')[0] : '';
                            const summary = doc.notis || doc.sammanfattning || doc.titel;
                            const cleanSummary = summary ? summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

                            return (
                                <div key={doc.id || idx} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {doc.dokumentnamn} ({doc.beteckning}) | {date}
                                            </div>
                                            <h3 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>
                                                {doc.titel}
                                            </h3>
                                            <div style={{ color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '800px' }}>
                                                {cleanSummary}
                                            </div>
                                        </div>
                                        <a
                                            href={`https://www.riksdagen.se/sv/dokument-lagar/dokument/-/${doc.dok_id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-ghost"
                                            style={{ flexShrink: 0, marginTop: '0.5rem' }}
                                        >
                                            <ExternalLink size={16} /> Läs på Riksdagen.se
                                        </a>
                                    </div>

                                    {doc.undertitel && (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                            Relaterat: {doc.undertitel}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
