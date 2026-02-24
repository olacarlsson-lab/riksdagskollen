import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Loader2 } from 'lucide-react';

const Calendar = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalendar = async () => {
            setLoading(true);
            try {
                // Fetch upcoming events for the specific date
                const url = `https://data.riksdagen.se/dokumentlista/?avd=kalender&from=${selectedDate}&tom=${selectedDate}&sortorder=asc&utformat=json&sz=20`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.dokumentlista && data.dokumentlista.dokument) {
                    const evtList = Array.isArray(data.dokumentlista.dokument) ? data.dokumentlista.dokument : [data.dokumentlista.dokument];
                    setEvents(evtList);
                } else {
                    setEvents([]);
                }
            } catch (error) {
                console.error("Failed to fetch calendar", error);
                setEvents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendar();
    }, [selectedDate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visa händelser för datum:</span>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="search-input"
                    style={{ width: 'auto', padding: '0.4rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', outline: 'none', color: 'white', fontFamily: 'inherit' }}
                />
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Loader2 className="spinner" style={{ width: 24, height: 24, margin: '0 auto', border: '2px solid', borderTopColor: 'transparent' }} />
                </div>
            ) : events.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    Inga händelser hittades i ledighetskalendern det här datumet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
                    {events.map((evt, idx) => {
                        const time = evt.klockslag || '';
                        const room = evt.plats || 'Plats ej angiven';

                        return (
                            <div key={evt.id || idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid var(--party-m)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.05rem', lineHeight: '1.4' }}>{evt.titel}</h4>
                                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {time}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> {room}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Calendar;
