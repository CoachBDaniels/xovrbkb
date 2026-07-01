import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { ThemeProvider, useTheme } from './ThemeContext';
import SeasonsScreen from './SeasonsScreen';
import HomeDashboard from './HomeDashboard';
import PracticesScreen from './PracticesScreen';
import LibrariesScreen from './LibrariesScreen';
import GameScreen from './GameScreen';
import ThemeSettingsScreen from './ThemeSettingsScreen';

function RosterScreen({ team, role }) {
  const { colors: COLORS } = useTheme();
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadPlayers = () => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data); });
  };

  useEffect(() => { loadPlayers(); }, [team.id]);

  const addPlayer = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('players').insert({ team_id: team.id, name: newName.trim(), number: newNumber.trim() || null });
    if (!error) { setNewName(''); setNewNumber(''); loadPlayers(); }
  };

  const removePlayer = async (id) => {
    await supabase.from('players').delete().eq('id', id);
    loadPlayers();
  };

  const updateGrade = async (id, grade) => {
    await supabase.from('players').update({ grade }).eq('id', id);
    loadPlayers();
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)} style={{ width: 50, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addPlayer} style={{ padding: '8px 16px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
        </div>
      )}
      {players.map(p => (
        <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ width: 30, fontWeight: 'bold', color: COLORS.gold }}>{p.number || '—'}</span>
          <span style={{ flex: 1 }}>{p.name}</span>
          {canEdit ? (
            <select value={p.grade || ''} onChange={e => updateGrade(p.id, e.target.value || null)} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, padding: 4 }}>
              <option value="">—</option><option value="Fr">Fr</option><option value="So">So</option><option value="Jr">Jr</option><option value="Sr">Sr</option>
            </select>
          ) : <span>{p.grade || '—'}</span>}
          {canEdit && <button onClick={() => removePlayer(p.id)} style={{ color: COLORS.red, background: 'none', border: `1px solid ${COLORS.red}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Remove</button>}
        </div>
      ))}
      {players.length === 0 && <p style={{ color: COLORS.muted }}>No players yet.</p>}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function OpponentsScreen({ team, role }) {
  const { colors: COLORS } = useTheme();
  const [opponents, setOpponents] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadOpponents = () => {
    supabase.from('opponents').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setOpponents(data); });
  };

  useEffect(() => { loadOpponents(); }, [team.id]);

  const addOpponent = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('opponents').insert({ team_id: team.id, name: newName.trim(), abbr: newAbbr.trim().toUpperCase() || null });
    if (!error) { setNewName(''); setNewAbbr(''); loadOpponents(); }
  };

  const removeOpponent = async (id) => {
    await supabase.from('opponents').delete().eq('id', id);
    loadOpponents();
  };

  const updateOpponentField = async (id, field, value) => {
    setOpponents(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    await supabase.from('opponents').update({ [field]: value }).eq('id', id);
  };

  const handleLogoUpload = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateOpponentField(id, 'logo_url', dataUrl);
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="Team name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Abbr" value={newAbbr} onChange={e => setNewAbbr(e.target.value)} style={{ width: 70, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addOpponent} style={{ padding: '8px 16px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
        </div>
      )}
      {opponents.map(o => {
        const isEditing = editingId === o.id;
        const primary = o.primary_color || '#6b7280';
        const secondary = o.secondary_color || '#9ca3af';
        return (
          <div key={o.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={o.name || ''} onChange={e => updateOpponentField(o.id, 'name', e.target.value)} placeholder="Team name"
                    style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13 }} />
                  <input value={o.abbr || ''} onChange={e => updateOpponentField(o.id, 'abbr', e.target.value.toUpperCase().slice(0, 4))}
                    style={{ width: 64, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 6px', color: COLORS.text, fontSize: 13, textAlign: 'center', textTransform: 'uppercase' }} />
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="color" value={primary} onChange={e => updateOpponentField(o.id, 'primary_color', e.target.value)}
                      style={{ width: 26, height: 26, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    <span style={{ fontSize: 9, color: COLORS.muted }}>Primary</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="color" value={secondary} onChange={e => updateOpponentField(o.id, 'secondary_color', e.target.value)}
                      style={{ width: 26, height: 26, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    <span style={{ fontSize: 9, color: COLORS.muted }}>Secondary</span>
                  </label>
                  <label style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                    Logo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoUpload(o.id, e)} />
                  </label>
                </div>
                <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  Done
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {o.logo_url
                  ? <img src={o.logo_url} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 7, background: primary, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: secondary, border: `1px solid ${secondary}` }}>{(o.abbr || o.name || '?').slice(0, 1)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{o.abbr || '—'}</div>
                </div>
                {canEdit && <button onClick={() => setEditingId(o.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Edit</button>}
                {canEdit && <button onClick={() => removeOpponent(o.id)} style={{ background: COLORS.redBg, border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Remove</button>}
              </div>
            )}
          </div>
        );
      })}
      {opponents.length === 0 && <p style={{ color: COLORS.muted }}>No opponents yet.</p>}
    </div>
  );
}

function TeamViewInner({ team, onBack }) {
  const { colors: COLORS, logo, teamName } = useTheme();
  const [tab, setTab] = useState('home');
  const [currentSeason, setCurrentSeason] = useState(null);
  const [productLogo, setProductLogo] = useState(null);

  useEffect(() => {
    supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const active = data.find(s => s.start_date && s.end_date && s.start_date <= todayStr && todayStr <= s.end_date);
        setCurrentSeason(active || data[0]);
      });
  }, [team.id]);

  useEffect(() => {
    supabase.from('app_settings').select('product_logo').limit(1).maybeSingle()
      .then(({ data, error }) => { if (!error && data?.product_logo) setProductLogo(data.product_logo); });
  }, []);

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: '7px 2px', fontWeight: tab === key ? 'bold' : 'normal',
      fontSize: 11, lineHeight: 1.2,
      background: tab === key ? COLORS.gold : 'rgba(255,255,255,0.08)',
      color: tab === key ? COLORS.textDark : COLORS.text,
      border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`,
      borderRadius: 7, cursor: 'pointer', textAlign: 'center', overflow: 'hidden',
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: COLORS.navyDark, color: COLORS.text, fontFamily: 'sans-serif' }}>
      <div style={{ background: COLORS.navy, borderBottom: `3px solid ${COLORS.gold}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {logo && <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
        <div>
          <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>{teamName}</div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{team.name}</h2>
        </div>
        {productLogo && (
          <img src={productLogo} alt="" style={{ height: 58, width: 'auto', maxWidth: 200, objectFit: 'contain', marginLeft: 'auto', marginRight: 'auto' }} />
        )}
        <button onClick={onBack} style={{ marginLeft: productLogo ? 0 : 'auto', padding: '8px 14px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 7, cursor: 'pointer' }}>Home</button>
      </div>
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginBottom: 20 }}>
          {tabBtn('home', 'Home')}
          {tabBtn('roster', 'Roster')}
          {tabBtn('opponents', 'Opponents')}
          {tabBtn('seasons', 'Seasons')}
          {tabBtn('practices', 'Practices')}
          {tabBtn('libraries', 'Config')}
          {tabBtn('theme', 'Theme')}
          {tabBtn('game', 'Game')}
        </div>
        {tab === 'home' && <HomeDashboard team={team} role={team.role} onNavigateToTab={setTab} />}
        {tab === 'roster' && <RosterScreen team={team} role={team.role} />}
        {tab === 'opponents' && <OpponentsScreen team={team} role={team.role} />}
        {tab === 'seasons' && <SeasonsScreen team={team} role={team.role} />}
        {tab === 'practices' && (currentSeason
          ? <PracticesScreen team={team} season={currentSeason} />
          : <p>Create a season first (Seasons tab).</p>)}
        {tab === 'libraries' && <LibrariesScreen team={team} role={team.role} />}
        {tab === 'theme' && <ThemeSettingsScreen team={team} role={team.role} />}
        {tab === 'game' && (currentSeason
          ? <GameScreen team={team} season={currentSeason} />
          : <p>Create a season first (Seasons tab).</p>)}
      </div>
    </div>
  );
}

function TeamView({ team, onBack }) {
  return (
    <ThemeProvider teamId={team.id}>
      <TeamViewInner team={team} onBack={onBack} />
    </ThemeProvider>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [homeTheme, setHomeTheme] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from('team_memberships').select('role, teams(id, name)').then(({ data, error }) => {
      if (!error && data) setTeams(data.map(m => ({ id: m.teams.id, name: m.teams.name, role: m.role })));
    });
  }, [session]);

  useEffect(() => {
    if (teams.length === 0) return;
    (async () => {
      const { data: teamRow } = await supabase.from('teams').select('organization_id').eq('id', teams[0].id).single();
      if (!teamRow?.organization_id) return;
      const { data: themeRow } = await supabase.from('theme_settings').select('theme').eq('organization_id', teamRow.organization_id).maybeSingle();
      if (themeRow?.theme) setHomeTheme(themeRow.theme);
    })();
  }, [teams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      setMessage(error ? 'Error: ' + error.message : 'Check your email to confirm your account!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage('Error: ' + error.message);
    }
  };

  const handleSignOut = async () => { setSelectedTeam(null); await supabase.auth.signOut(); };

  const FALLBACK = { navyDark: '#0d1b2e', navyMid: '#162d50', border: '#243d6b', gold: '#c8a84b', text: '#e8edf5', muted: '#8a99b8', green: '#15803d', navy: '#1a3a6b', textDark: '#1a1a1a' };
  const pageStyle = { minHeight: '100vh', background: FALLBACK.navyDark, color: FALLBACK.text, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const inputStyle = { padding: 10, background: FALLBACK.navyMid, border: `1px solid ${FALLBACK.border}`, borderRadius: 7, color: FALLBACK.text };

  if (loading) return <div style={pageStyle}>Loading...</div>;

  if (!session) {
    return (
      <div style={pageStyle}>
        <div style={{ fontSize: 12, color: FALLBACK.gold, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Briarwood Lions</div>
        <h2 style={{ marginTop: 0, marginBottom: 24 }}>{mode === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 280 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          <button type="submit" style={{ padding: 10, fontWeight: 'bold', background: FALLBACK.gold, color: FALLBACK.textDark, border: 'none', borderRadius: 7, cursor: 'pointer' }}>
            {mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        {message && <p style={{ marginTop: 10, color: message.startsWith('Error') ? '#ff6b6b' : FALLBACK.green }}>{message}</p>}
        <button onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={{ marginTop: 10, background: 'none', border: 'none', color: FALLBACK.gold, cursor: 'pointer' }}>
          {mode === 'signup' ? 'Already have an account? Sign in' : "Need an account? Sign up"}
        </button>
      </div>
    );
  }

  if (selectedTeam) return <TeamView team={selectedTeam} onBack={() => setSelectedTeam(null)} />;

  const homeBgColor = homeTheme?.homeBg || FALLBACK.navyDark;
  const homePageStyle = { ...pageStyle, background: homeBgColor };

  return (
    <div style={homePageStyle}>
      {homeTheme?.homeLogo && (
        <img src={homeTheme.homeLogo} alt="" style={{ width: homeTheme.homeLogoSize || 96, height: 'auto', marginBottom: 14 }} />
      )}
      <div style={{ fontSize: 12, color: FALLBACK.gold, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{homeTheme?.teamName || 'Briarwood Lions'}</div>
      <h2 style={{ marginTop: 0 }}>Basketball</h2>
      <p style={{ color: FALLBACK.muted, marginBottom: 20 }}>Signed in as {session.user.email}</p>
      <div style={{ fontSize: 11, color: FALLBACK.muted, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Choose a Team</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 280 }}>
        {teams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeam(t)} style={{ padding: 14, fontSize: 16, background: FALLBACK.navy, color: FALLBACK.text, border: `1px solid ${FALLBACK.gold}`, borderRadius: 8, cursor: 'pointer' }}>{t.name}</button>
        ))}
      </div>
      <button onClick={handleSignOut} style={{ marginTop: 30, background: 'none', border: 'none', color: FALLBACK.muted, cursor: 'pointer', textDecoration: 'underline' }}>Sign Out</button>
    </div>
  );
}

export default App;