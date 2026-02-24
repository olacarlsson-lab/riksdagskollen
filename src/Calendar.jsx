import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Loader2 } from 'lucide-react';

const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalendar = async () => {
            try {
                // Fetch upcoming events from today onwards
                const today = new Date().toISOString().split('T')[0];
                const url = `https://data.riksdagen.se/dokumentlista/?avd=kalender&from=${today}&sortorder=asc&utformat=json&sz=10`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.dokumentlista && data.dokumentlista.dokument) {
                    const evtList = Array.isArray(data.dokumentlista.dokument) ? data.dokumentlista.dokument : [data.dokumentlista.dokument];
                    setEvents(evtList);
                }
            } catch (error) {
                console.error("Failed to fetch calendar", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendar();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 className="spinner" style={{ width: 24, height: 24, margin: '0 auto', border: '2px solid', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Inga kommande händelser hittades i kalendern.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.map((evt, idx) => {
                const date = evt.datum ? evt.datum.split(' ')[0] : '';
                const time = evt.klockslag || '';
                const room = evt.plats || 'Kammaren / Ej angiven plats';

                return (
                    <div key={evt.id || idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid var(--party-m)' }}>
                        <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{evt.titel}</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarIcon size={14} /> {date}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {time}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> {room}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Calendar;
