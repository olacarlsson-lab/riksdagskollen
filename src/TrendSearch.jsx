import React, { useState } from 'react';
import { fetchTrendStats, getPartyColor } from './api';
import { Search, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TrendSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchedPhrase, setSearchedPhrase] = useState('');

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
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }} disabled={loading}>
                        {loading ? 'Söker...' : 'Analysera'}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Exempelvänliga sökord:</span>
                    {['Sjukvård', 'Kärnkraft', 'Skola', 'Gängkriminalitet', 'Bensin', 'Integration'].map(word => (
                        <button
                            key={word}
                            onClick={() => setSearchTerm(word)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'white',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '1rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            className="hover-bg-highlight"
                        >
                            {word}
                        </button>
                    ))}
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
        </div>
    );
};

export default TrendSearch;
