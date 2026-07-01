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
                <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Done</button>
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
          {tabBtn('home', 'HOME')}
          {tabBtn('seasons', 'SZN')}
          {tabBtn('practices', 'PRAC')}
          {tabBtn('roster', 'RSTR')}
          {tabBtn('opponents', 'OPNT')}
          {tabBtn('libraries', 'CNFG')}
          {tabBtn('theme', 'THEME')}
          {tabBtn('game', 'GAME')}
        </div>
        {tab === 'home' && <HomeDashboard team={team} role={team.role} onNavigateToTab={setTab} />}
        {tab === 'roster' && <RosterScreen team={team} role={team.role} />}
        {tab === 'opponents' && <OpponentsScreen team={team} role={team.role} />}
        {tab === 'seasons' && <SeasonsScreen team={team} role={team.role} />}
        {tab === 'practices' && (currentSeason
          ? <PracticesScreen team={team} season={currentSeason} />
          : <p>Create a season first (SZN tab).</p>)}
        {tab === 'libraries' && <LibrariesScreen team={team} role={team.role} />}
        {tab === 'theme' && <ThemeSettingsScreen team={team} role={team.role} />}
        {tab === 'game' && (currentSeason
          ? <GameScreen team={team} season={currentSeason} />
          : <p>Create a season first (SZN tab).</p>)}
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

// ─── Full Court SVG — top-down view matching mockup ────────────────────────
function CourtBackground() {
  const W = 1080, H = 660;
  const stroke = '#1a5566';
  const sw = 2.5;

  // Court proportions (NBA-ish scaled to viewBox)
  // Full court: sidelines top/bottom, baselines left/right
  const margin = 30;
  const courtL = margin, courtR = W - margin, courtT = margin, courtB = H - margin;
  const courtW = courtR - courtL, courtH = courtB - courtT;

  // Half court x
  const midX = W / 2;
  const midY = H / 2;

  // Keys — 16ft wide, 19ft long scaled
  const keyW = courtH * 0.33;   // width of key (along baseline)
  const keyD = courtW * 0.175;  // depth of key into court
  const keyTop = midY - keyW / 2;
  const keyBot = midY + keyW / 2;

  // Free throw circle radius
  const ftR = keyW * 0.52;

  // Basket
  const rimR = 10;
  const basketOffset = 50; // from baseline

  // Three point line — corner portion + arc
  // NBA: corners at ~14ft from baseline, arc radius ~23.75ft
  const tpCornerY = courtH * 0.155; // corner distance from sideline
  const tpArcR = courtW * 0.285;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
      {/* Background fill */}
      <rect width={W} height={H} fill="#00333c" />

      {/* Outer boundary */}
      <rect x={courtL} y={courtT} width={courtW} height={courtH} fill="none" stroke={stroke} strokeWidth={sw} />

      {/* Half court line */}
      <line x1={midX} y1={courtT} x2={midX} y2={courtB} stroke={stroke} strokeWidth={sw} />

      {/* Center circle */}
      <circle cx={midX} cy={midY} r={courtH * 0.09} fill="none" stroke={stroke} strokeWidth={sw} />
      <circle cx={midX} cy={midY} r={5} fill={stroke} />

      {/* ── LEFT SIDE ── */}
      {/* Left key box */}
      <rect x={courtL} y={midY - keyW / 2} width={keyD} height={keyW} fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Left free throw circle — solid top half, dashed bottom */}
      <path d={`M ${courtL + keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${courtL + keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtL + keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${courtL + keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="10 7" />
      {/* Left basket */}
      <circle cx={courtL + basketOffset} cy={midY} r={rimR} fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Left backboard */}
      <line x1={courtL + basketOffset - 18} y1={midY - 26} x2={courtL + basketOffset - 18} y2={midY + 26} stroke={stroke} strokeWidth={sw + 1} />
      {/* Left three point — corner straights + arc */}
      <line x1={courtL} y1={courtT + tpCornerY} x2={courtL + keyD * 1.55} y2={courtT + tpCornerY} stroke={stroke} strokeWidth={sw} />
      <line x1={courtL} y1={courtB - tpCornerY} x2={courtL + keyD * 1.55} y2={courtB - tpCornerY} stroke={stroke} strokeWidth={sw} />
      <path
        d={`M ${courtL + keyD * 1.55} ${courtT + tpCornerY} A ${tpArcR} ${tpArcR} 0 0 1 ${courtL + keyD * 1.55} ${courtB - tpCornerY}`}
        fill="none" stroke={stroke} strokeWidth={sw}
      />
      {/* Left restricted arc */}
      <path d={`M ${courtL + basketOffset} ${midY - 38} A 38 38 0 0 1 ${courtL + basketOffset} ${midY + 38}`} fill="none" stroke={stroke} strokeWidth={sw - 0.5} strokeDasharray="6 5" />

      {/* ── RIGHT SIDE ── */}
      {/* Right key box */}
      <rect x={courtR - keyD} y={midY - keyW / 2} width={keyD} height={keyW} fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Right free throw circle */}
      <path d={`M ${courtR - keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${courtR - keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtR - keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${courtR - keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="10 7" />
      {/* Right basket */}
      <circle cx={courtR - basketOffset} cy={midY} r={rimR} fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Right backboard */}
      <line x1={courtR - basketOffset + 18} y1={midY - 26} x2={courtR - basketOffset + 18} y2={midY + 26} stroke={stroke} strokeWidth={sw + 1} />
      {/* Right three point — corner straights + arc */}
      <line x1={courtR} y1={courtT + tpCornerY} x2={courtR - keyD * 1.55} y2={courtT + tpCornerY} stroke={stroke} strokeWidth={sw} />
      <line x1={courtR} y1={courtB - tpCornerY} x2={courtR - keyD * 1.55} y2={courtB - tpCornerY} stroke={stroke} strokeWidth={sw} />
      <path
        d={`M ${courtR - keyD * 1.55} ${courtT + tpCornerY} A ${tpArcR} ${tpArcR} 0 0 0 ${courtR - keyD * 1.55} ${courtB - tpCornerY}`}
        fill="none" stroke={stroke} strokeWidth={sw}
      />
      {/* Right restricted arc */}
      <path d={`M ${courtR - basketOffset} ${midY - 38} A 38 38 0 0 0 ${courtR - basketOffset} ${midY + 38}`} fill="none" stroke={stroke} strokeWidth={sw - 0.5} strokeDasharray="6 5" />
    </svg>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
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

  const handleForgotPassword = async () => {
    if (!email) { setMessage('Enter your email above first.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setMessage('Error: ' + error.message);
    else setMessage('Password reset email sent!');
  };

  const handleSignOut = async () => { setSelectedTeam(null); await supabase.auth.signOut(); };

  const XOVR = {
    teal: '#00333c',
    gold: '#e7b977',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.45)',
    inputBg: 'rgba(0,0,0,0.2)',
  };

  // ── LOGO URL — update this after uploading the PNG to Supabase Assets bucket ──
  const LOGO_URL = 'https://xqfykowofjswojwgdcmj.supabase.co/storage/v1/object/public/Assets/Simple_Illustration_Basketball_Sports_Academy_Circle_Logo.png';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: XOVR.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: XOVR.gold, fontFamily: 'sans-serif', fontSize: 16, letterSpacing: 2 }}>Loading...</div>
    </div>
  );

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: XOVR.teal, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top half — court background with logo */}
        <div style={{ position: 'relative', height: '48vh', minHeight: 280, overflow: 'hidden', flexShrink: 0 }}>
          <CourtBackground />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={LOGO_URL}
              alt="XOVR Basketball"
              style={{ width: 240, height: 240, objectFit: 'contain', filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.8))' }}
            />
          </div>
        </div>

        {/* Bottom half — login form */}
        <div style={{ flex: 1, background: XOVR.teal, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>

          {/* WELCOME, COACH! */}
          <div style={{
            fontSize: 30, fontWeight: 900, marginBottom: 26, textAlign: 'center',
            color: XOVR.gold,
            WebkitTextStroke: '1.5px #000',
            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 3px 6px rgba(0,0,0,0.5)',
            letterSpacing: 3,
            fontStyle: 'italic',
          }}>
            {mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME, COACH!'}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                padding: '15px 22px',
                background: XOVR.inputBg,
                border: `2px solid ${XOVR.gold}`,
                borderRadius: 50,
                color: XOVR.text,
                fontSize: 15,
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                padding: '15px 22px',
                background: XOVR.inputBg,
                border: `2px solid ${XOVR.gold}`,
                borderRadius: 50,
                color: XOVR.text,
                fontSize: 15,
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />

            {mode === 'signin' && (
              <div style={{ textAlign: 'center', marginTop: -6 }}>
                <button type="button" onClick={handleForgotPassword}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit"
              style={{
                marginTop: 8,
                padding: '15px',
                fontWeight: 900,
                fontSize: 18,
                background: XOVR.gold,
                color: '#000',
                border: 'none',
                borderRadius: 50,
                cursor: 'pointer',
                letterSpacing: 1,
                width: '55%',
                alignSelf: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              }}>
              {mode === 'signup' ? 'Sign Up' : 'Login'}
            </button>
          </form>

          {message && (
            <p style={{ marginTop: 14, fontSize: 13, color: message.startsWith('Error') ? '#ff6b6b' : XOVR.gold, textAlign: 'center', maxWidth: 300 }}>
              {message}
            </p>
          )}

          <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(''); }}
            style={{ marginTop: 18, background: 'none', border: 'none', color: XOVR.muted, cursor: 'pointer', fontSize: 13 }}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>

          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
            XOVR BASKETBALL © 2026
          </div>
        </div>
      </div>
    );
  }

  if (selectedTeam) return <TeamView team={selectedTeam} onBack={() => setSelectedTeam(null)} />;

  return (
    <div style={{ minHeight: '100vh', background: XOVR.teal, color: XOVR.text, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <img src={LOGO_URL} alt="XOVR Basketball" style={{ width: 100, height: 100, marginBottom: 16, objectFit: 'contain' }} />
      <div style={{ fontSize: 11, color: XOVR.muted, letterSpacing: 1, marginBottom: 4 }}>{session.user.email}</div>
      <div style={{ fontSize: 13, color: XOVR.gold, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Choose a Team</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        {teams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeam(t)}
            style={{ padding: 14, fontSize: 15, fontWeight: 700, background: 'rgba(0,0,0,0.3)', color: XOVR.text, border: `2px solid ${XOVR.gold}`, borderRadius: 50, cursor: 'pointer', letterSpacing: 0.5 }}>
            {t.name}
          </button>
        ))}
      </div>
      <button onClick={handleSignOut}
        style={{ marginTop: 30, background: 'none', border: 'none', color: XOVR.muted, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
        Sign Out
      </button>
      <div style={{ position: 'absolute', bottom: 20, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>XOVR BASKETBALL © 2026</div>
    </div>
  );
}

export default App;
