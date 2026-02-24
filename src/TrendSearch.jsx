import React, { useState } from 'react';
import { fetchTrendStats, getPartyColor } from './api';
import { Search, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TrendSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchedPhrase, setSearchedPhrase] = useState('');
    const [trendingWords, setTrendingWords] = useState([]);

    React.useEffect(() => {
        const fetchTrending = async () => {
            try {
                const res = await fetch(`https://data.riksdagen.se/dokumentlista/?rm=2024%2F25&sz=200&utformat=json`);
                const data = await res.json();
                if (data?.dokumentlista?.dokument) {
                    const docs = Array.isArray(data.dokumentlista.dokument) ? data.dokumentlista.dokument : [data.dokumentlista.dokument];
                    const words = {};
                    const stopwords = ['och', 'att', 'med', 'för', 'som', 'till', 'har', 'den', 'det', 'inte', 'ska', 'kan', 'eller', 'samt', 'från', 'blir', 'skulle', 'om', 'på', 'av', 'vid', 'inom', 'under', 'mot', 'över', 'mellan', 'genom', 'vilka', 'vilket', 'sådan', 'sådant', 'efter', 'även', 'bör'];

                    docs.forEach(doc => {
                        const title = (doc.titel || "").toLowerCase().replace(/[^\wåäö]/g, ' ');
                        title.split(/\s+/).forEach(w => {
                            if (w.length > 4 && !stopwords.includes(w) && !parseInt(w) && w !== "beslut") {
                                words[w] = (words[w] || 0) + 1;
                            }
                        });
                    });

                    // Filter and sort top 8
                    const top = Object.entries(words)
                        .filter(([w, count]) => count > 1)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 8)
                        .map(x => x[0].charAt(0).toUpperCase() + x[0].slice(1));

                    setTrendingWords(top);
                }
            } catch (e) { }
        }
        fetchTrending();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setLoading(true);
        setSearchedPhrase(searchTerm);

        try {
            const results = await fetchTrendStats(searchTerm);
            setStats(results.sort((a, b) => b.value - a.value));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp /> Trend-kollen
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Vilka partier pratar mest om en specifik fråga? Sök på valfritt ord (t.ex. "Sjukvård", "Kärnkraft") för att se hur många <b>motioner</b> varje parti lämnat in som innehåller ordet under pågående riksmöte.
                </p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', maxWidth: '600px' }}>
                    <div className="search-bar" style={{ flex: 1 }}>
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Sök på ett politiskt ämne..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button id="trend-search-btn" type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }} disabled={loading}>
                        {loading ? 'Söker...' : 'Analysera'}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><TrendingUp size={14} /> Hetaste trendorden just nu:</span>
                    {trendingWords.length > 0 ? trendingWords.map((word, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setSearchTerm(word);
                                document.getElementById("trend-search-btn").click();
                            }}
                            className="btn btn-ghost hover-bg-highlight"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', textTransform: 'capitalize' }}
                        >
                            {word}
                        </button>
                    )) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laddar trendord...</span>
                    )}
                </div>
            </div>

            {searchedPhrase && !loading && (
                <div className="glass-panel" style={{ minHeight: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Resultat för: "{searchedPhrase}"</h3>

                    {stats.some(s => s.value > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                                <YAxis stroke="var(--text-muted)" tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'var(--glass-highlight)' }}
                                    contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                                    itemStyle={{ color: 'white' }}
                                    formatter={(value) => [value, 'Motioner']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getPartyColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Inga motioner hittades för detta sökord under nuvarande riksmöte.</p>
                    )}
                </div>
            )}
        </div >
    );
};

export default TrendSearch;
