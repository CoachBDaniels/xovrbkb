import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { FinishedGameView, GAME_FORMAT_PRESETS, FormatPicker } from './GameReports';
import { ActiveGame } from './GameScreen';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtScheduleDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!m || !d) return dateStr;
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function HudlImportModal({ entry, team, season, opponents, onClose, onImported }) {
  const { colors: COLORS } = useTheme();
  const [step, setStep] = useState('upload');
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matchedStats, setMatchedStats] = useState([]);
  const [scores, setScores] = useState({ ours: '', theirs: '' });

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  }, [team.id]);

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

      const prompt = `You are parsing a Hudl basketball box score PDF. Extract player stats for BOTH teams.

Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "ourScore": <number>,
  "theirScore": <number>,
  "ourPlayers": [
    {
      "number": "<jersey number digits only, no #>",
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
  ],
  "oppPlayers": [
    {
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
      "chg": <number>
    }
  ]
}

Rules:
- ourPlayers = the first team listed (BCHS or the home/away team that is OUR team)
- oppPlayers = all individual players from the OPPONENT team (we will sum them)
- Only include players with minutes > 0 or any non-zero stats
- jersey number = digits only, no # symbol
- fgm/fga = TOTAL field goals including 3s
- Missing or blank stats = 0`;

      // Call our Netlify function instead of Anthropic directly
      const response = await fetch('/api/parse-hudl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
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
      const text = data.content?.map(i => i.text || '').join('').trim();
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setParsedData(parsed);
      setScores({ ours: String(parsed.ourScore || ''), theirs: String(parsed.theirScore || '') });

      const matched = (parsed.ourPlayers || []).map(hp => {
        const rosterPlayer = players.find(p =>
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

  const handleImport = async () => {
    setStep('importing');
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
        };
      });

      const oppPlayers = parsedData?.oppPlayers || [];
      const oppTotals = oppPlayers.reduce((acc, s) => {
        acc.fgm  += s.fgm  || 0; acc.fga  += s.fga  || 0;
        acc.fg3m += s.fg3m || 0; acc.fg3a += s.fg3a || 0;
        acc.ftm  += s.ftm  || 0; acc.fta  += s.fta  || 0;
        acc.oreb += s.oreb || 0; acc.dreb += s.dreb || 0;
        acc.ast  += s.ast  || 0; acc.defl += s.defl || 0;
        acc.stl  += s.stl  || 0; acc.blk  += s.blk  || 0;
        acc.to   += s.to   || 0; acc.pf   += s.pf   || 0;
        acc.chg  += s.chg  || 0;
        return acc;
      }, { fgm:0, fga:0, fg3m:0, fg3a:0, ftm:0, fta:0, oreb:0, dreb:0, ast:0, defl:0, stl:0, blk:0, to:0, pf:0, chg:0 });

      const opp2m = Math.max(0, oppTotals.fgm - oppTotals.fg3m);
      const opp2a = Math.max(0, oppTotals.fga - oppTotals.fg3a);
      playerStats['OPP'] = {
        '2PM': opp2m, '2PA': opp2a,
        '3PM': oppTotals.fg3m, '3PA': oppTotals.fg3a,
        'FTM': oppTotals.ftm, 'FTA': oppTotals.fta,
        'O': oppTotals.oreb, 'D': oppTotals.dreb,
        'AST': oppTotals.ast, 'DF': oppTotals.defl,
        'STL': oppTotals.stl, 'BS': oppTotals.blk,
        'TO': oppTotals.to, 'PF': oppTotals.pf,
        'CHG_taken': oppTotals.chg,
      };

      const oppRecord = opponents.find(o => o.id === entry.opponent_id);
      const { error: insertError } = await supabase.from('games').insert({
        season_id: season.id,
        opponent_id: entry.opponent_id,
        meta: {
          opponentName: oppRecord?.name || entry.opponents?.name,
          date: entry.date,
          ourScore: scores.ours,
          theirScore: scores.theirs,
          importedFromHudl: true,
        },
        player_stats: playerStats,
        game_format: GAME_FORMAT_PRESETS[0],
        is_final: true,
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw new Error(insertError.message);
      setStep('done');
      setTimeout(() => { onImported(); onClose(); }, 1500);
    } catch (err) {
      setError('Import failed: ' + err.message);
      setStep('preview');
    }
  };

  const oppName = entry.opponents?.name || '—';
  const includedCount = matchedStats.filter(m => m.include && m.rosterPlayerId).length;
  const unmappedCount = matchedStats.filter(m => m.include && !m.rosterPlayerId).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: COLORS.gold }}>
          <span style={{ color: '#ff6a00', fontWeight: 900, fontSize: 18 }}>H</span> Hudl Import
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: 'center' }}>Upload Hudl Box Score</div>
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center' }}>vs. {oppName} · {fmtScheduleDate(entry.date)}</div>
            <div style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              Export the Box Score Report PDF from Hudl and upload it here. Claude will extract the stats and you'll match them to your roster.
            </div>
            {error && (
              <div style={{ color: COLORS.red, fontSize: 13, textAlign: 'center', background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', maxWidth: 300 }}>
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
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center' }}>Claude is extracting player stats from your Hudl PDF</div>
          </div>
        )}

        {step === 'preview' && parsedData && (
          <div>
            <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Review & Map Players
            </div>

            <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Our Score</div>
                <input type="number" value={scores.ours} onChange={e => setScores(s => ({ ...s, ours: e.target.value }))}
                  style={{ width: 70, padding: '4px 0', textAlign: 'center', fontSize: 28, fontWeight: 900, color: COLORS.gold, background: 'none', border: 'none', outline: 'none' }} />
              </div>
              <div style={{ color: COLORS.muted, fontSize: 20, fontWeight: 700 }}>–</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Their Score</div>
                <input type="number" value={scores.theirs} onChange={e => setScores(s => ({ ...s, theirs: e.target.value }))}
                  style={{ width: 70, padding: '4px 0', textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#fff', background: 'none', border: 'none', outline: 'none' }} />
              </div>
            </div>

            {parsedData.oppPlayers && parsedData.oppPlayers.length > 0 && (() => {
              const totals = parsedData.oppPlayers.reduce((acc, s) => {
                acc.pts  += s.pts  || 0; acc.fgm  += s.fgm  || 0; acc.fga  += s.fga  || 0;
                acc.fg3m += s.fg3m || 0; acc.fg3a += s.fg3a || 0; acc.ftm  += s.ftm  || 0;
                acc.fta  += s.fta  || 0; acc.oreb += s.oreb || 0; acc.dreb += s.dreb || 0;
                acc.ast  += s.ast  || 0; acc.stl  += s.stl  || 0; acc.blk  += s.blk  || 0;
                acc.to   += s.to   || 0;
                return acc;
              }, { pts:0, fgm:0, fga:0, fg3m:0, fg3a:0, ftm:0, fta:0, oreb:0, dreb:0, ast:0, stl:0, blk:0, to:0 });
              return (
                <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: COLORS.red, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {oppName} — Team Totals (auto-summed)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: COLORS.muted }}>
                    <span>PTS <b style={{ color: COLORS.text }}>{totals.pts}</b></span>
                    <span>FG <b style={{ color: COLORS.text }}>{totals.fgm}/{totals.fga}</b></span>
                    <span>3FG <b style={{ color: COLORS.text }}>{totals.fg3m}/{totals.fg3a}</b></span>
                    <span>FT <b style={{ color: COLORS.text }}>{totals.ftm}/{totals.fta}</b></span>
                    <span>OR <b style={{ color: COLORS.text }}>{totals.oreb}</b></span>
                    <span>DR <b style={{ color: COLORS.text }}>{totals.dreb}</b></span>
                    <span>AST <b style={{ color: COLORS.text }}>{totals.ast}</b></span>
                    <span>STL <b style={{ color: COLORS.text }}>{totals.stl}</b></span>
                    <span>BLK <b style={{ color: COLORS.text }}>{totals.blk}</b></span>
                    <span>TO <b style={{ color: COLORS.text }}>{totals.to}</b></span>
                  </div>
                </div>
              );
            })()}

            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>
              Map each Hudl player to your roster. Unmapped players won't be imported.
            </div>

            {matchedStats.map((m, i) => {
              const s = m.hudlStats;
              const fg2m = Math.max(0, (s.fgm || 0) - (s.fg3m || 0));
              const fg2a = Math.max(0, (s.fga || 0) - (s.fg3a || 0));
              return (
                <div key={i} style={{
                  background: m.include ? (m.rosterPlayerId ? 'rgba(200,168,75,0.08)' : 'rgba(255,255,255,0.03)') : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${m.include && m.rosterPlayerId ? COLORS.gold : COLORS.border}`,
                  borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 13 }}>
                      #{m.hudlNumber} {m.hudlName}
                      <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 400, marginLeft: 6 }}>from Hudl</span>
                    </div>
                    <button onClick={() => toggleInclude(i)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: m.include ? COLORS.redBg : 'rgba(255,255,255,0.07)', border: `1px solid ${m.include ? COLORS.red : COLORS.border}`, color: m.include ? COLORS.red : COLORS.muted }}>
                      {m.include ? 'Skip' : 'Include'}
                    </button>
                  </div>

                  {m.include && (
                    <select value={m.rosterPlayerId || ''} onChange={e => setRosterMatch(i, e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', background: COLORS.navyDark, border: `1px solid ${m.rosterPlayerId ? COLORS.gold : COLORS.border}`, borderRadius: 7, color: m.rosterPlayerId ? COLORS.gold : COLORS.muted, fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }}>
                      <option value="">— Select roster player —</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>#{p.number || '—'} {p.name}</option>
                      ))}
                    </select>
                  )}

                  {m.include && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: COLORS.muted }}>
                      <span>PTS <b style={{ color: COLORS.text }}>{s.pts || 0}</b></span>
                      <span>2FG <b style={{ color: COLORS.text }}>{fg2m}/{fg2a}</b></span>
                      <span>3FG <b style={{ color: COLORS.text }}>{s.fg3m || 0}/{s.fg3a || 0}</b></span>
                      <span>FT <b style={{ color: COLORS.text }}>{s.ftm || 0}/{s.fta || 0}</b></span>
                      <span>OR <b style={{ color: COLORS.text }}>{s.oreb || 0}</b></span>
                      <span>DR <b style={{ color: COLORS.text }}>{s.dreb || 0}</b></span>
                      <span>AST <b style={{ color: COLORS.text }}>{s.ast || 0}</b></span>
                      <span>STL <b style={{ color: COLORS.text }}>{s.stl || 0}</b></span>
                      <span>BLK <b style={{ color: COLORS.text }}>{s.blk || 0}</b></span>
                      <span>TO <b style={{ color: COLORS.text }}>{s.to || 0}</b></span>
                      <span>DEFL <b style={{ color: COLORS.text }}>{s.defl || 0}</b></span>
                      <span>PF <b style={{ color: COLORS.text }}>{s.pf || 0}</b></span>
                      <span>CHG <b style={{ color: COLORS.text }}>{s.chg || 0}</b></span>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 8, padding: '10px 12px', background: COLORS.navyMid, borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: COLORS.text }}>
                <span style={{ color: COLORS.green, fontWeight: 700 }}>{includedCount} players mapped</span>
                {unmappedCount > 0 && <span style={{ color: COLORS.muted }}> · {unmappedCount} will be skipped</span>}
                <span style={{ color: COLORS.muted }}> · opponent team totals auto-summed</span>
              </div>
            </div>

            {error && (
              <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button onClick={handleImport} disabled={includedCount === 0}
              style={{ width: '100%', padding: 14, background: includedCount > 0 ? COLORS.gold : COLORS.navyDark, border: 'none', borderRadius: 10, color: includedCount > 0 ? COLORS.textDark : COLORS.muted, fontWeight: 800, fontSize: 15, cursor: includedCount > 0 ? 'pointer' : 'default' }}>
              Import Game →
            </button>
          </div>
        )}

        {step === 'importing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 48 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>Importing stats…</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 48 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>Import Complete!</div>
            <div style={{ color: COLORS.muted, fontSize: 13 }}>Game saved as final with Hudl stats.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleScreen({ season, team, role, onBackToSeasons }) {
  const { colors: COLORS } = useTheme();
  const [entries, setEntries] = useState([]);
  const [games, setGames] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [oppId, setOppId] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('Home');
  const [gameType, setGameType] = useState('Area');
  const [viewingGame, setViewingGame] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [pickingFormatFor, setPickingFormatFor] = useState(null);
  const [pickedFormat, setPickedFormat] = useState(GAME_FORMAT_PRESETS[0]);
  const [hudlEntry, setHudlEntry] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadEntries = () => {
    supabase.from('schedule_entries').select('*, opponents(name, abbr)').eq('season_id', season.id).order('date')
      .then(({ data, error }) => { if (!error) setEntries(data); });
  };

  const loadGames = () => {
    supabase.from('games').select('*, opponents(name)').eq('season_id', season.id)
      .then(({ data, error }) => { if (!error) setGames(data); });
  };

  useEffect(() => {
    loadEntries();
    loadGames();
    supabase.from('opponents').select('*').eq('team_id', team.id)
      .then(({ data, error }) => { if (!error) setOpponents(data); });
  }, [season.id, team.id]);

  const findGameForEntry = (entry) => {
    const oppName = entry.opponents?.name;
    return games.find(g => g.opponents?.name === oppName && g.meta?.date === entry.date) || null;
  };

  const addEntry = async () => {
    if (!oppId || !date) return;
    const { error } = await supabase.from('schedule_entries').insert({
      season_id: season.id, opponent_id: oppId, date, location, game_type: gameType,
    });
    if (!error) { setOppId(''); setDate(''); loadEntries(); }
  };

  const removeEntry = async (id) => {
    await supabase.from('schedule_entries').delete().eq('id', id);
    loadEntries();
  };

  const openFormatPicker = (entry) => {
    setPickedFormat(GAME_FORMAT_PRESETS[0]);
    setPickingFormatFor(entry);
  };

  const confirmFormatAndTag = async () => {
    const entry = pickingFormatFor;
    if (!entry) return;
    const opp = opponents.find(o => o.id === entry.opponent_id);
    const { data, error } = await supabase.from('games').insert({
      season_id: season.id,
      opponent_id: entry.opponent_id,
      meta: { opponentName: opp?.name || entry.opponents?.name, date: entry.date },
      player_stats: {},
      game_format: pickedFormat,
    }).select().single();
    if (error) { alert('Error starting game: ' + error.message); return; }
    setPickingFormatFor(null);
    setActiveGame(data);
  };

  const inputStyle = {
    width: '100%', padding: 8,
    background: COLORS.navyDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7, color: COLORS.text,
    boxSizing: 'border-box',
  };

  const headerRow = (rightButton) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
      <button onClick={onBackToSeasons} style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
        ← Back to All Seasons
      </button>
      <h4 style={{ color: COLORS.text, margin: 0, textAlign: 'center', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{season.name} - Schedule</h4>
      {rightButton || <div style={{ width: 0, flexShrink: 0 }} />}
    </div>
  );

  if (viewingGame) {
    return <FinishedGameView team={team} game={viewingGame} onBack={() => setViewingGame(null)} />;
  }

  if (activeGame) {
    return (
      <div>
        {headerRow(
          <button onClick={() => { setActiveGame(null); loadGames(); }} style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
            Back to Schedule →
          </button>
        )}
        <ActiveGame team={team} game={activeGame} onSaved={() => { setActiveGame(null); loadGames(); }} />
      </div>
    );
  }

  return (
    <div>
      {headerRow()}

      {hudlEntry && (
        <HudlImportModal
          entry={hudlEntry}
          team={team}
          season={season}
          opponents={opponents}
          onClose={() => setHudlEntry(null)}
          onImported={() => { loadEntries(); loadGames(); }}
        />
      )}

      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: `1px solid ${COLORS.border}`, background: COLORS.navyMid, borderRadius: 8, padding: 10 }}>
          <select value={oppId} onChange={e => setOppId(e.target.value)} style={inputStyle}>
            <option value="">Select opponent...</option>
            {opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={location} onChange={e => setLocation(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option>Home</option><option>Away</option><option>Neutral</option>
            </select>
            <select value={gameType} onChange={e => setGameType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option>Area</option><option>Non-Area</option><option>Playoff</option><option>Tournament</option>
            </select>
          </div>
          <button onClick={addEntry} style={{ padding: 8, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add to Schedule</button>
        </div>
      )}

      {entries.map(e => {
        const game = findGameForEntry(e);
        const ourScore = game ? (game.meta?.ourScore ?? 0) : null;
        const theirScore = game ? (game.meta?.theirScore ?? 0) : null;
        const isWin = game && Number(ourScore) > Number(theirScore);
        const isLoss = game && Number(ourScore) < Number(theirScore);
        return (
          <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: COLORS.text, fontWeight: 600 }}>{e.opponents?.name || '—'}</div>
              <div style={{ color: COLORS.muted, fontSize: 12 }}>{fmtScheduleDate(e.date)} · {e.location} · {e.game_type}</div>
            </div>
            {game ? (
              <>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.text }}>
                    {game.is_final && (
                      <span style={{ color: isWin ? COLORS.green : isLoss ? COLORS.red : COLORS.muted, marginRight: 6 }}>
                        {isWin ? 'W' : isLoss ? 'L' : 'T'}
                      </span>
                    )}
                    {ourScore}-{theirScore}
                  </div>
                  {!game.is_final && <div style={{ fontSize: 11, color: COLORS.gold }}>In progress</div>}
                </div>
                {game.is_final ? (
                  <button onClick={() => setViewingGame(game)}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
                    View Stats
                  </button>
                ) : (
                  <button onClick={() => setActiveGame(game)}
                    style={{ padding: '6px 12px', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
                    Continue Tagging
                  </button>
                )}
              </>
            ) : canEdit ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => openFormatPicker(e)}
                  style={{ padding: '6px 12px', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
                  Tag Game
                </button>
                <button onClick={() => setHudlEntry(e)}
                  style={{ padding: '6px 12px', background: 'rgba(255,106,0,0.12)', border: '1px solid #ff6a00', color: '#ff6a00', borderRadius: 6, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                  H Import
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: COLORS.muted }}>Not yet played</span>
            )}
            {canEdit && (
              <button onClick={() => removeEntry(e.id)} style={{ color: COLORS.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
            )}
          </div>
        );
      })}
      {entries.length === 0 && <p style={{ color: COLORS.muted }}>No games scheduled yet.</p>}

      {pickingFormatFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Game Format</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>vs. {pickingFormatFor.opponents?.name || '—'} · {fmtScheduleDate(pickingFormatFor.date)}</div>
            <FormatPicker value={pickedFormat} onChange={setPickedFormat} />
            <button onClick={confirmFormatAndTag} style={{ width: '100%', padding: 11, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 14 }}>
              Start Game →
            </button>
            <button onClick={() => setPickingFormatFor(null)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeasonsScreen({ team, role }) {
  const { colors: COLORS } = useTheme();
  const [seasons, setSeasons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const canEdit = role === 'head_coach' || role === 'assistant';

  const loadSeasons = () => {
    supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setSeasons(data); });
  };

  useEffect(() => { loadSeasons(); }, [team.id]);

  const addSeason = async () => {
    if (!newName.trim() || !newStartDate || !newEndDate) return;
    if (newEndDate < newStartDate) { alert('End date must be after the start date.'); return; }
    const { error } = await supabase.from('seasons').insert({
      team_id: team.id, name: newName.trim(), start_date: newStartDate, end_date: newEndDate,
    });
    if (!error) { setNewName(''); setNewStartDate(''); setNewEndDate(''); loadSeasons(); }
    else alert('Error creating season: ' + error.message);
  };

  const inputStyle = {
    width: '100%', padding: 8,
    background: COLORS.navyDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7, color: COLORS.text,
    boxSizing: 'border-box',
  };

  if (selected) {
    return <ScheduleScreen season={selected} team={team} role={role} onBackToSeasons={() => setSelected(null)} />;
  }

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: `1px solid ${COLORS.border}`, background: COLORS.navyMid, borderRadius: 8, padding: 10 }}>
          <input placeholder='e.g. "Summer 26"' value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Start date</div>
              <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>End date</div>
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <button onClick={addSeason} disabled={!newName.trim() || !newStartDate || !newEndDate}
            style={{
              padding: '8px 16px',
              background: (newName.trim() && newStartDate && newEndDate) ? COLORS.gold : COLORS.navyDark,
              color: (newName.trim() && newStartDate && newEndDate) ? COLORS.textDark : COLORS.muted,
              border: 'none', borderRadius: 7, fontWeight: 'bold',
              cursor: (newName.trim() && newStartDate && newEndDate) ? 'pointer' : 'default',
            }}>
            + Add Season
          </button>
        </div>
      )}
      {seasons.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: 10, borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer', color: COLORS.text }} onClick={() => setSelected(s)}>
          <div style={{ flex: 1 }}>
            <div>{s.name}</div>
            {s.start_date && s.end_date && (
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>{fmtScheduleDate(s.start_date)} – {fmtScheduleDate(s.end_date)}</div>
            )}
          </div>
          <span style={{ color: COLORS.muted }}>→</span>
        </div>
      ))}
      {seasons.length === 0 && <p style={{ color: COLORS.muted }}>No seasons yet.</p>}
    </div>
  );
}
