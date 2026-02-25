import React, { useState, useEffect, useRef } from 'react';
import { fetchMembers, fetchRecentVotings } from './api';
import Dashboard from './Dashboard';
import CustomBuilder from './CustomBuilder';
import MembersList from './MembersList';
import SimilarityIndex from './SimilarityIndex';
import Demographics from './Demographics';
import Committees from './Committees';
import TrendSearch from './TrendSearch';
import VotesList from './VotesList';
import Documents from './Documents';
import Parties from './Parties';
import Insights from './Insights';
import { Activity, ChevronDown } from 'lucide-react';

const NavDropdown = ({ label, items, currentView, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = items.some(item => item.view === currentView);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        {label}
        <ChevronDown size={14} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          left: 0,
          background: 'var(--bg-darker)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          minWidth: '200px',
          zIndex: 200,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {items.map(({ label: itemLabel, view }) => (
            <button
              key={view}
              className="btn btn-ghost"
              onClick={() => { onNavigate(view); setOpen(false); }}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                borderRadius: 0,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: currentView === view ? 'var(--glass-highlight)' : 'transparent',
                padding: '0.75rem 1.25rem',
              }}
            >
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [data, setData] = useState({ members: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('oversikt');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedCommitteeCode, setSelectedCommitteeCode] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  const navigate = (view) => {
    setCurrentView(view);
    setSelectedMember(null);
  };

  const navigateToParty = (partyCode) => {
    setSelectedParty(partyCode);
    setCurrentView('partier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToMember = (memberId) => {
    const member = data.members.find(m => m.intressent_id === memberId);
    if (member) {
      setSelectedMember(member);
      setCurrentView('ledamoter');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToCommittee = (committeeCode) => {
    setSelectedCommitteeCode(committeeCode);
    setCurrentView('utskott');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setFetchError(null);
      try {
        const [membersResult, votesResult] = await Promise.allSettled([
          fetchMembers(),
          fetchRecentVotings()
        ]);

        const membersRes = membersResult.status === 'fulfilled' ? membersResult.value : [];
        const votesRes = votesResult.status === 'fulfilled' ? votesResult.value : [];

        if (membersResult.status === 'rejected' && votesResult.status === 'rejected') {
          setFetchError('Kunde inte hämta data från Riksdagens API. Kontrollera din internetanslutning och försök igen.');
        } else if (membersResult.status === 'rejected') {
          setFetchError('Ledamotslistan kunde inte hämtas. En del funktioner kan sakna data.');
        } else if (votesResult.status === 'rejected') {
          setFetchError('Röstningslistan kunde inte hämtas. Närvaro- och lojalitetsdata kan saknas.');
        }

        if (membersResult.status === 'rejected') console.error('fetchMembers failed:', membersResult.reason);
        if (votesResult.status === 'rejected') console.error('fetchRecentVotings failed:', votesResult.reason);

        const activeMembers = membersRes.filter(p => !p.status?.includes('Förutvarande') && p.status?.includes('Tjänstgörande'));
        const actualMembers = activeMembers.length > 0 ? activeMembers : membersRes;

        setData({ members: actualMembers, votes: votesRes });
      } catch (e) {
        console.error("Unexpected error loading data", e);
        setFetchError('Ett oväntat fel uppstod. Ladda om sidan och försök igen.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="app-container">
      <nav className="glass-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Activity color="var(--accent-primary)" size={28} />
          <h2 style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Riksdags<span style={{ color: 'var(--text-accent)' }}>Kollen</span>
          </h2>
        </div>
        <div className="nav-links">
          <button
            className={`btn ${currentView === 'oversikt' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigate('oversikt')}
          >
            Översikt
          </button>

          <NavDropdown
            label="Riksdagen"
            currentView={currentView}
            onNavigate={navigate}
            items={[
              { label: 'Riksdagspartier', view: 'partier' },
              { label: 'Ledamöter', view: 'ledamoter' },
              { label: 'Utskott', view: 'utskott' },
              { label: 'Demografi', view: 'demografi' },
            ]}
          />

          <NavDropdown
            label="Analys"
            currentView={currentView}
            onNavigate={navigate}
            items={[
              { label: 'Trend-koll', view: 'trend' },
              { label: 'Likhetsindex', view: 'likhet' },
              { label: 'Insikter', view: 'insikter' },
            ]}
          />

          <NavDropdown
            label="Data"
            currentView={currentView}
            onNavigate={navigate}
            items={[
              { label: 'Voteringar', view: 'votes' },
              { label: 'Dokument', view: 'dokument' },
              { label: 'Data & Export', view: 'bygg' },
            ]}
          />
        </div>
      </nav>

      <main className="main-content">
        {fetchError && (
          <div style={{ background: 'rgba(220, 80, 60, 0.15)', border: '1px solid rgba(220, 80, 60, 0.4)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.5rem', margin: '1rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>
            ⚠️ {fetchError}
          </div>
        )}
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>Synkroniserar data med Riksdagen...</p>
          </div>
        ) : (
          <>
            {currentView === 'oversikt' && <Dashboard members={data.members} votes={data.votes} onMemberClick={navigateToMember} onPartyClick={navigateToParty} />}
            {currentView === 'partier' && <Parties members={data.members} votes={data.votes} initialParty={selectedParty} onMemberClick={navigateToMember} />}
            {currentView === 'demografi' && <Demographics members={data.members} votes={data.votes} />}
            {currentView === 'ledamoter' && <MembersList members={data.members} votes={data.votes} selectedMember={selectedMember} setSelectedMember={setSelectedMember} onNavigateToCommittee={navigateToCommittee} />}
            {currentView === 'utskott' && <Committees members={data.members} votes={data.votes} onMemberClick={navigateToMember} initialCommitteeCode={selectedCommitteeCode} />}
            {currentView === 'trend' && <TrendSearch />}
            {currentView === 'votes' && <VotesList votes={data.votes} />}
            {currentView === 'dokument' && <Documents />}
            {currentView === 'bygg' && <CustomBuilder members={data.members} />}
            {currentView === 'likhet' && <SimilarityIndex />}
            {currentView === 'insikter' && <Insights members={data.members} votes={data.votes} />}
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--glass-border)', marginTop: 'auto' }}>
        <p style={{ maxWidth: '600px', margin: '0 auto 1rem auto' }}>En visuell utforskning av Sveriges riksdag med fokus på närvaro, partilojalitet och demografi, baserat på öppna data.</p>
        <p>Källa: All data hämtas från <a href="https://data.riksdagen.se" target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>Sveriges Riksdags öppna data</a>.</p>
      </footer>
    </div>
  );
}

export default App;
