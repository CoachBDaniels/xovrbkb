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
    supabase.from('opponents').select('*').eq('team_id', team.id).then(({ data, error }) => { if (!error) setOpponents(data); });
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
    width: '100%',
    padding: 8,
    background: COLORS.navyDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7,
    color: COLORS.text,
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
              <button onClick={() => openFormatPicker(e)}
                style={{ padding: '6px 12px', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
                Tag Game
              </button>
            ) : (
              <span style={{ fontSize: 12, color: COLORS.muted }}>Not yet played</span>
            )}
            {canEdit && <button onClick={() => removeEntry(e.id)} style={{ color: COLORS.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>}
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
    width: '100%',
    padding: 8,
    background: COLORS.navyDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7,
    color: COLORS.text,
    boxSizing: 'border-box',
  };

  if (selected) {
    return <ScheduleScreen season={selected} team={team} role={role} onBackToSeasons={() => setSelected(null)} />;
  }

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: `1px solid ${COLORS.border}`, background: COLORS.navyMid, borderRadius: 8, padding: 10 }}>
          <input
            placeholder='e.g. "Summer 26"'
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={inputStyle}
          />
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
          <button
            onClick={addSeason}
            disabled={!newName.trim() || !newStartDate || !newEndDate}
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
