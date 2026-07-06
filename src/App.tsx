import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { ThemeProvider, useTheme } from './ThemeContext';
import SeasonsScreen from './SeasonsScreen';
import HomeDashboard from './HomeDashboard';
import PracticesScreen from './PracticesScreen';
import LibrariesScreen from './LibrariesScreen';
import GameScreen from './GameScreen';
import ThemeSettingsScreen from './ThemeSettingsScreen';

// ── Stat helpers ─────────────────────────────────────────────────────────────
const SCOUT_STATS = [
  { key: '2PM', label: '2PM' }, { key: '2PA', label: '2PA' },
  { key: '3PM', label: '3PM' }, { key: '3PA', label: '3PA' },
  { key: 'FTM', label: 'FTM' }, { key: 'FTA', label: 'FTA' },
  { key: 'O', label: 'OREB' }, { key: 'D', label: 'DREB' },
  { key: 'AST', label: 'AST' }, { key: 'STL', label: 'STL' },
  { key: 'BS', label: 'BLK' }, { key: 'TO', label: 'TO' },
  { key: 'PF', label: 'PF' }, { key: 'DF', label: 'DEFL' },
  { key: 'CHG_taken', label: 'CHG' },
];

function calcScoutPts(s) {
  return ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0);
}

function calcScoutEff(s) {
  const pos = ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0)
    + (s['O'] || 0) + (s['D'] || 0) + (s['AST'] || 0)
    + (s['STL'] || 0) + (s['BS'] || 0) + (s['DF'] || 0) + (s['CHG_taken'] || 0);
  const neg = (s['TO'] || 0) + (s['PF'] || 0)
    + ((s['2PA'] || 0) - (s['2PM'] || 0)) + ((s['3PA'] || 0) - (s['3PM'] || 0))
    + ((s['FTA'] || 0) - (s['FTM'] || 0));
  return pos - neg;
}

// ── Scout Film Tagger ────────────────────────────────────────────────────────
function ScoutFilmTagger({ opponent, team, onClose, onSaved }) {
  const { colors: COLORS } = useTheme();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [stats, setStats] = useState({});
  const [gameDate, setGameDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('opponent_players').select('*').eq('opponent_id', opponent.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  }, [opponent.id]);

  const statsFor = (pid) => stats[pid] || {};

  const tagStat = (pid, key) => {
    setStats(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [key]: ((prev[pid]?.[key] || 0) + 1) }
    }));
  };

  const TAG_BUTTONS = [
    { key: '2PM', label: '2PM', pos: true }, { key: '2PA', label: '2PA', pos: false },
    { key: '3PM', label: '3PM', pos: true }, { key: '3PA', label: '3PA', pos: false },
    { key: 'FTM', label: 'FTM', pos: true }, { key: 'FTA', label: 'FTA', pos: false },
    { key: 'O', label: 'OREB', pos: true }, { key: 'D', label: 'DREB', pos: true },
    { key: 'AST', label: 'AST', pos: true }, { key: 'STL', label: 'STL', pos: true },
    { key: 'BS', label: 'BLK', pos: true }, { key: 'DF', label: 'DEFL', pos: true },
    { key: 'TO', label: 'TO', pos: false }, { key: 'PF', label: 'PF', pos: false },
    { key: 'CHG_taken', label: 'CHG', pos: true },
  ];

  const handleSave = async () => {
    if (!gameDate) { alert('Please enter a game date.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('scout_sessions').insert({
        opponent_id: opponent.id,
        team_id: team.id,
        game_date: gameDate,
        notes: notes.trim() || null,
        player_stats: stats,
        source: 'film',
      });
      if (error) throw new Error(error.message);
      onSaved();
      onClose();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 13 }}>🎬 Film Scout — {opponent.name}</div>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '6px 14px', background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Game date + notes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
            style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
          <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
            style={{ flex: 2, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
        </div>

        {/* Player selector */}
        <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Select Player</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {players.map(p => {
            const sel = selectedPlayer?.id === p.id;
            const pts = calcScoutPts(statsFor(p.id));
            const eff = calcScoutEff(statsFor(p.id));
            return (
              <button key={p.id} onClick={() => setSelectedPlayer(sel ? null : p)}
                style={{ padding: '7px 10px', borderRadius: 8, border: sel ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.border}`, background: sel ? COLORS.goldLight : COLORS.navyMid, color: sel ? COLORS.textDark : COLORS.text, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 900 }}>#{p.number || '—'} {p.name.split(' ')[0]}</div>
                <div style={{ fontSize: 9, color: sel ? COLORS.textDark : COLORS.muted }}>{pts}pts · {eff >= 0 ? '+' : ''}{eff}eff</div>
              </button>
            );
          })}
        </div>

        {players.length === 0 && (
          <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 14 }}>No players on this roster yet. Add them in the Roster tab first.</div>
        )}

        {/* Stat buttons */}
        {selectedPlayer && (
          <div>
            <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Tagging: #{selectedPlayer.number} {selectedPlayer.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {TAG_BUTTONS.map(btn => (
                <button key={btn.key} onClick={() => tagStat(selectedPlayer.id, btn.key)}
                  style={{
                    padding: '10px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontWeight: 700,
                    background: btn.pos ? COLORS.statPosBg : COLORS.statNegBg,
                    border: `2px solid ${btn.pos ? COLORS.statPosBorder : COLORS.statNegBorder}`,
                    color: btn.pos ? COLORS.statPosText : COLORS.statNegText,
                  }}>
                  <div style={{ fontSize: 10 }}>{btn.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{statsFor(selectedPlayer.id)[btn.key] || 0}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Running totals per player */}
        {Object.keys(stats).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Session Totals</div>
            {players.filter(p => stats[p.id]).map(p => {
              const s = statsFor(p.id);
              const pts = calcScoutPts(s);
              const eff = calcScoutEff(s);
              const reb = (s['O'] || 0) + (s['D'] || 0);
              return (
                <div key={p.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, minWidth: 80 }}>#{p.number} {p.name.split(' ')[0]}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: COLORS.muted }}>
                    <span>PTS <b style={{ color: COLORS.text }}>{pts}</b></span>
                    <span>REB <b style={{ color: COLORS.text }}>{reb}</b></span>
                    <span>AST <b style={{ color: COLORS.text }}>{s['AST'] || 0}</b></span>
                    <span>STL <b style={{ color: COLORS.text }}>{s['STL'] || 0}</b></span>
                    <span>TO <b style={{ color: COLORS.text }}>{s['TO'] || 0}</b></span>
                    <span style={{ color: eff >= 0 ? COLORS.green : COLORS.red }}>EFF <b>{eff >= 0 ? '+' : ''}{eff}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scout Hudl Import ────────────────────────────────────────────────────────
function ScoutHudlImport({ opponent, team, onClose, onSaved }) {
  const { colors: COLORS } = useTheme();
  const [step, setStep] = useState('upload');
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [oppPlayers, setOppPlayers] = useState([]);
  const [matchedStats, setMatchedStats] = useState([]);
  const [gameDate, setGameDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('opponent_players').select('*').eq('opponent_id', opponent.id).order('created_at')
      .then(({ data }) => { if (data) setOppPlayers(data); });
  }, [opponent.id]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('parsing');
    setError(null);

    try {
      const base64Data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });

      const prompt = `You are parsing a Hudl basketball box score PDF for scouting purposes. Extract the OPPONENT team's individual player stats (the second team listed, NOT the first team).

Return ONLY valid JSON, no markdown:
{
  "gameDate": "<date in YYYY-MM-DD format if visible, otherwise null>",
  "opponentName": "<opponent team name>",
  "players": [
    {
      "number": "<jersey number digits only>",
      "name": "<player name>",
      "pts": <number>,
      "fgm": <number>,
      "fga": <number>,
      "fg3m": <number>,
      "fg3a": <number>,
      "ftm": <number>,
      "fta": <number>,
      "oreb": <number>,
      "dreb": <number>,
      "ast": <number>,
      "defl": <number>,
      "stl": <number>,
      "blk": <number>,
      "to": <number>,
      "pf": <number>,
      "chg": <number>,
      "mins": <number>
    }
  ]
}

Rules:
- Extract the SECOND team's player stats (the opponent/away team)
- Only include players with any non-zero stats
- jersey number = digits only, no # symbol
- fgm/fga = TOTAL field goals including 3s
- mins = minutes played as decimal
- Missing stats = 0`;

      const response = await fetch('/api/parse-hudl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });

      const data = await response.json();
      if (!data.content || !data.content.length) {
        throw new Error('No content in response: ' + JSON.stringify(data));
      }

      const text = data.content.map(i => i.text || '').join('').trim();
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setParsedData(parsed);

      if (parsed.gameDate) setGameDate(parsed.gameDate);

      // Auto-match by jersey number to opponent roster
      const matched = (parsed.players || []).map(hp => {
        const rosterPlayer = oppPlayers.find(p =>
          String(p.number || '').replace('#', '').trim() === String(hp.number || '').replace('#', '').trim()
        );
        return {
          hudlName: hp.name,
          hudlNumber: hp.number,
          rosterPlayerId: rosterPlayer?.id || null,
          hudlStats: hp,
          include: true,
        };
      });
      setMatchedStats(matched);
      setStep('preview');
    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
      setStep('upload');
    }
  };

  const setRosterMatch = (idx, playerId) => {
    setMatchedStats(prev => prev.map((m, i) => i === idx ? { ...m, rosterPlayerId: playerId || null } : m));
  };

  const toggleInclude = (idx) => {
    setMatchedStats(prev => prev.map((m, i) => i === idx ? { ...m, include: !m.include } : m));
  };

  const handleSave = async () => {
    if (!gameDate) { alert('Please enter a game date.'); return; }
    setSaving(true);
    try {
      const playerStats = {};
      matchedStats.forEach(m => {
        if (!m.include || !m.rosterPlayerId) return;
        const s = m.hudlStats;
        const fg2m = Math.max(0, (s.fgm || 0) - (s.fg3m || 0));
        const fg2a = Math.max(0, (s.fga || 0) - (s.fg3a || 0));
        playerStats[m.rosterPlayerId] = {
          '2PM': fg2m, '2PA': fg2a,
          '3PM': s.fg3m || 0, '3PA': s.fg3a || 0,
          'FTM': s.ftm || 0, 'FTA': s.fta || 0,
          'O': s.oreb || 0, 'D': s.dreb || 0,
          'AST': s.ast || 0, 'DF': s.defl || 0,
          'STL': s.stl || 0, 'BS': s.blk || 0,
          'TO': s.to || 0, 'PF': s.pf || 0,
          'CHG_taken': s.chg || 0,
          'mins': s.mins || 0,
        };
      });

      const { error } = await supabase.from('scout_sessions').insert({
        opponent_id: opponent.id,
        team_id: team.id,
        game_date: gameDate,
        notes: notes.trim() || null,
        player_stats: playerStats,
        source: 'hudl',
      });
      if (error) throw new Error(error.message);
      onSaved();
      onClose();
    } catch (err) {
      setError('Save failed: ' + err.message);
      setSaving(false);
    }
  };

  const includedCount = matchedStats.filter(m => m.include && m.rosterPlayerId).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: COLORS.gold }}>
          <span style={{ color: '#ff6a00', fontWeight: 900, fontSize: 18 }}>H</span> Scout Import — {opponent.name}
        </div>
        {step === 'preview' && (
          <button onClick={handleSave} disabled={saving || includedCount === 0}
            style={{ padding: '6px 14px', background: includedCount > 0 ? COLORS.gold : COLORS.navyDark, border: 'none', borderRadius: 8, color: includedCount > 0 ? COLORS.textDark : COLORS.muted, fontWeight: 800, fontSize: 13, cursor: includedCount > 0 ? 'pointer' : 'default' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {step !== 'preview' && <div style={{ width: 60 }} />}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: 'center' }}>Upload Hudl Box Score</div>
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              Upload a Hudl PDF from any game {opponent.name} played. Claude will extract their individual player stats.
            </div>
            {error && (
              <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', maxWidth: 300, textAlign: 'center' }}>
                {error}
              </div>
            )}
            <label style={{ padding: '14px 28px', background: COLORS.gold, borderRadius: 10, color: COLORS.textDark, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Choose PDF
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
            </label>
          </div>
        )}

        {step === 'parsing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 48 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>Reading box score…</div>
            <div style={{ color: COLORS.muted, fontSize: 13 }}>Claude is extracting {opponent.name}'s player stats</div>
          </div>
        )}

        {step === 'preview' && parsedData && (
          <div>
            <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Map Players to Roster
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
                style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
                style={{ flex: 2, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
            </div>

            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>
              Map each Hudl player to {opponent.name}'s roster. Players not on the roster yet — add them in the Roster tab first.
            </div>

            {matchedStats.map((m, i) => {
              const s = m.hudlStats;
              const fg2m = Math.max(0, (s.fgm || 0) - (s.fg3m || 0));
              const fg2a = Math.max(0, (s.fga || 0) - (s.fg3a || 0));
              const pts = (fg2m * 2) + ((s.fg3m || 0) * 3) + (s.ftm || 0);
              return (
                <div key={i} style={{
                  background: m.include ? (m.rosterPlayerId ? 'rgba(200,168,75,0.08)' : 'rgba(255,255,255,0.03)') : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${m.include && m.rosterPlayerId ? COLORS.gold : COLORS.border}`,
                  borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 13 }}>
                      #{m.hudlNumber} {m.hudlName}
                      {s.mins ? <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 400, marginLeft: 6 }}>{s.mins} min</span> : null}
                    </div>
                    <button onClick={() => toggleInclude(i)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: m.include ? COLORS.redBg : 'rgba(255,255,255,0.07)', border: `1px solid ${m.include ? COLORS.red : COLORS.border}`, color: m.include ? COLORS.red : COLORS.muted }}>
                      {m.include ? 'Skip' : 'Include'}
                    </button>
                  </div>
                  {m.include && (
                    <select value={m.rosterPlayerId || ''} onChange={e => setRosterMatch(i, e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', background: COLORS.navyDark, border: `1px solid ${m.rosterPlayerId ? COLORS.gold : COLORS.border}`, borderRadius: 7, color: m.rosterPlayerId ? COLORS.gold : COLORS.muted, fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }}>
                      <option value="">— Map to roster player —</option>
                      {oppPlayers.map(p => (
                        <option key={p.id} value={p.id}>#{p.number || '—'} {p.name}</option>
                      ))}
                    </select>
                  )}
                  {m.include && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: COLORS.muted }}>
                      <span>PTS <b style={{ color: COLORS.text }}>{pts}</b></span>
                      <span>2FG <b style={{ color: COLORS.text }}>{fg2m}/{fg2a}</b></span>
                      <span>3FG <b style={{ color: COLORS.text }}>{s.fg3m || 0}/{s.fg3a || 0}</b></span>
                      <span>FT <b style={{ color: COLORS.text }}>{s.ftm || 0}/{s.fta || 0}</b></span>
                      <span>OR <b style={{ color: COLORS.text }}>{s.oreb || 0}</b></span>
                      <span>DR <b style={{ color: COLORS.text }}>{s.dreb || 0}</b></span>
                      <span>AST <b style={{ color: COLORS.text }}>{s.ast || 0}</b></span>
                      <span>STL <b style={{ color: COLORS.text }}>{s.stl || 0}</b></span>
                      <span>BLK <b style={{ color: COLORS.text }}>{s.blk || 0}</b></span>
                      <span>TO <b style={{ color: COLORS.text }}>{s.to || 0}</b></span>
                      <span>PF <b style={{ color: COLORS.text }}>{s.pf || 0}</b></span>
                    </div>
                  )}
                </div>
              );
            })}

            {error && (
              <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button onClick={handleSave} disabled={saving || includedCount === 0}
              style={{ width: '100%', padding: 14, background: includedCount > 0 ? COLORS.gold : COLORS.navyDark, border: 'none', borderRadius: 10, color: includedCount > 0 ? COLORS.textDark : COLORS.muted, fontWeight: 800, fontSize: 15, cursor: includedCount > 0 ? 'pointer' : 'default', marginTop: 8 }}>
              {saving ? 'Saving…' : `Save Scout Session (${includedCount} players) →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scout Report ─────────────────────────────────────────────────────────────
function ScoutReport({ opponent, team, onClose }) {
  const { colors: COLORS, teamName } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [oppPlayers, setOppPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('scout_sessions').select('*').eq('opponent_id', opponent.id).eq('team_id', team.id).order('game_date'),
      supabase.from('opponent_players').select('*').eq('opponent_id', opponent.id).order('created_at'),
    ]).then(([{ data: sess }, { data: players }]) => {
      setSessions(sess || []);
      setOppPlayers(players || []);
      setLoading(false);
    });
  }, [opponent.id, team.id]);

  // Aggregate stats across all sessions per player
  const playerAggregates = oppPlayers.map(p => {
    let gp = 0, totalMins = 0;
    const totals = {};
    SCOUT_STATS.forEach(s => { totals[s.key] = 0; });

    sessions.forEach(sess => {
      const st = sess.player_stats?.[p.id];
      if (!st) return;
      gp++;
      SCOUT_STATS.forEach(s => { totals[s.key] = (totals[s.key] || 0) + (st[s.key] || 0); });
      totalMins += st.mins || 0;
    });

    if (gp === 0) return null;

    const eff = calcScoutEff(totals);
    const pts = calcScoutPts(totals);
    const reb = (totals['O'] || 0) + (totals['D'] || 0);
    const minDecimal = totalMins;
    const per = minDecimal > 0 ? (eff / minDecimal) * 32 : 0;

    return {
      player: p, gp, totals, pts, eff, reb,
      ppg: gp > 0 ? pts / gp : 0,
      rpg: gp > 0 ? reb / gp : 0,
      apg: gp > 0 ? (totals['AST'] || 0) / gp : 0,
      epg: gp > 0 ? eff / gp : 0,
      per,
      fg2pct: totals['2PA'] > 0 ? Math.round((totals['2PM'] / totals['2PA']) * 100) : 0,
      fg3pct: totals['3PA'] > 0 ? Math.round((totals['3PM'] / totals['3PA']) * 100) : 0,
      ftpct: totals['FTA'] > 0 ? Math.round((totals['FTM'] / totals['FTA']) * 100) : 0,
    };
  }).filter(Boolean).sort((a, b) => b.epg - a.epg);

  const fmt1 = v => v.toFixed(1);

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: COLORS.navyDark, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.muted }}>Loading scout data…</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #scout-report-printable, #scout-report-printable * { visibility: visible; }
          #scout-report-printable { position: absolute; left: 0; top: 0; width: 100%; }
          #scout-no-print { display: none !important; }
        }
      `}</style>

      <div id="scout-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
        <div style={{ color: '#c8a84b', fontWeight: 800, fontSize: 13 }}>Scout Report — {opponent.name}</div>
        <button onClick={() => window.print()} style={{ background: '#c8a84b', border: 'none', color: '#0d1b2e', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>🖨 Print / PDF</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px', background: '#fff' }}>
        <div id="scout-report-printable" style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
          {/* Header */}
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '14px 18px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#c8a84b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>XOVR Scout Report</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{opponent.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Scouted by</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c8a84b' }}>{teamName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} · {playerAggregates.length} players</div>
            </div>
          </div>
          <div style={{ height: 4, background: '#c8a84b', marginBottom: 16 }} />

          {playerAggregates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No scout data yet. Import Hudl PDFs or tag film sessions first.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                    <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: 700 }}>Player</th>
                    <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: 700 }}>POS</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>GP</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>PPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>2FG%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>3FG%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>FT%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>RPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>APG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>SPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>TOV</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: '#c8a84b' }}>EFF</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: '#c8a84b' }}>PER</th>
                  </tr>
                </thead>
                <tbody>
                  {playerAggregates.map((r, i) => (
                    <tr key={r.player.id} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent', borderBottom: '1px solid #dde3ef' }}>
                      <td style={{ padding: '7px 6px', fontWeight: 700, color: '#1a3a6b' }}>{r.player.number || '—'}</td>
                      <td style={{ padding: '7px 6px', fontWeight: 600 }}>{r.player.name}</td>
                      <td style={{ padding: '7px 6px', color: '#666' }}>{r.player.position || '—'}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.gp}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>{fmt1(r.ppg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fg2pct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fg3pct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.ftpct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.rpg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.apg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1((r.totals['STL'] || 0) / r.gp)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1((r.totals['TO'] || 0) / r.gp)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: r.epg >= 0 ? '#16a34a' : '#dc2626' }}>
                        {r.epg >= 0 ? '+' : ''}{fmt1(r.epg)}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: '#4169e1' }}>
                        {fmt1(r.per)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Session log */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Scout Sessions</div>
              {sessions.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 11 }}>
                  <span style={{ color: '#888', minWidth: 80 }}>{s.game_date || '—'}</span>
                  <span style={{ background: s.source === 'hudl' ? '#fff3e0' : '#e8f5e9', color: s.source === 'hudl' ? '#e65100' : '#2e7d32', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                    {s.source === 'hudl' ? 'H Hudl' : '🎬 Film'}
                  </span>
                  {s.notes && <span style={{ color: '#666' }}>{s.notes}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, fontSize: 9, color: '#999', textAlign: 'center' }}>
            Generated by XOVR Basketball · {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Opponent Scout Screen ────────────────────────────────────────────────────
function OpponentScoutScreen({ opponent, team, role, onBack }) {
  const { colors: COLORS } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [showFilmTagger, setShowFilmTagger] = useState(false);
  const [showHudlImport, setShowHudlImport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadSessions = () => {
    supabase.from('scout_sessions').select('*').eq('opponent_id', opponent.id).eq('team_id', team.id).order('game_date', { ascending: false })
      .then(({ data }) => { if (data) setSessions(data); });
  };

  useEffect(() => { loadSessions(); }, [opponent.id, team.id]);

  const deleteSession = async (id) => {
    await supabase.from('scout_sessions').delete().eq('id', id);
    setConfirmDeleteId(null);
    loadSessions();
  };

  return (
    <div>
      {showFilmTagger && <ScoutFilmTagger opponent={opponent} team={team} onClose={() => setShowFilmTagger(false)} onSaved={loadSessions} />}
      {showHudlImport && <ScoutHudlImport opponent={opponent} team={team} onClose={() => setShowHudlImport(false)} onSaved={loadSessions} />}
      {showReport && <ScoutReport opponent={opponent} team={team} onClose={() => setShowReport(false)} />}

      <button onClick={onBack} style={{ marginBottom: 14, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>
        ← Back to {opponent.name}
      </button>

      <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {opponent.name} — Scouting
      </div>

      {/* Action buttons */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShowHudlImport(true)}
            style={{ flex: 1, padding: '10px 0', background: 'rgba(255,106,0,0.12)', border: '1px solid #ff6a00', color: '#ff6a00', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <span style={{ fontWeight: 900 }}>H</span> Hudl Import
          </button>
          <button onClick={() => setShowFilmTagger(true)}
            style={{ flex: 1, padding: '10px 0', background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🎬 Tag Film
          </button>
          {sessions.length > 0 && (
            <button onClick={() => setShowReport(true)}
              style={{ flex: 1, padding: '10px 0', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              📋 Report
            </button>
          )}
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <div style={{ padding: 20, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, textAlign: 'center', color: COLORS.muted, fontSize: 13 }}>
          No scout sessions yet. Import a Hudl PDF or tag some film to get started.
        </div>
      ) : (
        sessions.map(s => (
          <div key={s.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: s.source === 'hudl' ? 'rgba(255,106,0,0.15)' : 'rgba(34,197,94,0.15)', color: s.source === 'hudl' ? '#ff6a00' : COLORS.green, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 800 }}>
                    {s.source === 'hudl' ? 'H Hudl' : '🎬 Film'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{s.game_date || 'No date'}</span>
                </div>
                {s.notes && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{s.notes}</div>}
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                  {Object.keys(s.player_stats || {}).length} players tracked
                </div>
              </div>
              {canEdit && (
                confirmDeleteId === s.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => deleteSession(s.id)} style={{ padding: '6px 10px', background: COLORS.red, color: COLORS.text, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Confirm</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(s.id)} style={{ background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.red, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Delete</button>
                )
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Opponent Roster Screen ───────────────────────────────────────────────────
function OpponentRosterScreen({ opponent, role, team, onBack }) {
  const { colors: COLORS } = useTheme();
  const [tab, setTab] = useState('roster');
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadPlayers = () => {
    supabase.from('opponent_players').select('*').eq('opponent_id', opponent.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data || []); });
  };

  useEffect(() => { loadPlayers(); }, [opponent.id]);

  const addPlayer = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('opponent_players').insert({
      opponent_id: opponent.id, name: newName.trim(),
      number: newNumber.trim() || null, position: newPos.trim() || null,
    });
    if (!error) { setNewName(''); setNewNumber(''); setNewPos(''); loadPlayers(); }
    else alert('Error adding player: ' + error.message);
  };

  const removePlayer = async (id) => {
    await supabase.from('opponent_players').delete().eq('id', id);
    loadPlayers();
  };

  const updateField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('opponent_players').update({ [field]: value }).eq('id', id);
  };

  const POSITIONS = ['G', 'SG', 'SF', 'PF', 'C'];

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      flex: 1, padding: '8px 0', fontWeight: tab === key ? 800 : 600, fontSize: 12,
      background: tab === key ? COLORS.gold : COLORS.navyMid,
      color: tab === key ? COLORS.textDark : COLORS.muted,
      border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`,
      borderRadius: 7, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>
        ← Back to Opponents
      </button>

      <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>{opponent.name}</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {tabBtn('roster', '👥 Roster')}
        {tabBtn('scout', '🔍 Scout')}
      </div>

      {tab === 'roster' && (
        <div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)}
                style={{ width: 50, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ flex: 1, minWidth: 120, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <select value={newPos} onChange={e => setNewPos(e.target.value)}
                style={{ width: 60, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }}>
                <option value="">Pos</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={addPlayer}
                style={{ padding: '8px 14px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>
                + Add
              </button>
            </div>
          )}
          {players.map(p => {
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                {isEditing ? (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input value={p.number || ''} onChange={e => updateField(p.id, 'number', e.target.value)} placeholder="#"
                        style={{ width: 50, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 8px', color: COLORS.text, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
                      <input value={p.name || ''} onChange={e => updateField(p.id, 'name', e.target.value)} placeholder="Player name"
                        style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13, boxSizing: 'border-box' }} />
                      <select value={p.position || ''} onChange={e => updateField(p.id, 'position', e.target.value)}
                        style={{ width: 60, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 4px', color: COLORS.text, fontSize: 13 }}>
                        <option value="">—</option>
                        {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setEditingId(null)}
                      style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                      Done
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 7, background: COLORS.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>
                      {p.number || '—'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{p.position || '—'}</div>
                    </div>
                    {canEdit && <button onClick={() => setEditingId(p.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Edit</button>}
                    {canEdit && <button onClick={() => removePlayer(p.id)} style={{ background: COLORS.redBg, border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Remove</button>}
                  </div>
                )}
              </div>
            );
          })}
          {players.length === 0 && <p style={{ color: COLORS.muted }}>No players added yet.</p>}
        </div>
      )}

      {tab === 'scout' && (
        <OpponentScoutScreen opponent={opponent} team={team} role={role} onBack={() => setTab('roster')} />
      )}
    </div>
  );
}

// ── Opponents Screen ─────────────────────────────────────────────────────────
function OpponentsScreen({ team, role }) {
  const { colors: COLORS } = useTheme();
  const [opponents, setOpponents] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [rosterOpponent, setRosterOpponent] = useState(null);
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
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    updateOpponentField(id, 'logo_url', dataUrl);
  };

  if (rosterOpponent) {
    return <OpponentRosterScreen opponent={rosterOpponent} role={role} team={team} onBack={() => setRosterOpponent(null)} />;
  }

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
                <button onClick={() => setRosterOpponent(o)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.gold, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  Scout
                </button>
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

function RosterScreen({ team, role }) {
  const { colors: COLORS } = useTheme();
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadPlayers = () => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data); });
  };

  useEffect(() => { loadPlayers(); }, [team.id]);

  const addPlayer = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('players').insert({
      team_id: team.id, name: newName.trim(), number: newNumber.trim() || null,
    });
    if (!error) { setNewName(''); setNewNumber(''); loadPlayers(); }
  };

  const removePlayer = async (id) => {
    await supabase.from('players').delete().eq('id', id);
    loadPlayers();
  };

  const updatePlayerField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('players').update({ [field]: value }).eq('id', id);
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)}
            style={{ width: 56, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)}
            style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addPlayer}
            style={{ padding: '8px 16px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>
            + Add
          </button>
        </div>
      )}
      {players.map(p => {
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={p.number || ''} onChange={e => updatePlayerField(p.id, 'number', e.target.value)} placeholder="#"
                    style={{ width: 56, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13, textAlign: 'center' }} />
                  <input value={p.name || ''} onChange={e => updatePlayerField(p.id, 'name', e.target.value)} placeholder="Player name"
                    style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['Fr', 'So', 'Jr', 'Sr'].map(grade => (
                    <button key={grade} onClick={() => updatePlayerField(p.id, 'grade', p.grade === grade ? null : grade)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: p.grade === grade ? COLORS.gold : COLORS.navyDark, color: p.grade === grade ? COLORS.textDark : COLORS.muted, border: `1px solid ${p.grade === grade ? COLORS.gold : COLORS.border}` }}>
                      {grade}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEditingId(null)}
                  style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  Done
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: COLORS.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>
                  {p.number || '—'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{p.grade || '—'}</div>
                </div>
                {canEdit && <button onClick={() => setEditingId(p.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Edit</button>}
                {canEdit && <button onClick={() => removePlayer(p.id)} style={{ background: COLORS.redBg, border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Remove</button>}
              </div>
            )}
          </div>
        );
      })}
      {players.length === 0 && <p style={{ color: COLORS.muted }}>No players yet.</p>}
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

function CourtBackground() {
  const W = 1080, H = 660;
  const stroke = '#1a5566';
  const sw = 2.5;
  const margin = 30;
  const courtL = margin, courtR = W - margin, courtT = margin, courtB = H - margin;
  const courtW = courtR - courtL, courtH = courtB - courtT;
  const midX = W / 2, midY = H / 2;
  const keyW = courtH * 0.33, keyD = courtW * 0.175;
  const ftR = keyW * 0.52;
  const basketOffset = 50;
  const tpCornerY = courtH * 0.155;
  const tpArcR = courtW * 0.285;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
      <rect width={W} height={H} fill="#1a1a1a" />
      <rect x={courtL} y={courtT} width={courtW} height={courtH} fill="none" stroke={stroke} strokeWidth={sw} />
      <line x1={midX} y1={courtT} x2={midX} y2={courtB} stroke={stroke} strokeWidth={sw} />
      <circle cx={midX} cy={midY} r={courtH * 0.09} fill="none" stroke={stroke} strokeWidth={sw} />
      <circle cx={midX} cy={midY} r={5} fill={stroke} />
      <rect x={courtL} y={midY - keyW / 2} width={keyD} height={keyW} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtL + keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${courtL + keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtL + keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${courtL + keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="10 7" />
      <circle cx={courtL + basketOffset} cy={midY} r={10} fill="none" stroke={stroke} strokeWidth={sw} />
      <line x1={courtL + basketOffset - 18} y1={midY - 26} x2={courtL + basketOffset - 18} y2={midY + 26} stroke={stroke} strokeWidth={sw + 1} />
      <line x1={courtL} y1={courtT + tpCornerY} x2={courtL + keyD * 1.55} y2={courtT + tpCornerY} stroke={stroke} strokeWidth={sw} />
      <line x1={courtL} y1={courtB - tpCornerY} x2={courtL + keyD * 1.55} y2={courtB - tpCornerY} stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtL + keyD * 1.55} ${courtT + tpCornerY} A ${tpArcR} ${tpArcR} 0 0 1 ${courtL + keyD * 1.55} ${courtB - tpCornerY}`} fill="none" stroke={stroke} strokeWidth={sw} />
      <rect x={courtR - keyD} y={midY - keyW / 2} width={keyD} height={keyW} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtR - keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${courtR - keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtR - keyD} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${courtR - keyD} ${midY + ftR}`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="10 7" />
      <circle cx={courtR - basketOffset} cy={midY} r={10} fill="none" stroke={stroke} strokeWidth={sw} />
      <line x1={courtR - basketOffset + 18} y1={midY - 26} x2={courtR - basketOffset + 18} y2={midY + 26} stroke={stroke} strokeWidth={sw + 1} />
      <line x1={courtR} y1={courtT + tpCornerY} x2={courtR - keyD * 1.55} y2={courtT + tpCornerY} stroke={stroke} strokeWidth={sw} />
      <line x1={courtR} y1={courtB - tpCornerY} x2={courtR - keyD * 1.55} y2={courtB - tpCornerY} stroke={stroke} strokeWidth={sw} />
      <path d={`M ${courtR - keyD * 1.55} ${courtT + tpCornerY} A ${tpArcR} ${tpArcR} 0 0 0 ${courtR - keyD * 1.55} ${courtB - tpCornerY}`} fill="none" stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

const BW = {
  navyDark: '#060f1a', navyMid: '#0d1b2e', navy: '#1a3a6b',
  border: '#243d6b', gold: '#c8a84b', goldLight: 'rgba(200,168,75,0.15)',
  text: '#e8edf5', muted: '#8a99b8', textDark: '#0d1b2e',
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');
  const [productLogo, setProductLogo] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from('team_memberships').select('role, teams(id, name)').then(({ data, error }) => {
      if (!error && data) {
        const seen = new Set();
        setTeams(data
          .map(m => ({ id: m.teams.id, name: m.teams.name, role: m.role }))
          .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; })
        );
      }
    });
    supabase.from('app_settings').select('product_logo').limit(1).maybeSingle()
      .then(({ data, error }) => { if (!error && data?.product_logo) setProductLogo(data.product_logo); });
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
    teal: '#1a1a1a',
    gold: '#e7b977',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.45)',
    inputBg: 'rgba(255,255,255,0.08)',
  };

  const LOGO_URL = 'https://xqfykowofjswojwgdcmj.supabase.co/storage/v1/object/public/Assets/Untitled%20design.PNG';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: XOVR.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: XOVR.gold, fontFamily: 'sans-serif', fontSize: 16, letterSpacing: 2 }}>Loading...</div>
    </div>
  );

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: XOVR.teal, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: '48vh', minHeight: 280, overflow: 'hidden', flexShrink: 0 }}>
          <CourtBackground />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={LOGO_URL} alt="XOVR Basketball"
              style={{ width: 240, height: 240, objectFit: 'contain', filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.8))' }} />
          </div>
        </div>
        <div style={{ flex: 1, background: XOVR.teal, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{
            fontSize: 30, fontWeight: 900, marginBottom: 26, textAlign: 'center',
            color: XOVR.gold, WebkitTextStroke: '1.5px #000',
            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 3px 6px rgba(0,0,0,0.5)',
            letterSpacing: 3, fontStyle: 'italic',
          }}>
            {mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME, COACH!'}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
            <input type="email" placeholder="Username" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ padding: '15px 22px', background: XOVR.inputBg, border: `2px solid ${XOVR.gold}`, borderRadius: 50, color: XOVR.text, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ padding: '15px 22px', background: XOVR.inputBg, border: `2px solid ${XOVR.gold}`, borderRadius: 50, color: XOVR.text, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            {mode === 'signin' && (
              <div style={{ textAlign: 'center', marginTop: -6 }}>
                <button type="button" onClick={handleForgotPassword}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
                  Forgot Password?
                </button>
              </div>
            )}
            <button type="submit"
              style={{ marginTop: 8, padding: '15px', fontWeight: 900, fontSize: 18, background: XOVR.gold, color: '#000', border: 'none', borderRadius: 50, cursor: 'pointer', letterSpacing: 1, width: '55%', alignSelf: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
              {mode === 'signup' ? 'Sign Up' : 'Login'}
            </button>
          </form>
          {message && <p style={{ marginTop: 14, fontSize: 13, color: message.startsWith('Error') ? '#ff6b6b' : XOVR.gold, textAlign: 'center', maxWidth: 300 }}>{message}</p>}
          <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(''); }}
            style={{ marginTop: 18, background: 'none', border: 'none', color: XOVR.muted, cursor: 'pointer', fontSize: 13 }}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>XOVR BASKETBALL © 2026</div>
        </div>
      </div>
    );
  }

  if (selectedTeam) return <TeamView team={selectedTeam} onBack={() => setSelectedTeam(null)} />;

  return (
    <div style={{ minHeight: '100vh', background: BW.navyDark, color: BW.text, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      {productLogo && <img src={productLogo} alt="" style={{ height: 80, width: 'auto', objectFit: 'contain', marginBottom: 8 }} />}
      <img src={LOGO_URL} alt="XOVR Basketball" style={{ width: 240, height: 240, objectFit: 'contain', marginBottom: 8 }} />
      <div style={{ fontSize: 11, color: BW.muted, letterSpacing: 1, marginBottom: 4 }}>{session.user.email}</div>
      <div style={{ fontSize: 13, color: BW.gold, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Choose a Team</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {teams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeam(t)}
            style={{ padding: 14, fontSize: 15, fontWeight: 700, background: BW.navyMid, color: BW.text, border: `1px solid ${BW.gold}`, borderRadius: 10, cursor: 'pointer', letterSpacing: 0.5, textAlign: 'left' }}>
            {t.name}
          </button>
        ))}
      </div>
      <button onClick={handleSignOut}
        style={{ marginTop: 30, background: 'none', border: 'none', color: BW.muted, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
        Sign Out
      </button>
      <div style={{ position: 'absolute', bottom: 20, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>XOVR BASKETBALL © 2026</div>
    </div>
  );
}

export default App;
