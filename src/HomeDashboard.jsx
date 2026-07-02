mport { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { FinishedGameView, GAME_FORMAT_PRESETS, FormatPicker } from './GameReports';
import { ActiveGame } from './GameScreen';


const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!m || !d) return dateStr;
  return `${MONTH_NAMES[m - 1]} ${d}`;
}


export default function HomeDashboard({ team, role, onNavigateToTab }) {
  const { colors: COLORS, logo, teamName } = useTheme();
  const canEdit = role === 'head_coach' || role === 'assistant';

  const [loading, setLoading] = useState(true);
  const [seasonIds, setSeasonIds] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [untaggedEntries, setUntaggedEntries] = useState([]);
  const [upcomingEntries, setUpcomingEntries] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [allGames, setAllGames] = useState([]);

  const [viewingGame, setViewingGame] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [pickingFormatFor, setPickingFormatFor] = useState(null);
  const [pickedFormat, setPickedFormat] = useState(GAME_FORMAT_PRESETS[0]);


  const loadDashboard = async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: seasons } = await supabase.from('seasons').select('id').eq('team_id', team.id);
    const ids = (seasons || []).map(s => s.id);
    setSeasonIds(ids);
    if (ids.length === 0) { setLoading(false); return; }

    const [{ data: opps }, { data: games }, { data: entries }] = await Promise.all([
      supabase.from('opponents').select('*').eq('team_id', team.id),
      supabase.from('games').select('*, opponents(name)').in('season_id', ids),
      supabase.from('schedule_entries').select('*, opponents(name, abbr)').in('season_id', ids).order('date'),
    ]);
    setOpponents(opps || []);
    setAllGames(games || []);

    const finished = (games || []).filter(g => g.is_final);
    finished.sort((a, b) => (b.meta?.date || '').localeCompare(a.meta?.date || ''));
    setRecentGames(finished.slice(0, 4));

    const isTagged = (entry) => (games || []).some(g => g.opponents?.name === entry.opponents?.name && g.meta?.date === entry.date && g.is_final);

    const pastUntagged = (entries || [])
      .filter(e => e.date < todayStr && !isTagged(e))
      .sort((a, b) => b.date.localeCompare(a.date));
    setUntaggedEntries(pastUntagged);

    const future = (entries || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2);
    setUpcomingEntries(future);

    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, [team.id]);

  const openFormatPicker = (entry) => {
    setPickedFormat(GAME_FORMAT_PRESETS[0]);
    setPickingFormatFor(entry);
  };

  const confirmFormatAndTag = async () => {
    const entry = pickingFormatFor;
    if (!entry) return;
    const opp = opponents.find(o => o.id === entry.opponent_id);
    const { data, error } = await supabase.from('games').insert({
      season_id: entry.season_id,
      opponent_id: entry.opponent_id,
      meta: { opponentName: opp?.name || entry.opponents?.name, date: entry.date },
      player_stats: {},
      game_format: pickedFormat,
    }).select().single();
    if (error) { alert('Error starting game: ' + error.message); return; }
    setPickingFormatFor(null);
    setActiveGame(data);
  };

  const findGameForEntry = (entry) => {
    return allGames.find(g => g.opponents?.name === entry.opponents?.name && g.meta?.date === entry.date) || null;
  };

  if (viewingGame) {
    return <FinishedGameView team={team} game={viewingGame} onBack={() => { setViewingGame(null); loadDashboard(); }} />;
  }
  if (activeGame) {
    return <ActiveGame team={team} game={activeGame} onSaved={() => { setActiveGame(null); loadDashboard(); }} onBack={() => { setActiveGame(null); loadDashboard(); }} backLabel="Back to Home" />;
  }

  if (loading) return <p style={{ color: COLORS.muted }}>Loading...</p>;

  if (seasonIds.length === 0) {
    return <div><p style={{ color: COLORS.muted }}>Create a season first (Seasons tab) to see your dashboard here.</p></div>;
  }

  const MiniScoreboard = ({ game, entry, onTap, showFinal }) => {
    const oppName = game?.opponents?.name || entry?.opponents?.name || game?.meta?.opponentName || 'Opponent';
    const opponentRecord = opponents.find(o => o.name === oppName);
    const oppPrimary = opponentRecord?.primary_color || '#6b7280';
    const oppSecondary = opponentRecord?.secondary_color || '#9ca3af';
    const ourScore = game ? (game.meta?.ourScore ?? 0) : null;
    const theirScore = game ? (game.meta?.theirScore ?? 0) : null;
    const isFinal = !!game?.is_final;
    const dateToShow = game?.meta?.date || entry?.date;

    const teamRow = (color, logoSrc, fallbackInitial, fallbackColor, fallbackBorder, name, score, isTop) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px',
        background: `linear-gradient(90deg, ${color} 0%, #000 78%, #000 100%)`,
        borderRadius: isTop ? '6px 6px 0 0' : '0 0 6px 6px',
      }}>
        {logoSrc
          ? <img src={logoSrc} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: fallbackColor, border: fallbackBorder ? `1px solid ${fallbackBorder}` : 'none' }}>
              {fallbackInitial}
            </div>}
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.5, color: isTop ? COLORS.gold : fallbackColor, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
          {name}
        </div>
        {score != null && (
          <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{score}</div>
        )}
      </div>
    );

    return (
      <button onClick={onTap} disabled={!onTap}
        style={{ width: '100%', display: 'block', border: 'none', padding: 0, cursor: onTap ? 'pointer' : 'default', borderRadius: 6, overflow: 'hidden', borderBottom: `1px solid ${COLORS.border}`, background: 'none' }}>
        {teamRow(COLORS.navy, logo, (teamName || '?').slice(0, 1), COLORS.gold, null, teamName || 'TM', ourScore, true)}
        {showFinal && (
          <div style={{ padding: '2px 0', textAlign: 'center', background: '#0d1b2e' }}>
            {isFinal
              ? <div style={{ fontSize: 8, fontWeight: 800, color: '#ff3b30', letterSpacing: 1 }}>FINAL</div>
              : <div style={{ fontSize: 8, fontWeight: 700, color: COLORS.muted }}>{fmtDate(dateToShow)}</div>}
          </div>
        )}
        {teamRow(oppPrimary, opponentRecord?.logo_url, (oppName || '?').slice(0, 1), oppSecondary, oppSecondary, oppName, theirScore, false)}
        {dateToShow && (
          <div style={{ fontSize: 8, color: COLORS.muted, textAlign: 'right', padding: '2px 4px 0' }}>{fmtDate(dateToShow)}</div>
        )}
      </button>
    );
  };

  const QuadrantGrid = ({ items, emptyMessage }) => {
    if (items.length === 0) {
      return <div style={{ padding: 14, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, fontSize: 13 }}>{emptyMessage}</div>;
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.key || i}>{item.render()}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Last 4 Games</div>
        <QuadrantGrid
          emptyMessage="No games played yet."
          items={recentGames.map(g => ({
            key: g.id,
            render: () => <MiniScoreboard game={g} onTap={() => setViewingGame(g)} showFinal={true} />,
          }))}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Tag Games</div>
        <QuadrantGrid
          emptyMessage="No games waiting to be tagged."
          items={untaggedEntries.map(entry => {
            const existingGame = findGameForEntry(entry);
            return {
              key: entry.id,
              render: () => (
                <div>
                  <MiniScoreboard entry={entry} game={existingGame} onTap={null} showFinal={false} />
                  <button
                    onClick={() => existingGame ? setActiveGame(existingGame) : openFormatPicker(entry)}
                    style={{ width: '100%', marginTop: 4, padding: 6, background: COLORS.gold, border: 'none', color: COLORS.textDark, borderRadius: 6, fontWeight: 800, fontSize: 10, cursor: 'pointer' }}>
                    {existingGame ? 'Continue Tagging' : 'Tag Game'}
                  </button>
                </div>
              ),
            };
          })}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Next 2 Games</div>
        <QuadrantGrid
          emptyMessage="No upcoming games scheduled."
          items={upcomingEntries.map(entry => ({
            key: entry.id,
            render: () => <MiniScoreboard entry={entry} game={null} onTap={null} showFinal={true} />,
          }))}
        />
      </div>

      {pickingFormatFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Game Format</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>vs. {pickingFormatFor.opponents?.name || '—'} · {fmtDate(pickingFormatFor.date)}</div>
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
