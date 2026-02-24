import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const changeDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1rem', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => changeDate(-1)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ padding: '0.6rem 1rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', outline: 'none', color: 'white', borderRadius: '4px', fontFamily: 'inherit', fontSize: '1rem' }}
                    />
                    <button onClick={() => changeDate(1)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
                </div>
                {events.length > 0 && <span style={{ color: 'var(--text-muted)' }}>{events.length} inplanerade händelser</span>}
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loader2 className="spinner" style={{ width: 32, height: 32, margin: '0 auto', border: '3px solid', borderTopColor: 'transparent' }} />
                </div>
            ) : events.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                    Inga händelser hittades i riksdagskalendern det här datumet.
                </div>
            ) : (
                <div style={{ position: 'relative', borderLeft: '2px solid var(--glass-border)', marginLeft: '1rem', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    {events.map((evt, idx) => {
                        const time = evt.klockslag || '';
                        const room = evt.plats || 'Plats ej angiven';

                        return (
                            <div key={evt.id || idx} style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', transition: 'transform 0.2s', cursor: 'default' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'none' }}
                            >
                                <div style={{ position: 'absolute', left: '-2.45rem', top: '1.5rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--party-v)', border: '2px solid var(--bg-card)' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ flex: 1, minWidth: '250px' }}>
                                        <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={16} /> {time || 'Tid ej satt'}
                                        </div>
                                        <h4 style={{ color: 'white', fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{evt.titel}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <MapPin size={16} /> {room}
                                        </div>
                                    </div>
                                    {evt.organ && (
                                        <div className="party-tag" style={{ background: 'transparent', color: 'var(--text-muted)', width: 'auto', height: 'auto', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', borderColor: 'var(--glass-border)' }}>
                                            {evt.organ}
                                        </div>
                                    )}
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
