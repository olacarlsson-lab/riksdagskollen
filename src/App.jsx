import React, { useState, useEffect } from 'react';
import { fetchMembers, fetchRecentVotings } from './api';
import Dashboard from './Dashboard';
import CustomBuilder from './CustomBuilder';
import MembersList from './MembersList';
import SimilarityIndex from './SimilarityIndex';
import Demographics from './Demographics';
import Committees from './Committees';
import TrendSearch from './TrendSearch';
import VotesList from './VotesList';
import { Activity } from 'lucide-react';

function App() {
  const [data, setData] = useState({ members: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('oversikt');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedCommitteeCode, setSelectedCommitteeCode] = useState(null);

  const navigateToMember = (memberId) => {
    const member = data.members.find(m => m.intressent_id === memberId);
    if (member) {
      setSelectedMember(member);
      setCurrentView('ledamoter');
    }
  };

  const navigateToCommittee = (committeeCode) => {
    setSelectedCommitteeCode(committeeCode);
    setCurrentView('utskott');
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [membersRes, votesRes] = await Promise.all([
          fetchMembers(),
          fetchRecentVotings()
        ]);

        // Members list comes as Array
        // Filter out those who are not active? "Tjänstgörande riksdagsledamot"
        const activeMembers = membersRes.filter(p => !p.status?.includes('Förutvarande') && p.status?.includes('Tjänstgörande'));
        const actualMembers = activeMembers.length > 0 ? activeMembers : membersRes; // Fallback if filter is too aggressive

        setData({ members: actualMembers, votes: votesRes });
      } catch (e) {
        console.error("Failed to fetch API data", e);
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className={`btn ${currentView === 'oversikt' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('oversikt'); setSelectedMember(null); }}
          >
            Översikt
          </button>
          <button
            className={`btn ${currentView === 'ledamoter' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('ledamoter'); setSelectedMember(null); }}
          >
            Ledamöter
          </button>
          <button
            className={`btn ${currentView === 'utskott' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('utskott'); setSelectedMember(null); }}
          >
            Utskott
          </button>
          <button
            className={`btn ${currentView === 'demografi' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('demografi'); setSelectedMember(null); }}
          >
            Demografi
          </button>
          <button
            className={`btn ${currentView === 'trend' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('trend'); setSelectedMember(null); }}
          >
            Trend-koll
          </button>
          <button
            className={`btn ${currentView === 'votes' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('votes'); setSelectedMember(null); }}
          >
            Voteringar
          </button>
          <button
            className={`btn ${currentView === 'bygg' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('bygg'); setSelectedMember(null); }}
          >
            Data & Export
          </button>
          <button
            className={`btn ${currentView === 'likhet' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('likhet'); setSelectedMember(null); }}
          >
            Likhetsindex
          </button>
        </div>
      </nav>

      <main className="main-content">
        <header style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '2rem' }}>
          <h1>Riksdagens Voteringar & Närvaro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            En visuell utforskning av Sveriges riksdag med fokus på närvaro, partilojalitet och demografi, baserat på öppna data.
          </p>
        </header>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>Synkroniserar data med Riksdagen...</p>
          </div>
        ) : (
          <>
            {currentView === 'oversikt' && <Dashboard members={data.members} votes={data.votes} onMemberClick={navigateToMember} />}
            {currentView === 'demografi' && <Demographics members={data.members} votes={data.votes} />}
            {currentView === 'ledamoter' && <MembersList members={data.members} votes={data.votes} selectedMember={selectedMember} setSelectedMember={setSelectedMember} onNavigateToCommittee={navigateToCommittee} />}
            {currentView === 'utskott' && <Committees members={data.members} votes={data.votes} onMemberClick={navigateToMember} initialCommitteeCode={selectedCommitteeCode} />}
            {currentView === 'trend' && <TrendSearch />}
            {currentView === 'votes' && <VotesList votes={data.votes} />}
            {currentView === 'bygg' && <CustomBuilder members={data.members} />}
            {currentView === 'likhet' && <SimilarityIndex />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
