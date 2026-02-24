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
import Documents from './Documents';
import { Activity } from 'lucide-react';

function App() {
  const [data, setData] = useState({ members: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('oversikt');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedCommitteeCode, setSelectedCommitteeCode] = useState(null);
  const [selectedRm, setSelectedRm] = useState('2024%2F25');

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
      setLoading(true);
      try {
        const [membersRes, votesRes] = await Promise.all([
          fetchMembers(),
          fetchRecentVotings(selectedRm)
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
  }, [selectedRm]);

  return (
    <div className="app-container">
      <nav className="glass-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Activity color="var(--accent-primary)" size={28} />
          <h2 style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Riksdags<span style={{ color: 'var(--text-accent)' }}>Kollen</span>
          </h2>
          <select
            className="search-input"
            style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '4px', cursor: 'pointer', outline: 'none', marginLeft: '1rem', fontSize: '0.9rem' }}
            value={selectedRm}
            onChange={(e) => setSelectedRm(e.target.value)}
          >
            <option value="2024%2F25">Riksmöte 2024/25</option>
            <option value="2023%2F24">Riksmöte 2023/24</option>
            <option value="2022%2F23">Riksmöte 2022/23</option>
            <option value="2021%2F22">Riksmöte 2021/22</option>
            <option value="2020%2F21">Riksmöte 2020/21</option>
            <option value="2019%2F20">Riksmöte 2019/20</option>
            <option value="2018%2F19">Riksmöte 2018/19</option>
          </select>
        </div>
        <div className="nav-links">
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
            className={`btn ${currentView === 'dokument' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCurrentView('dokument'); setSelectedMember(null); }}
          >
            Dokument
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
            {currentView === 'dokument' && <Documents rm={selectedRm} />}
            {currentView === 'bygg' && <CustomBuilder members={data.members} />}
            {currentView === 'likhet' && <SimilarityIndex />}
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--glass-border)', marginTop: 'auto' }}>
        <p>Källa: All data hämtas från <a href="https://data.riksdagen.se" target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>Sveriges Riksdags öppna data</a>.</p>
      </footer>
    </div>
  );
}

export default App;
