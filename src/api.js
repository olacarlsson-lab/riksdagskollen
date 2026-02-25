const BASE_URL = 'https://data.riksdagen.se';

// Simple cache to avoid spamming the API during dev
const cache = new Map();

async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  cache.set(url, data);
  return data;
}

export const getPartyColor = (party) => {
  const partyColors = {
    'S': 'var(--party-s)',
    'M': 'var(--party-m)',
    'SD': 'var(--party-sd)',
    'C': 'var(--party-c)',
    'V': 'var(--party-v)',
    'KD': 'var(--party-kd)',
    'L': 'var(--party-l)',
    'MP': 'var(--party-mp)',
    '-': 'var(--party-unknown)'
  };
  return partyColors[party] || 'var(--party-unknown)';
};

export const fetchMembers = async () => {
  // Fetch active members (status, limit or all? We can just fetch all and filter client side)
  const url = `${BASE_URL}/personlista/?utformat=json`;
  const data = await fetchWithCache(url);

  if (!data.personlista || !data.personlista.person) return [];

  return data.personlista.person;
};

export const fetchRecentVotings = async (rm = "2025%2F26") => {
  const url = `${BASE_URL}/voteringlista/?rm=${rm}&sz=3000&utformat=json`;
  const data = await fetchWithCache(url);
  if (!data.voteringlista || !data.voteringlista.votering) return [];
  return data.voteringlista.votering;
};

export const fetchCustomVotings = async (rm = "2025%2F26", size = 2000) => {
  const url = `${BASE_URL}/voteringlista/?rm=${rm}&sz=${size}&utformat=json`;
  // Without using cache to always get fresh data if needed, or with cache. Let's use cache.
  const data = await fetchWithCache(url);
  if (!data.voteringlista || !data.voteringlista.votering) return [];
  return data.voteringlista.votering;
};

// --- New Activity APIs ---

export const fetchMemberActivity = async (iid, rm = "2025%2F26") => {
  // We can run these calls in parallel for a specific member
  const urls = {
    motions: `${BASE_URL}/dokumentlista/?iid=${iid}&doktyp=mot&rm=${rm}&sz=5&utformat=json`,
    questions: `${BASE_URL}/dokumentlista/?iid=${iid}&doktyp=fr,ip&rm=${rm}&sz=5&utformat=json`,
    speeches: `${BASE_URL}/anforandelista/?iid=${iid}&rm=${rm}&sz=1&utformat=json`
  };

  try {
    const [motData, qData, speechData] = await Promise.all([
      fetchWithCache(urls.motions),
      fetchWithCache(urls.questions),
      fetchWithCache(urls.speeches)
    ]);

    const motionsList = motData.dokumentlista?.dokument || [];
    const questionsList = qData.dokumentlista?.dokument || [];

    // The API might return a single object or an array if sz=5. Ensure array.
    const parseList = (list) => Array.isArray(list) ? list : (list ? [list] : []);

    return {
      motCount: parseInt(motData.dokumentlista?.['@traffar'] || "0", 10),
      recentMotions: parseList(motionsList),
      qCount: parseInt(qData.dokumentlista?.['@traffar'] || "0", 10),
      recentQuestions: parseList(questionsList),
      speechCount: parseInt(speechData.anforandelista?.['@antal'] || "0", 10)
    };
  } catch (err) {
    console.error("Failed to fetch member activity", err);
    return { motCount: 0, recentMotions: [], qCount: 0, recentQuestions: [], speechCount: 0 };
  }
};

export const fetchPartyMotions = async (parties, rm = "2025%2F26") => {
  // parties is an array: ['S', 'M', 'SD', ...]
  const promises = parties.map(async (party) => {
    const url = `${BASE_URL}/dokumentlista/?parti=${party}&doktyp=mot&rm=${rm}&sz=1&utformat=json`;
    try {
      const data = await fetchWithCache(url);
      return {
        name: party,
        value: parseInt(data.dokumentlista?.['@traffar'] || "0", 10)
      };
    } catch {
      return { name: party, value: 0 };
    }
  });

  return Promise.all(promises);
};

export const fetchTrendStats = async (keyword, rm = "2025%2F26") => {
  const parties = ['S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP'];
  const safeWord = encodeURIComponent(keyword);
  const promises = parties.map(async (party) => {
    const url = `${BASE_URL}/dokumentlista/?sok=${safeWord}&parti=${party}&doktyp=mot&rm=${rm}&sz=1&utformat=json`;
    try {
      const data = await fetchWithCache(url);
      return {
        name: party,
        value: parseInt(data.dokumentlista?.['@traffar'] || "0", 10)
      };
    } catch {
      return { name: party, value: 0 };
    }
  });

  return Promise.all(promises);
};
