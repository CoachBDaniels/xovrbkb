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
function calcPts(s) {
  return ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0);
}
function calcEff(s) {
  const pos = ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0)
    + (s['O'] || 0) + (s['D'] || 0) + (s['AST'] || 0)
    + (s['STL'] || 0) + (s['BS'] || 0) + (s['DF'] || 0) + (s['CHG_taken'] || 0);
  const neg = (s['TO'] || 0) + (s['PF'] || 0)
    + (s['2PA'] || 0) + (s['3PA'] || 0) + (s['FTA'] || 0);
  return pos - neg;
}

// ── Player Personal Dashboard ─────────────────────────────────────────────────
function PlayerDashboard({ playerRecord, team, userId }) {
  const { colors: COLORS, logo, teamName } = useTheme();
  const [tab, setTab] = useState('mystats');
  const [games, setGames] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: seasonsData } = await supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at', { ascending: false });
      setSeasons(seasonsData || []);
      const active = (seasonsData || []).find(s => s.start_date <= todayStr && todayStr <= s.end_date);
      const season = active || (seasonsData || [])[0];
      setCurrentSeason(season);

      if (season) {
        const [{ data: gamesData }, { data: playersData }, { data: oppsData }] = await Promise.all([
          supabase.from('games').select('*, opponents(name)').eq('season_id', season.id).eq('is_final', true).order('created_at'),
          supabase.from('players').select('*').eq('team_id', team.id).order('created_at'),
          supabase.from('opponents').select('*').eq('team_id', team.id),
        ]);
        setGames(gamesData || []);
        setAllPlayers(playersData || []);
        setOpponents(oppsData || []);
      }
      setLoading(false);
    };
    load();
  }, [team.id]);

  const myStats = games.reduce((acc, g) => {
    const s = g.player_stats?.[playerRecord.id];
    if (!s) return acc;
    acc.gp++;
    acc.pts += calcPts(s);
    acc.eff += calcEff(s);
    acc.reb += (s['O'] || 0) + (s['D'] || 0);
    acc.ast += s['AST'] || 0;
    acc.stl += s['STL'] || 0;
    acc.to += s['TO'] || 0;
    acc.fg2m += s['2PM'] || 0;
    acc.fg2a += (s['2PM'] || 0) + (s['2PA'] || 0);
    acc.fg3m += s['3PM'] || 0;
    acc.fg3a += (s['3PM'] || 0) + (s['3PA'] || 0);
    acc.ftm += s['FTM'] || 0;
    acc.fta += (s['FTM'] || 0) + (s['FTA'] || 0);
    return acc;
  }, { gp: 0, pts: 0, eff: 0, reb: 0, ast: 0, stl: 0, to: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 });

  const fmt1 = v => v.toFixed(1);
  const pct = (m, a) => a === 0 ? '—' : Math.round((m / a) * 100) + '%';
  const gp = myStats.gp;
  const ppg = gp > 0 ? myStats.pts / gp : 0;
  const epg = gp > 0 ? myStats.eff / gp : 0;
  const rpg = gp > 0 ? myStats.reb / gp : 0;
  const apg = gp > 0 ? myStats.ast / gp : 0;
  const spg = gp > 0 ? myStats.stl / gp : 0;

  // Leaderboard ranks
  const playerAggs = allPlayers.map(p => {
    let pgp = 0, ppts = 0, peff = 0;
    games.forEach(g => {
      const s = g.player_stats?.[p.id];
      if (!s) return;
      pgp++;
      ppts += calcPts(s);
      peff += calcEff(s);
    });
    return { id: p.id, ppg: pgp > 0 ? ppts / pgp : 0, epg: pgp > 0 ? peff / pgp : 0 };
  }).filter(p => p.ppg > 0 || p.epg > 0);

  const myPpgRank = [...playerAggs].sort((a, b) => b.ppg - a.ppg).findIndex(p => p.id === playerRecord.id) + 1;
  const myEpgRank = [...playerAggs].sort((a, b) => b.epg - a.epg).findIndex(p => p.id === playerRecord.id) + 1;

  const rankLabel = (rank) => {
    if (rank === 1) return '🥇 1st';
    if (rank === 2) return '🥈 2nd';
    if (rank === 3) return '🥉 3rd';
    return `#${rank}`;
  };

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      flex: 1, padding: '7px 2px', fontWeight: tab === key ? 800 : 600,
      fontSize: 11, lineHeight: 1.2,
      background: tab === key ? COLORS.gold : 'rgba(255,255,255,0.08)',
      color: tab === key ? COLORS.textDark : COLORS.text,
      border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`,
      borderRadius: 7, cursor: 'pointer', textAlign: 'center',
    }}>{label}</button>
  );

  if (loading) return <p style={{ color: COLORS.muted, padding: 24 }}>Loading...</p>;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.navyDark, color: COLORS.text, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: COLORS.navy, borderBottom: `3px solid ${COLORS.gold}`, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {logo && <img src={logo} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover' }} />}
          <div>
            <div style={{ fontSize: 10, color: COLORS.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{teamName}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>
              #{playerRecord.number || '—'} {playerRecord.name}
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{playerRecord.position || ''} {playerRecord.grade || ''}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 7, cursor: 'pointer', fontSize: 11 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 600, margin: '0 auto' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {tabBtn('mystats', 'MY STATS')}
          {tabBtn('schedule', 'SCHEDULE')}
          {tabBtn('roster', 'ROSTER')}
          {tabBtn('scout', 'SCOUT')}
        </div>

        {/* MY STATS tab */}
        {tab === 'mystats' && (
          <div>
            {gp === 0 ? (
              <div style={{ color: COLORS.muted, textAlign: 'center', padding: 40 }}>No stats yet this season.</div>
            ) : (
              <>
                {/* Season averages */}
                <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Season Averages — {gp} GP
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'PPG', value: fmt1(ppg) },
                    { label: 'EFF/G', value: fmt1(epg), color: epg >= 0 ? COLORS.green : COLORS.red },
                    { label: 'RPG', value: fmt1(rpg) },
                    { label: 'APG', value: fmt1(apg) },
                    { label: 'SPG', value: fmt1(spg) },
                    { label: 'FG%', value: pct(myStats.fg2m + myStats.fg3m, myStats.fg2a + myStats.fg3a) },
                    { label: '3P%', value: pct(myStats.fg3m, myStats.fg3a) },
                    { label: 'FT%', value: pct(myStats.ftm, myStats.fta) },
                    { label: 'TO/G', value: fmt1(myStats.to / gp) },
                  ].map(item => (
                    <div key={item.label} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: item.color || COLORS.gold }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Team rankings */}
                <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Team Rankings
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <div style={{ flex: 1, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>PPG</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold }}>{myPpgRank > 0 ? rankLabel(myPpgRank) : '—'}</div>
                    <div style={{ fontSize: 10, color: COLORS.muted }}>{fmt1(ppg)} pts/game</div>
                  </div>
                  <div style={{ flex: 1, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>EFF/Game</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold }}>{myEpgRank > 0 ? rankLabel(myEpgRank) : '—'}</div>
                    <div style={{ fontSize: 10, color: epg >= 0 ? COLORS.green : COLORS.red }}>{epg >= 0 ? '+' : ''}{fmt1(epg)} eff/game</div>
                  </div>
                </div>

                {/* Game log */}
                <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Game Log
                </div>
                {games.filter(g => g.player_stats?.[playerRecord.id]).map(g => {
                  const s = g.player_stats[playerRecord.id];
                  const pts = calcPts(s);
                  const eff = calcEff(s);
                  const reb = (s['O'] || 0) + (s['D'] || 0);
                  const fg2m = s['2PM'] || 0;
                  const fg2a = (s['2PM'] || 0) + (s['2PA'] || 0);
                  const fg3m = s['3PM'] || 0;
                  const fg3a = (s['3PM'] || 0) + (s['3PA'] || 0);
                  const ftm = s['FTM'] || 0;
                  const fta = (s['FTM'] || 0) + (s['FTA'] || 0);
                  const ourScore = Number(g.meta?.ourScore || 0);
                  const theirScore = Number(g.meta?.theirScore || 0);
                  const isWin = ourScore > theirScore;
                  return (
                    <div key={g.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 13 }}>vs. {g.opponents?.name || g.meta?.opponentName}</span>
                          <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: 8 }}>{g.meta?.date || ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isWin ? COLORS.green : COLORS.red }}>{isWin ? 'W' : 'L'}</span>
                          <span style={{ fontSize: 11, color: COLORS.muted }}>{ourScore}-{theirScore}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: COLORS.muted }}>
                        <span>PTS <b style={{ color: COLORS.text, fontSize: 12 }}>{pts}</b></span>
                        <span>REB <b style={{ color: COLORS.text }}>{reb}</b></span>
                        <span>AST <b style={{ color: COLORS.text }}>{s['AST'] || 0}</b></span>
                        <span>STL <b style={{ color: COLORS.text }}>{s['STL'] || 0}</b></span>
                        <span>TO <b style={{ color: COLORS.text }}>{s['TO'] || 0}</b></span>
                        <span>FG <b style={{ color: COLORS.text }}>{fg2m+fg3m}/{fg2a+fg3a}</b></span>
                        <span>3FG <b style={{ color: COLORS.text }}>{fg3m}/{fg3a}</b></span>
                        <span>FT <b style={{ color: COLORS.text }}>{ftm}/{fta}</b></span>
                        <span style={{ color: eff >= 0 ? COLORS.green : COLORS.red }}>EFF <b>{eff >= 0 ? '+' : ''}{eff}</b></span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* SCHEDULE tab */}
        {tab === 'schedule' && (
          <div>
            {seasons.map(s => (
              <SeasonViewReadOnly key={s.id} season={s} team={team} opponents={opponents} COLORS={COLORS} />
            ))}
          </div>
        )}

        {/* ROSTER tab */}
        {tab === 'roster' && (
          <RosterViewReadOnly team={team} COLORS={COLORS} />
        )}

        {/* SCOUT tab */}
        {tab === 'scout' && (
          <ScoutViewReadOnly team={team} COLORS={COLORS} />
        )}
      </div>
    </div>
  );
}

// ── Read-only season view for players ────────────────────────────────────────
function SeasonViewReadOnly({ season, team, opponents, COLORS }) {
  const [expanded, setExpanded] = useState(false);
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (!expanded) return;
    supabase.from('games').select('*, opponents(name)').eq('season_id', season.id).eq('is_final', true).order('created_at')
      .then(({ data }) => { if (data) setGames(data); });
  }, [expanded, season.id]);

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
        <span>{season.name}</span>
        <span style={{ color: COLORS.muted }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 10 }}>
          {games.length === 0 && <p style={{ color: COLORS.muted, fontSize: 12 }}>No final games yet.</p>}
          {games.map(g => {
            const ourScore = g.meta?.ourScore || 0;
            const theirScore = g.meta?.theirScore || 0;
            const isWin = Number(ourScore) > Number(theirScore);
            return (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px', borderBottom: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, color: COLORS.text }}>vs. {g.opponents?.name || g.meta?.opponentName}</span>
                  <span style={{ color: COLORS.muted, marginLeft: 8 }}>{g.meta?.date || ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: isWin ? COLORS.green : COLORS.red }}>{isWin ? 'W' : 'L'}</span>
                  <span style={{ color: COLORS.text, fontWeight: 700 }}>{ourScore}-{theirScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Read-only roster view for players ────────────────────────────────────────
function RosterViewReadOnly({ team, COLORS }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  }, [team.id]);

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Team Roster</div>
      {players.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: COLORS.gold, border: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
            {p.number || '—'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{p.name}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{p.grade || '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Read-only scout view for players ─────────────────────────────────────────
function ScoutViewReadOnly({ team, COLORS }) {
  const [opponents, setOpponents] = useState([]);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [oppPlayers, setOppPlayers] = useState([]);

  useEffect(() => {
    supabase.from('opponents').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setOpponents(data); });
  }, [team.id]);

  useEffect(() => {
    if (!selectedOpp) return;
    Promise.all([
      supabase.from('scout_sessions').select('*').eq('opponent_id', selectedOpp.id).eq('team_id', team.id),
      supabase.from('opponent_players').select('*').eq('opponent_id', selectedOpp.id),
    ]).then(([{ data: sess }, { data: players }]) => {
      setSessions(sess || []);
      setOppPlayers(players || []);
    });
  }, [selectedOpp]);

  if (selectedOpp) {
    // Aggregate scout data
    const SCOUT_STATS_KEYS = ['2PM','2PA','3PM','3PA','FTM','FTA','O','D','AST','STL','BS','TO','PF','DF','CHG_taken'];
    const playerAggs = oppPlayers.map(p => {
      let gp = 0;
      const totals = {};
      SCOUT_STATS_KEYS.forEach(k => { totals[k] = 0; });
      sessions.forEach(sess => {
        const st = sess.player_stats?.[p.id];
        if (!st) return;
        gp++;
        SCOUT_STATS_KEYS.forEach(k => { totals[k] += st[k] || 0; });
      });
      if (gp === 0) return null;
      const pts = (totals['2PM'] * 2) + (totals['3PM'] * 3) + totals['FTM'];
      const eff = pts + totals['O'] + totals['D'] + totals['AST'] + totals['STL'] + totals['BS'] + totals['DF'] + totals['CHG_taken']
        - totals['TO'] - totals['PF'] - totals['2PA'] - totals['3PA'] - totals['FTA'];
      return {
        player: p, gp,
        ppg: pts / gp,
        epg: eff / gp,
        rpg: (totals['O'] + totals['D']) / gp,
        apg: totals['AST'] / gp,
        fg2pct: (totals['2PM'] + totals['2PA']) > 0 ? Math.round((totals['2PM'] / (totals['2PM'] + totals['2PA'])) * 100) : 0,
        fg3pct: (totals['3PM'] + totals['3PA']) > 0 ? Math.round((totals['3PM'] / (totals['3PM'] + totals['3PA'])) * 100) : 0,
      };
    }).filter(Boolean).sort((a, b) => b.epg - a.epg);

    return (
      <div>
        <button onClick={() => setSelectedOpp(null)} style={{ marginBottom: 14, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>
          ← Back to Opponents
        </button>
        <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{selectedOpp.name}</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 16 }}>{sessions.length} scout session{sessions.length !== 1 ? 's' : ''}</div>

        {playerAggs.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13 }}>No scout data yet for this opponent.</div>
        ) : playerAggs.map(r => (
          <div key={r.player.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: COLORS.text }}>#{r.player.number || '—'} {r.player.name}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>{r.gp} GP</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: COLORS.muted }}>
              <span>PPG <b style={{ color: COLORS.text }}>{r.ppg.toFixed(1)}</b></span>
              <span>RPG <b style={{ color: COLORS.text }}>{r.rpg.toFixed(1)}</b></span>
              <span>APG <b style={{ color: COLORS.text }}>{r.apg.toFixed(1)}</b></span>
              <span>2FG% <b style={{ color: COLORS.text }}>{r.fg2pct}%</b></span>
              <span>3FG% <b style={{ color: COLORS.text }}>{r.fg3pct}%</b></span>
              <span style={{ color: r.epg >= 0 ? COLORS.green : COLORS.red }}>EFF <b>{r.epg >= 0 ? '+' : ''}{r.epg.toFixed(1)}</b></span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scout Reports</div>
      {opponents.length === 0 && <p style={{ color: COLORS.muted }}>No opponents scouted yet.</p>}
      {opponents.map(o => (
        <button key={o.id} onClick={() => setSelectedOpp(o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}>
          {o.logo_url
            ? <img src={o.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 32, height: 32, borderRadius: 6, background: o.primary_color || '#6b7280', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: o.secondary_color || '#fff' }}>{(o.abbr || o.name || '?').slice(0, 1)}</div>}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>{o.name}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{o.abbr || '—'}</div>
          </div>
          <span style={{ marginLeft: 'auto', color: COLORS.muted }}>→</span>
        </button>
      ))}
    </div>
  );
}

// ── Player Dashboard Wrapper ──────────────────────────────────────────────────
function PlayerView({ playerRecord, team }) {
  return (
    <ThemeProvider teamId={team.id}>
      <PlayerDashboard playerRecord={playerRecord} team={team} />
    </ThemeProvider>
  );
}

// ── Opponent Scout Screen ─────────────────────────────────────────────────────
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

  const calcScoutPts = (s) => ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0);
  const calcScoutEff = (s) => {
    const pos = ((s['2PM'] || 0) * 2) + ((s['3PM'] || 0) * 3) + (s['FTM'] || 0)
      + (s['O'] || 0) + (s['D'] || 0) + (s['AST'] || 0) + (s['STL'] || 0) + (s['BS'] || 0) + (s['DF'] || 0) + (s['CHG_taken'] || 0);
    const neg = (s['TO'] || 0) + (s['PF'] || 0) + (s['2PA'] || 0) + (s['3PA'] || 0) + (s['FTA'] || 0);
    return pos - neg;
  };

  const handleSave = async () => {
    if (!gameDate) { alert('Please enter a game date.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('scout_sessions').insert({
        opponent_id: opponent.id, team_id: team.id,
        game_date: gameDate, notes: notes.trim() || null,
        player_stats: stats, source: 'film',
      });
      if (error) throw new Error(error.message);
      onSaved(); onClose();
    } catch (err) { alert('Error saving: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 13 }}>🎬 Film Scout — {opponent.name}</div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
            style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
          <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
            style={{ flex: 2, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
        </div>
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
        {players.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 14 }}>No players on this roster yet.</div>}
        {selectedPlayer && (
          <div>
            <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Tagging: #{selectedPlayer.number} {selectedPlayer.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {TAG_BUTTONS.map(btn => (
                <button key={btn.key} onClick={() => tagStat(selectedPlayer.id, btn.key)}
                  style={{ padding: '10px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontWeight: 700, background: btn.pos ? COLORS.statPosBg : COLORS.statNegBg, border: `2px solid ${btn.pos ? COLORS.statPosBorder : COLORS.statNegBorder}`, color: btn.pos ? COLORS.statPosText : COLORS.statNegText }}>
                  <div style={{ fontSize: 10 }}>{btn.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{statsFor(selectedPlayer.id)[btn.key] || 0}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    setStep('parsing'); setError(null);
    try {
      const base64Data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });
      const prompt = `You are parsing a Hudl basketball box score PDF for scouting. Extract the OPPONENT team's individual player stats (the second team listed).

Return ONLY valid JSON, no markdown:
{
  "gameDate": "<YYYY-MM-DD or null>",
  "players": [
    {
      "number": "<digits only>",
      "name": "<player name>",
      "pts": <number>, "fgm": <number>, "fga": <number>,
      "fg3m": <number>, "fg3a": <number>,
      "ftm": <number>, "fta": <number>,
      "oreb": <number>, "dreb": <number>,
      "ast": <number>, "defl": <number>, "stl": <number>,
      "blk": <number>, "to": <number>, "pf": <number>,
      "chg": <number>, "mins": <number>
    }
  ]
}
Rules: extract SECOND team only. fga/fg3a/fta = TOTAL attempts not misses. Missing = 0.`;

      const response = await fetch('/api/parse-hudl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 4000,
          messages: [{ role: 'user', content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
            { type: 'text', text: prompt },
          ]}],
        }),
      });
      const data = await response.json();
      if (!data.content?.length) throw new Error('No content: ' + JSON.stringify(data));
      const text = data.content.map(i => i.text || '').join('').trim();
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setParsedData(parsed);
      if (parsed.gameDate) setGameDate(parsed.gameDate);
      const matched = (parsed.players || []).map(hp => {
        const rp = oppPlayers.find(p => String(p.number || '').replace('#', '').trim() === String(hp.number || '').replace('#', '').trim());
        return { hudlName: hp.name, hudlNumber: hp.number, rosterPlayerId: rp?.id || null, hudlStats: hp, include: true };
      });
      setMatchedStats(matched);
      setStep('preview');
    } catch (err) { setError('Failed: ' + err.message); setStep('upload'); }
  };

  const setRosterMatch = (idx, playerId) => setMatchedStats(prev => prev.map((m, i) => i === idx ? { ...m, rosterPlayerId: playerId || null } : m));
  const toggleInclude = (idx) => setMatchedStats(prev => prev.map((m, i) => i === idx ? { ...m, include: !m.include } : m));

  const handleSave = async () => {
    if (!gameDate) { alert('Please enter a game date.'); return; }
    setSaving(true);
    try {
      const playerStats = {};
      matchedStats.forEach(m => {
        if (!m.include || !m.rosterPlayerId) return;
        const s = m.hudlStats;
        const fg2m = Math.max(0, (s.fgm || 0) - (s.fg3m || 0));
        const fg2a_total = Math.max(0, (s.fga || 0) - (s.fg3a || 0));
        playerStats[m.rosterPlayerId] = {
          '2PM': fg2m, '2PA': Math.max(0, fg2a_total - fg2m),
          '3PM': s.fg3m || 0, '3PA': Math.max(0, (s.fg3a || 0) - (s.fg3m || 0)),
          'FTM': s.ftm || 0, 'FTA': Math.max(0, (s.fta || 0) - (s.ftm || 0)),
          'O': s.oreb || 0, 'D': s.dreb || 0, 'AST': s.ast || 0, 'DF': s.defl || 0,
          'STL': s.stl || 0, 'BS': s.blk || 0, 'TO': s.to || 0, 'PF': s.pf || 0,
          'CHG_taken': s.chg || 0, 'mins': s.mins || 0,
        };
      });
      const { error } = await supabase.from('scout_sessions').insert({
        opponent_id: opponent.id, team_id: team.id,
        game_date: gameDate, notes: notes.trim() || null,
        player_stats: playerStats, source: 'hudl',
      });
      if (error) throw new Error(error.message);
      onSaved(); onClose();
    } catch (err) { setError('Save failed: ' + err.message); setSaving(false); }
  };

  const includedCount = matchedStats.filter(m => m.include && m.rosterPlayerId).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: COLORS.gold }}>
          <span style={{ color: '#ff6a00', fontWeight: 900, fontSize: 18 }}>H</span> Scout Import — {opponent.name}
        </div>
        {step === 'preview' ? (
          <button onClick={handleSave} disabled={saving || includedCount === 0}
            style={{ padding: '6px 14px', background: includedCount > 0 ? COLORS.gold : COLORS.navyDark, border: 'none', borderRadius: 8, color: includedCount > 0 ? COLORS.textDark : COLORS.muted, fontWeight: 800, fontSize: 13, cursor: includedCount > 0 ? 'pointer' : 'default' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : <div style={{ width: 60 }} />}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: 'center' }}>Upload Hudl Box Score</div>
            <div style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              Upload a Hudl PDF from any game {opponent.name} played.
            </div>
            {error && <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', maxWidth: 300, textAlign: 'center' }}>{error}</div>}
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
          </div>
        )}
        {step === 'preview' && parsedData && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
                style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)}
                style={{ flex: 2, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
            </div>
            {matchedStats.map((m, i) => {
              const s = m.hudlStats;
              const pts = ((s.fgm || 0) - (s.fg3m || 0)) * 2 + (s.fg3m || 0) * 3 + (s.ftm || 0);
              return (
                <div key={i} style={{ background: m.include ? (m.rosterPlayerId ? 'rgba(200,168,75,0.08)' : 'rgba(255,255,255,0.03)') : 'rgba(0,0,0,0.2)', border: `1px solid ${m.include && m.rosterPlayerId ? COLORS.gold : COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 13 }}>#{m.hudlNumber} {m.hudlName}</div>
                    <button onClick={() => toggleInclude(i)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: m.include ? COLORS.redBg : 'rgba(255,255,255,0.07)', border: `1px solid ${m.include ? COLORS.red : COLORS.border}`, color: m.include ? COLORS.red : COLORS.muted }}>
                      {m.include ? 'Skip' : 'Include'}
                    </button>
                  </div>
                  {m.include && (
                    <select value={m.rosterPlayerId || ''} onChange={e => setRosterMatch(i, e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', background: COLORS.navyDark, border: `1px solid ${m.rosterPlayerId ? COLORS.gold : COLORS.border}`, borderRadius: 7, color: m.rosterPlayerId ? COLORS.gold : COLORS.muted, fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }}>
                      <option value="">— Map to roster player —</option>
                      {oppPlayers.map(p => <option key={p.id} value={p.id}>#{p.number || '—'} {p.name}</option>)}
                    </select>
                  )}
                  {m.include && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: COLORS.muted }}>
                      <span>PTS <b style={{ color: COLORS.text }}>{pts}</b></span>
                      <span>FG <b style={{ color: COLORS.text }}>{s.fgm || 0}/{s.fga || 0}</b></span>
                      <span>3FG <b style={{ color: COLORS.text }}>{s.fg3m || 0}/{s.fg3a || 0}</b></span>
                      <span>FT <b style={{ color: COLORS.text }}>{s.ftm || 0}/{s.fta || 0}</b></span>
                      <span>REB <b style={{ color: COLORS.text }}>{(s.oreb || 0) + (s.dreb || 0)}</b></span>
                      <span>AST <b style={{ color: COLORS.text }}>{s.ast || 0}</b></span>
                      <span>STL <b style={{ color: COLORS.text }}>{s.stl || 0}</b></span>
                      <span>TO <b style={{ color: COLORS.text }}>{s.to || 0}</b></span>
                    </div>
                  )}
                </div>
              );
            })}
            {error && <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>{error}</div>}
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
      setSessions(sess || []); setOppPlayers(players || []); setLoading(false);
    });
  }, [opponent.id, team.id]);

  const SCOUT_STAT_KEYS = ['2PM','2PA','3PM','3PA','FTM','FTA','O','D','AST','STL','BS','TO','PF','DF','CHG_taken'];
  const playerAggregates = oppPlayers.map(p => {
    let gp = 0, totalMins = 0;
    const totals = {};
    SCOUT_STAT_KEYS.forEach(k => { totals[k] = 0; });
    sessions.forEach(sess => {
      const st = sess.player_stats?.[p.id];
      if (!st) return;
      gp++;
      SCOUT_STAT_KEYS.forEach(k => { totals[k] += st[k] || 0; });
      totalMins += st.mins || 0;
    });
    if (gp === 0) return null;
    const pts = (totals['2PM'] * 2) + (totals['3PM'] * 3) + totals['FTM'];
    const eff = pts + totals['O'] + totals['D'] + totals['AST'] + totals['STL'] + totals['BS'] + totals['DF'] + totals['CHG_taken']
      - totals['TO'] - totals['PF'] - totals['2PA'] - totals['3PA'] - totals['FTA'];
    const reb = totals['O'] + totals['D'];
    const per = totalMins > 0 ? (eff / totalMins) * 32 : 0;
    const fg2made = totals['2PM'], fg2att = totals['2PM'] + totals['2PA'];
    const fg3made = totals['3PM'], fg3att = totals['3PM'] + totals['3PA'];
    const ftmade = totals['FTM'], ftatt = totals['FTM'] + totals['FTA'];
    return {
      player: p, gp,
      ppg: pts / gp, epg: eff / gp, rpg: reb / gp, apg: totals['AST'] / gp, per,
      fg2pct: fg2att > 0 ? Math.round((fg2made / fg2att) * 100) : 0,
      fg3pct: fg3att > 0 ? Math.round((fg3made / fg3att) * 100) : 0,
      ftpct: ftatt > 0 ? Math.round((ftmade / ftatt) * 100) : 0,
      fgma: `${fg2made + fg3made}/${fg2att + fg3att}`,
      fg3ma: `${fg3made}/${fg3att}`,
      ftma: `${ftmade}/${ftatt}`,
      spg: totals['STL'] / gp,
      topg: totals['TO'] / gp,
    };
  }).filter(Boolean).sort((a, b) => b.epg - a.epg);

  const fmt1 = v => v.toFixed(1);

  if (loading) return <div style={{ position: 'fixed', inset: 0, background: COLORS.navyDark, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: COLORS.muted }}>Loading…</div></div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <style>{`@media print { body * { visibility: hidden; } #scout-report-printable, #scout-report-printable * { visibility: visible; } #scout-report-printable { position: absolute; left: 0; top: 0; width: 100%; } #scout-no-print { display: none !important; } }`}</style>
      <div id="scout-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
        <div style={{ color: '#c8a84b', fontWeight: 800, fontSize: 13 }}>Scout Report — {opponent.name}</div>
        <button onClick={() => {
          const content = document.getElementById('scout-report-printable').innerHTML;
          const win = window.open('', '_blank');
          win.document.write(`<!DOCTYPE html><html><head><title>Scout Report</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Inter, sans-serif; color: #1a1a1a; padding: 20px; } table { width: 100%; border-collapse: collapse; } th { background: #1a3a6b; color: #fff; padding: 6px 4px; text-align: center; font-weight: 700; font-size: 9px; } td { padding: 5px 4px; text-align: center; border-bottom: 1px solid #dde3ef; font-size: 10px; } tr:nth-child(even) { background: #f0f4fa; } @page { size: landscape; margin: 10mm; }</style></head><body>${content}</body></html>`);
          win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
        }} style={{ background: '#c8a84b', border: 'none', color: '#0d1b2e', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>🖨 Print / PDF</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px', background: '#fff' }}>
        <div id="scout-report-printable" style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '14px 18px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#c8a84b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>XOVR Scout Report</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{opponent.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Scouted by</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c8a84b' }}>{teamName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{ height: 4, background: '#c8a84b', marginBottom: 16 }} />
          {playerAggregates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No scout data yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                    <th style={{ padding: '7px 6px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '7px 6px', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '7px 6px', textAlign: 'left' }}>POS</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>GP</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>PPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>FGM/A</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>FG%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>3PM/A</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>3P%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>FTM/A</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>FT%</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>RPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>APG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>SPG</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center' }}>TOV</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', color: '#c8a84b' }}>EFF</th>
                    <th style={{ padding: '7px 6px', textAlign: 'center', color: '#c8a84b' }}>PER</th>
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
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fgma}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fg2pct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fg3ma}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.fg3pct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.ftma}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.ftpct}%</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.rpg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.apg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.spg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center' }}>{fmt1(r.topg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: r.epg >= 0 ? '#16a34a' : '#dc2626' }}>{r.epg >= 0 ? '+' : ''}{fmt1(r.epg)}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: '#4169e1' }}>{fmt1(r.per)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sessions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Scout Sessions</div>
              {sessions.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 11 }}>
                  <span style={{ color: '#888', minWidth: 80 }}>{s.game_date || '—'}</span>
                  <span style={{ background: s.source === 'hudl' ? '#fff3e0' : '#e8f5e9', color: s.source === 'hudl' ? '#e65100' : '#2e7d32', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{s.source === 'hudl' ? 'H Hudl' : '🎬 Film'}</span>
                  {s.notes && <span style={{ color: '#666' }}>{s.notes}</span>}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20, fontSize: 9, color: '#999', textAlign: 'center' }}>Generated by XOVR Basketball · {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}

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
    setConfirmDeleteId(null); loadSessions();
  };

  return (
    <div>
      {showFilmTagger && <ScoutFilmTagger opponent={opponent} team={team} onClose={() => setShowFilmTagger(false)} onSaved={loadSessions} />}
      {showHudlImport && <ScoutHudlImport opponent={opponent} team={team} onClose={() => setShowHudlImport(false)} onSaved={loadSessions} />}
      {showReport && <ScoutReport opponent={opponent} team={team} onClose={() => setShowReport(false)} />}

      <button onClick={onBack} style={{ marginBottom: 14, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>
        ← Back to {opponent.name}
      </button>
      <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{opponent.name} — Scouting</div>

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

      {!canEdit && sessions.length > 0 && (
        <button onClick={() => setShowReport(true)}
          style={{ width: '100%', padding: '10px 0', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
          📋 View Scout Report
        </button>
      )}

      {sessions.length === 0 ? (
        <div style={{ padding: 20, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, textAlign: 'center', color: COLORS.muted, fontSize: 13 }}>
          No scout sessions yet.
        </div>
      ) : sessions.map(s => (
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
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{Object.keys(s.player_stats || {}).length} players tracked</div>
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
      ))}
    </div>
  );
}

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
    const { error } = await supabase.from('opponent_players').insert({ opponent_id: opponent.id, name: newName.trim(), number: newNumber.trim() || null, position: newPos.trim() || null });
    if (!error) { setNewName(''); setNewNumber(''); setNewPos(''); loadPlayers(); }
    else alert('Error: ' + error.message);
  };

  const removePlayer = async (id) => { await supabase.from('opponent_players').delete().eq('id', id); loadPlayers(); };

  const updateField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('opponent_players').update({ [field]: value }).eq('id', id);
  };

  const POSITIONS = ['G', 'SG', 'SF', 'PF', 'C'];

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ flex: 1, padding: '8px 0', fontWeight: tab === key ? 800 : 600, fontSize: 12, background: tab === key ? COLORS.gold : COLORS.navyMid, color: tab === key ? COLORS.textDark : COLORS.muted, border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`, borderRadius: 7, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 14, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>← Back to Opponents</button>
      <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>{opponent.name}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {tabBtn('roster', '👥 Roster')}
        {tabBtn('scout', '🔍 Scout')}
      </div>
      {tab === 'roster' && (
        <div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)} style={{ width: 50, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, minWidth: 120, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, boxSizing: 'border-box' }} />
              <select value={newPos} onChange={e => setNewPos(e.target.value)} style={{ width: 60, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }}>
                <option value="">Pos</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={addPlayer} style={{ padding: '8px 14px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
            </div>
          )}
          {players.map(p => {
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                {isEditing ? (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input value={p.number || ''} onChange={e => updateField(p.id, 'number', e.target.value)} placeholder="#" style={{ width: 50, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 8px', color: COLORS.text, fontSize: 13, textAlign: 'center', boxSizing: 'border-box' }} />
                      <input value={p.name || ''} onChange={e => updateField(p.id, 'name', e.target.value)} placeholder="Player name" style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13, boxSizing: 'border-box' }} />
                      <select value={p.position || ''} onChange={e => updateField(p.id, 'position', e.target.value)} style={{ width: 60, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 4px', color: COLORS.text, fontSize: 13 }}>
                        <option value="">—</option>
                        {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Done</button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 7, background: COLORS.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>{p.number || '—'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{p.position || '—'}</div>
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
      {tab === 'scout' && <OpponentScoutScreen opponent={opponent} team={team} role={role} onBack={() => setTab('roster')} />}
    </div>
  );
}

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

  const removeOpponent = async (id) => { await supabase.from('opponents').delete().eq('id', id); loadOpponents(); };

  const updateOpponentField = async (id, field, value) => {
    setOpponents(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    await supabase.from('opponents').update({ [field]: value }).eq('id', id);
  };

  const handleLogoUpload = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    updateOpponentField(id, 'logo_url', dataUrl);
  };

  if (rosterOpponent) return <OpponentRosterScreen opponent={rosterOpponent} role={role} team={team} onBack={() => setRosterOpponent(null)} />;

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
                  <input value={o.name || ''} onChange={e => updateOpponentField(o.id, 'name', e.target.value)} placeholder="Team name" style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13 }} />
                  <input value={o.abbr || ''} onChange={e => updateOpponentField(o.id, 'abbr', e.target.value.toUpperCase().slice(0, 4))} style={{ width: 64, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 6px', color: COLORS.text, fontSize: 13, textAlign: 'center', textTransform: 'uppercase' }} />
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="color" value={primary} onChange={e => updateOpponentField(o.id, 'primary_color', e.target.value)} style={{ width: 26, height: 26, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    <span style={{ fontSize: 9, color: COLORS.muted }}>Primary</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="color" value={secondary} onChange={e => updateOpponentField(o.id, 'secondary_color', e.target.value)} style={{ width: 26, height: 26, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    <span style={{ fontSize: 9, color: COLORS.muted }}>Secondary</span>
                  </label>
                  <label style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>
                    Logo <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoUpload(o.id, e)} />
                  </label>
                </div>
                <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Done</button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {o.logo_url ? <img src={o.logo_url} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 7, background: primary, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: secondary, border: `1px solid ${secondary}` }}>{(o.abbr || o.name || '?').slice(0, 1)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{o.abbr || '—'}</div>
                </div>
                <button onClick={() => setRosterOpponent(o)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.gold, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Scout</button>
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
    const { error } = await supabase.from('players').insert({ team_id: team.id, name: newName.trim(), number: newNumber.trim() || null });
    if (!error) { setNewName(''); setNewNumber(''); loadPlayers(); }
  };

  const removePlayer = async (id) => { await supabase.from('players').delete().eq('id', id); loadPlayers(); };

  const updatePlayerField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('players').update({ [field]: value }).eq('id', id);
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)} style={{ width: 56, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addPlayer} style={{ padding: '8px 16px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
        </div>
      )}
      {players.map(p => {
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={p.number || ''} onChange={e => updatePlayerField(p.id, 'number', e.target.value)} placeholder="#" style={{ width: 56, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13, textAlign: 'center' }} />
                  <input value={p.name || ''} onChange={e => updatePlayerField(p.id, 'name', e.target.value)} placeholder="Player name" style={{ flex: 1, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px', color: COLORS.text, fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['Fr', 'So', 'Jr', 'Sr'].map(grade => (
                    <button key={grade} onClick={() => updatePlayerField(p.id, 'grade', p.grade === grade ? null : grade)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: p.grade === grade ? COLORS.gold : COLORS.navyDark, color: p.grade === grade ? COLORS.textDark : COLORS.muted, border: `1px solid ${p.grade === grade ? COLORS.gold : COLORS.border}` }}>
                      {grade}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Done</button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: COLORS.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: COLORS.gold, border: `1px solid ${COLORS.border}` }}>{p.number || '—'}</div>
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
  const isCoach = team.role === 'head_coach' || team.role === 'assistant';

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

  // Build tab list based on role
  const tabs = [
    { key: 'home', label: 'HOME' },
    { key: 'seasons', label: 'SZN' },
    { key: 'practices', label: 'PRAC' },
    { key: 'roster', label: 'RSTR' },
    { key: 'opponents', label: 'OPNT' },
    ...(isCoach ? [{ key: 'libraries', label: 'CNFG' }, { key: 'theme', label: 'THEME' }] : []),
    { key: 'game', label: 'GAME' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.navyDark, color: COLORS.text, fontFamily: 'sans-serif' }}>
      <div style={{ background: COLORS.navy, borderBottom: `3px solid ${COLORS.gold}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {logo && <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
        <div>
          <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>{teamName}</div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{team.name}</h2>
        </div>
        {productLogo && <img src={productLogo} alt="" style={{ height: 58, width: 'auto', maxWidth: 200, objectFit: 'contain', marginLeft: 'auto', marginRight: 'auto' }} />}
        <button onClick={onBack} style={{ marginLeft: productLogo ? 0 : 'auto', padding: '8px 14px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 7, cursor: 'pointer' }}>Home</button>
      </div>
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4, marginBottom: 20 }}>
          {tabs.map(t => tabBtn(t.key, t.label))}
        </div>
        {tab === 'home' && <HomeDashboard team={team} role={team.role} onNavigateToTab={setTab} />}
        {tab === 'roster' && <RosterScreen team={team} role={team.role} />}
        {tab === 'opponents' && <OpponentsScreen team={team} role={team.role} />}
        {tab === 'seasons' && <SeasonsScreen team={team} role={team.role} />}
        {tab === 'practices' && (currentSeason ? <PracticesScreen team={team} season={currentSeason} /> : <p>Create a season first (SZN tab).</p>)}
        {tab === 'libraries' && isCoach && <LibrariesScreen team={team} role={team.role} />}
        {tab === 'theme' && isCoach && <ThemeSettingsScreen team={team} role={team.role} />}
        {tab === 'game' && (currentSeason ? <GameScreen team={team} season={currentSeason} /> : <p>Create a season first (SZN tab).</p>)}
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
  const [playerRecord, setPlayerRecord] = useState(null);
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
    const load = async () => {
      const { data: memberships } = await supabase.from('team_memberships').select('role, teams(id, name)');
      if (memberships) {
        const seen = new Set();
        const uniqueTeams = memberships
          .map(m => ({ id: m.teams.id, name: m.teams.name, role: m.role }))
          .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
        setTeams(uniqueTeams);

        // Check if this user is a player
        const playerRole = memberships.find(m => m.role === 'player');
        if (playerRole) {
          const teamId = playerRole.teams.id;
          const { data: pRecord } = await supabase.from('players').select('*').eq('team_id', teamId).eq('user_id', session.user.id).maybeSingle();
          if (pRecord) {
            setPlayerRecord({ ...pRecord, teamId });
            setSelectedTeam({ id: teamId, name: playerRole.teams.name, role: 'player' });
          }
        }
      }
      const { data: appSettings } = await supabase.from('app_settings').select('product_logo').limit(1).maybeSingle();
      if (appSettings?.product_logo) setProductLogo(appSettings.product_logo);
    };
    load();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setMessage('');
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

  const handleSignOut = async () => { setSelectedTeam(null); setPlayerRecord(null); await supabase.auth.signOut(); };

  const XOVR = { teal: '#1a1a1a', gold: '#e7b977', text: '#ffffff', muted: 'rgba(255,255,255,0.45)', inputBg: 'rgba(255,255,255,0.08)' };
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
            <img src={LOGO_URL} alt="XOVR Basketball" style={{ width: 240, height: 240, objectFit: 'contain', filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.8))' }} />
          </div>
        </div>
        <div style={{ flex: 1, background: XOVR.teal, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 26, textAlign: 'center', color: XOVR.gold, WebkitTextStroke: '1.5px #000', textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 3px 6px rgba(0,0,0,0.5)', letterSpacing: 3, fontStyle: 'italic' }}>
            {mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME, COACH!'}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ padding: '15px 22px', background: XOVR.inputBg, border: `2px solid ${XOVR.gold}`, borderRadius: 50, color: XOVR.text, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ padding: '15px 22px', background: XOVR.inputBg, border: `2px solid ${XOVR.gold}`, borderRadius: 50, color: XOVR.text, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            {mode === 'signin' && (
              <div style={{ textAlign: 'center', marginTop: -6 }}>
                <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>Forgot Password?</button>
              </div>
            )}
            <button type="submit" style={{ marginTop: 8, padding: '15px', fontWeight: 900, fontSize: 18, background: XOVR.gold, color: '#000', border: 'none', borderRadius: 50, cursor: 'pointer', letterSpacing: 1, width: '55%', alignSelf: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
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

  // Player view — goes directly to personal dashboard
  if (selectedTeam && playerRecord) {
    return <PlayerView playerRecord={playerRecord} team={selectedTeam} />;
  }

  // Coach view
  if (selectedTeam) return <TeamView team={selectedTeam} onBack={() => setSelectedTeam(null)} />;

  // Team picker (coaches with multiple teams)
  const coachTeams = teams.filter(t => t.role !== 'player');
  return (
    <div style={{ minHeight: '100vh', background: BW.navyDark, color: BW.text, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      {productLogo && <img src={productLogo} alt="" style={{ height: 80, width: 'auto', objectFit: 'contain', marginBottom: 8 }} />}
      <img src={LOGO_URL} alt="XOVR Basketball" style={{ width: 240, height: 240, objectFit: 'contain', marginBottom: 8 }} />
      <div style={{ fontSize: 11, color: BW.muted, letterSpacing: 1, marginBottom: 4 }}>{session.user.email}</div>
      <div style={{ fontSize: 13, color: BW.gold, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Choose a Team</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {coachTeams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeam(t)}
            style={{ padding: 14, fontSize: 15, fontWeight: 700, background: BW.navyMid, color: BW
.text, border: `1px solid ${BW.gold}`, borderRadius: 10, cursor: 'pointer', letterSpacing: 0.5, textAlign: 'left' }}>
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
