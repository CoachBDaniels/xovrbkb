import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { FinishedGameView, GAME_FORMAT_PRESETS, FormatPicker, STAT_DEFS, calcPts, calcEff } from './GameReports';
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
  const [playerAggregates, setPlayerAggregates] = useState([]);

  const [statSheet, setStatSheet] = useState(null);
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

    const [{ data: opps }, { data: games }, { data: entries }, { data: players }] = await Promise.all([
      supabase.from('opponents').select('*').eq('team_id', team.id),
      supabase.from('games').select('*, opponents(name)').in('season_id', ids),
      supabase.from('schedule_entries').select('*, opponents(name, abbr)').in('season_id', ids).order('date'),
      supabase.from('players').select('*').eq('team_id', team.id).order('created_at'),
    ]);
    setOpponents(opps || []);
    setAllGames(games || []);

    const finished = (games || []).filter(g => g.is_final);
    const aggs = (players || []).map(p => {
      let gp = 0, totalPts = 0, totalEff = 0, totalMinSec = 0;
      const totals = {};
      STAT_DEFS.forEach(d => { totals[d.key] = 0; });
      finished.forEach(g => {
        const st = g.player_stats?.[p.id];
        if (!st) return;
        gp++;
        STAT_DEFS.forEach(d => { totals[d.key] = (totals[d.key] || 0) + (st[d.key] || 0); });
        totalPts += calcPts(st);
        totalEff += calcEff(st);
        totalMinSec += g.meta?.minutesLog?.[p.id] || 0;
      });
      const reb = (totals['O'] || 0) + (totals['D'] || 0);
      const minDecimal = totalMinSec / 60;
      return {
        player: p, gp,
        ppg:  gp > 0 ? totalPts / gp : 0,
        epg:  gp > 0 ? totalEff / gp : 0,
        rpg:  gp > 0 ? reb / gp : 0,
        apg:  gp > 0 ? (totals['AST'] || 0) / gp : 0,
        spg:  gp > 0 ? (totals['STL'] || 0) / gp : 0,
        per:  minDecimal > 0 ? totalEff / minDecimal : 0,
      };
    }).filter(r => r.gp > 0);
    setPlayerAggregates(aggs);

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

  if (loading) {
    return <p style={{ color: COLORS.muted }}>Loading...</p>;
  }

  if (seasonIds.length === 0) {
    return (
      <div>
        <p style={{ color: COLORS.muted }}>Create a season first (Seasons tab) to see your dashboard here.</p>
      </div>
    );
  }

  const MiniScoreboard = ({ game, entry, onTap, showFinal }) => {
    const oppName = game?.opponents?.name || entry?.opponents?.name || game?.meta?.opponentName || 'Opponent';
    const oppAbbr = entry?.opponents?.abbr;
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
            {isFinal ? (
              <div style={{ fontSize: 8, fontWeight: 800, color: '#ff3b30', letterSpacing: 1 }}>FINAL</div>
            ) : (
              <div style={{ fontSize: 8, fontWeight: 700, color: COLORS.muted }}>{fmtDate(dateToShow)}</div>
            )}
          </div>
        )}
        {teamRow(oppPrimary, opponentRecord?.logo_url, (oppAbbr || oppName || '?').slice(0, 1), oppSecondary, oppSecondary, oppName, theirScore, false)}
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
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Last 4 Games</div>
        <QuadrantGrid
          emptyMessage="No games played yet."
          items={recentGames.map(g => ({
            key: g.id,
            render: () => <MiniScoreboard game={g} onTap={() => setViewingGame(g)} showFinal={true} />,
          }))}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Tag Games</div>
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

      <div>
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Next 2 Games</div>
        <QuadrantGrid
          emptyMessage="No upcoming games scheduled."
          items={upcomingEntries.map(entry => ({
            key: entry.id,
            render: () => <MiniScoreboard entry={entry} game={null} onTap={null} showFinal={true} />,
          }))}
        />
      </div>

      {playerAggregates.length > 0 && (() => {
        const top3 = (key) => [...playerAggregates].sort((a, b) => b[key] - a[key]).slice(0, 3);
        const fmt = (v) => v.toFixed(1);

        const LeaderboardCard = ({ title, rows }) => (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
            <div style={{ background: COLORS.navy, padding: '4px 8px', fontSize: 9, fontWeight: 800, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
            {rows.map((r, i) => (
              <div key={r.player.id} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
                background: `linear-gradient(90deg, ${COLORS.navy} 0%, #000 78%, #000 100%)`,
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.5)', width: 12, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    #{r.player.number || '—'} {r.player.name}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.gold, flexShrink: 0 }}>{r.value}</div>
              </div>
            ))}
            {rows.length === 0 && (
              <div style={{ padding: '8px', fontSize: 10, color: COLORS.muted, background: COLORS.navyMid }}>No data yet</div>
            )}
          </div>
        );

        const LEADERS = [
          { title: 'PPG',      rows: top3('ppg').map(r => ({ player: r.player, value: fmt(r.ppg) })) },
          { title: 'EFF/Game', rows: top3('epg').map(r => ({ player: r.player, value: fmt(r.epg) })) },
          { title: 'RPG',      rows: top3('rpg').map(r => ({ player: r.player, value: fmt(r.rpg) })) },
          { title: 'APG',      rows: top3('apg').map(r => ({ player: r.player, value: fmt(r.apg) })) },
          { title: 'SPG',      rows: top3('spg').map(r => ({ player: r.player, value: fmt(r.spg) })) },
          { title: 'PER',      rows: top3('per').map(r => ({ player: r.player, value: fmt(r.per) })) },
        ];

        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Season Leaders</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {LEADERS.map(card => (
                <LeaderboardCard key={card.title} title={card.title} rows={card.rows} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setStatSheet('totals')}
                style={{ flex: 1, padding: '8px 0', background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                🖨 Totals
              </button>
              <button onClick={() => setStatSheet('averages')}
                style={{ flex: 1, padding: '8px 0', background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                🖨 Averages
              </button>
            </div>
          </div>
        );
      })()}

      {statSheet && (() => {
        const isAvg = statSheet === 'averages';
        const pct = (m, a) => a === 0 ? '—' : Math.round((m / a) * 100) + '%';
        const fmt1 = (v) => v.toFixed(1);
        const finished = allGames.filter(g => g.is_final);
        const rows = playerAggregates.map(r => {
          const p = r.player;
          const totals = {};
          let totalPts = 0;
          finished.forEach(g => {
            const st = g.player_stats?.[p.id];
            if (!st) return;
            ['3PM','3PA','2PM','2PA','FTM','FTA','O','D','AST','STL','TO'].forEach(k => {
              totals[k] = (totals[k] || 0) + (st[k] || 0);
            });
            totalPts += (st['3PM']||0)*3 + (st['2PM']||0)*2 + (st['FTM']||0);
          });
          const totalEff = r.epg * r.gp;
          const gp = r.gp;
          const fgm = (totals['2PM']||0) + (totals['3PM']||0);
          const fga = fgm + (totals['2PA']||0) + (totals['3PA']||0);
          const reb = (totals['O']||0) + (totals['D']||0);
          return {
            player: p, gp,
            pts:   isAvg ? fmt1(totalPts / gp) : totalPts,
            fgma:  isAvg ? `${fmt1(fgm/gp)}/${fmt1(fga/gp)}` : `${fgm}/${fga}`,
            fgPct: pct(fgm, fga),
            tpm:   isAvg ? fmt1((totals['3PM']||0)/gp) : (totals['3PM']||0),
            tpa:   isAvg ? fmt1(((totals['3PM']||0)+(totals['3PA']||0))/gp) : (totals['3PM']||0)+(totals['3PA']||0),
            tpPct: pct(totals['3PM']||0, (totals['3PM']||0)+(totals['3PA']||0)),
            ftm:   isAvg ? fmt1((totals['FTM']||0)/gp) : (totals['FTM']||0),
            fta:   isAvg ? fmt1(((totals['FTM']||0)+(totals['FTA']||0))/gp) : (totals['FTM']||0)+(totals['FTA']||0),
            reb:   isAvg ? fmt1(reb/gp) : reb,
            ast:   isAvg ? fmt1((totals['AST']||0)/gp) : (totals['AST']||0),
            stl:   isAvg ? fmt1((totals['STL']||0)/gp) : (totals['STL']||0),
            to:    isAvg ? fmt1((totals['TO']||0)/gp)  : (totals['TO']||0),
            eff:   isAvg ? fmt1(r.epg) : Math.round(totalEff),
            per:   fmt1(r.per),
          };
        }).sort((a, b) => parseFloat(b.eff) - parseFloat(a.eff));

        const th = { padding: '6px 5px', fontWeight: 700, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', background: '#1a3a6b', color: '#fff' };
        const td = { padding: '6px 5px', textAlign: 'center', borderBottom: '1px solid #dde3ef', fontSize: 10 };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #stat-sheet-printable, #stat-sheet-printable * { visibility: visible; }
                #stat-sheet-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
                #stat-sheet-no-print { display: none !important; }
              }
            `}</style>
            <div id="stat-sheet-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
              <button onClick={() => setStatSheet(null)} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 6 }}>✕ Close</button>
              <div style={{ color: '#c8a84b', fontWeight: 800, fontSize: 13 }}>Season {isAvg ? 'Averages' : 'Totals'}</div>
              <button onClick={() => window.print()} style={{ background: '#c8a84b', border: 'none', color: '#0d1b2e', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>🖨 Print / PDF</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#fff', padding: '24px 16px' }}>
              <div id="stat-sheet-printable" style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '14px 18px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{teamName} Basketball</div>
                  <div style={{ fontSize: 13, color: '#c8a84b', fontWeight: 700 }}>Season {isAvg ? 'Averages' : 'Totals'}</div>
                </div>
                <div style={{ height: 4, background: '#c8a84b', marginBottom: 14 }} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead><tr>
                      <th style={{ ...th, textAlign: 'left' }}>#</th>
                      <th style={{ ...th, textAlign: 'left' }}>Player</th>
                      <th style={th}>GP</th>
                      <th style={th}>PTS</th>
                      <th style={th}>FGM/A</th>
                      <th style={th}>FG%</th>
                      <th style={th}>3PM/A</th>
                      <th style={th}>3P%</th>
                      <th style={th}>FTM/A</th>
                      <th style={th}>REB</th>
                      <th style={th}>AST</th>
                      <th style={th}>STL</th>
                      <th style={th}>TO</th>
                      <th style={th}>EFF</th>
                      <th style={th}>PER</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.player.id} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent' }}>
                          <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: '#1a3a6b' }}>{r.player.number || '—'}</td>
                          <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{r.player.name}</td>
                          <td style={td}>{r.gp}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{r.pts}</td>
                          <td style={td}>{r.fgma}</td>
                          <td style={td}>{r.fgPct}</td>
                          <td style={td}>{r.tpm}/{r.tpa}</td>
                          <td style={td}>{r.tpPct}</td>
                          <td style={td}>{r.ftm}/{r.fta}</td>
                          <td style={td}>{r.reb}</td>
                          <td style={td}>{r.ast}</td>
                          <td style={td}>{r.stl}</td>
                          <td style={td}>{r.to}</td>
                          <td style={{ ...td, fontWeight: 800, color: parseFloat(r.eff) >= 0 ? '#16a34a' : '#dc2626' }}>{parseFloat(r.eff) >= 0 ? '+' : ''}{r.eff}</td>
                          <td style={{ ...td, fontWeight: 800, color: '#4169e1' }}>{r.per}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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