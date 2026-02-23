import React, { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart as PieChartIcon, BarChart2, MapPin } from 'lucide-react';

const Demographics = ({ members, votes = [] }) => {
    // 3. Gender Demographics
    const genderStats = useMemo(() => {
        let men = 0;
        let women = 0;
        members.forEach(m => {
            if (m.kon === 'man') men++;
            else if (m.kon === 'kvinna') women++;
        });
        return [
            { name: 'Kvinnor', value: women, color: '#ec4899' }, // Pink
            { name: 'Män', value: men, color: '#3b82f6' } // Blue
        ];
    }, [members]);

    // 4. Age Demographics
    const ageStats = useMemo(() => {
        const ranges = { '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60-69': 0, '70+': 0 };
        const currentYear = new Date().getFullYear();
        members.forEach(m => {
            if (!m.fodd_ar) return;
            const age = currentYear - parseInt(m.fodd_ar, 10);
            if (age < 30) ranges['20-29']++;
            else if (age < 40) ranges['30-39']++;
            else if (age < 50) ranges['40-49']++;
            else if (age < 60) ranges['50-59']++;
            else if (age < 70) ranges['60-69']++;
            else ranges['70+']++;
        });
        return Object.entries(ranges).map(([name, value]) => ({ name, value }));
    }, [members]);

    // 5. Valkrets stats
    const regionStats = useMemo(() => {
        if (!votes || !votes.length) return [];
        const regions = {};

        // Group votes per valkrets
        votes.forEach(v => {
            if (!v.valkrets) return;
            if (!regions[v.valkrets]) {
                regions[v.valkrets] = { name: v.valkrets, totalVotes: 0, absentVotes: 0 };
            }
            regions[v.valkrets].totalVotes++;
            if (v.rost === 'Frånvarande') {
                regions[v.valkrets].absentVotes++;
            }
        });

        return Object.values(regions).map(r => ({
            name: r.name,
            attendance: r.totalVotes > 0 ? ((r.totalVotes - r.absentVotes) / r.totalVotes) * 100 : 0
        })).sort((a, b) => b.attendance - a.attendance);
    }, [votes]);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Demografi & Sammansättning
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Visualisering av den nuvarande riksdagens köns- och åldersfördelning.
                </p>
            </div>

            <div className="grid-dashboard">
                <div className="glass-panel col-span-6" style={{ minHeight: '400px' }}>
                    <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PieChartIcon /> Könsfördelning
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={genderStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {genderStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white' }} itemStyle={{ color: 'white' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-panel col-span-6" style={{ minHeight: '400px' }}>
                    <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 /> Åldersfördelning
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ageStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                            <YAxis stroke="var(--text-muted)" tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'var(--glass-highlight)' }}
                                contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                                itemStyle={{ color: 'white' }}
                                formatter={(value) => [value, 'Ledamöter']}
                            />
                            <Bar dataKey="value" fill="#fff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Valkrets */}
                <div className="glass-panel col-span-12" style={{ minHeight: '400px', marginTop: '1rem' }}>
                    <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin /> Närvaro per Valkrets
                    </h2>
                    {regionStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={380}>
                            <BarChart data={regionStats} margin={{ top: 20, right: 30, left: 0, bottom: 90 }}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} tickMargin={5} />
                                <YAxis stroke="var(--text-muted)" tickLine={false} domain={[0, 100]} />
                                <Tooltip
                                    cursor={{ fill: 'var(--glass-highlight)' }}
                                    contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                                    itemStyle={{ color: 'white' }}
                                    formatter={(value) => [`${value.toFixed(1)}%`, 'Närvaro']}
                                />
                                <Bar dataKey="attendance" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Ingen valkretsdata tillgänglig för det aktuella urvalet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Demographics;
