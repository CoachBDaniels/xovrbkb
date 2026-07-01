import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { STAT_DEFS, FT_POSITION, SHOT_KEYS, GAME_FORMAT_PRESETS, emptyPlayerStats, calcPts, calcEff, pct, CourtSVG, ShotChartView, BoxScoreReport, FormatPicker, applyStatDefs } from './GameReports';


function MiniCourtSVG({ courtColor, laneColor }) {
  return (
    <svg viewBox="0 0 300 260" style={{ width: '100%', display: 'block', background: courtColor || '#c8922a', borderRadius: 8 }}>
      <rect x="5" y="5" width="290" height="250" fill={courtColor || '#c8922a'} stroke="#fff" strokeWidth="2" rx="3" />
      <rect x="100" y="5" width="100" height="115" fill={laneColor || '#a06414'} stroke="#fff" strokeWidth="1.5" />
      <line x1="100" y1="120" x2="200" y2="120" stroke="#fff" strokeWidth="1.5" />
      <path d="M100 120 A50 50 0 0 1 200 120" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M100 120 A50 50 0 0 0 200 120" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="125" y1="20" x2="175" y2="20" stroke="#fff" strokeWidth="2.5" />
      <circle cx="150" cy="32" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="150" cy="32" r="2" fill="#fff" />
      <path d="M129 32 A21 21 0 0 0 171 32" fill="none" stroke="#fff" strokeWidth="1.5" />
      <line x1="18" y1="5" x2="18" y2="120" stroke="#fff" strokeWidth="1.5" />
      <line x1="282" y1="5" x2="282" y2="120" stroke="#fff" strokeWidth="1.5" />
      <path d="M18 120 A145 145 0 0 0 282 120" fill="none" stroke="#fff" strokeWidth="1.5" />
      <line x1="5" y1="252" x2="295" y2="252" stroke="#fff" strokeWidth="1.5" />
      <path d="M115 252 A35 35 0 0 1 185 252" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
}


function StarterPicker({ players, onConfirm }) {
  const { colors: COLORS } = useTheme();
  const [picked, setPicked] = useState([]);
  const toggle = (id) => {
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 5 ? [...prev, id] : prev));
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {players.map(p => {
          const sel = picked.includes(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              style={{ padding: '10px 14px', borderRadius: 8, border: sel ? '2px solid #c8a84b' : '1px solid #ccc', background: sel ? COLORS.goldLight : COLORS.navyMid, color: sel ? COLORS.textDark : COLORS.text, cursor: 'pointer', fontWeight: sel ? 700 : 500 }}>
              #{p.number || '—'} {p.name}
            </button>
          );
        })}
      </div>
      <div style={{ marginBottom: 12, fontSize: 13, color: COLORS.muted }}>{picked.length} of 5 selected</div>
      <button onClick={() => onConfirm(picked)} disabled={picked.length !== 5}
        style={{ padding: '12px 24px', fontWeight: 'bold', background: picked.length === 5 ? COLORS.gold : COLORS.navyMid, color: picked.length === 5 ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 8, cursor: picked.length === 5 ? 'pointer' : 'default' }}>
        Start Game →
      </button>
    </div>
  );
}


export function ActiveGame({ team, game, onSaved, onBack, backLabel }) {
  const { colors: COLORS, logo, teamName, court, lane } = useTheme();
  const [players, setPlayers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [stats, setStats] = useState(game.player_stats && Object.keys(game.player_stats).length ? game.player_stats : {});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameFormat, setGameFormat] = useState(game.game_format || GAME_FORMAT_PRESETS[0]);
  const [currentPeriod, setCurrentPeriod] = useState(game.meta?.currentPeriod || 1);
  const [clockMinutes, setClockMinutes] = useState(game.meta?.clockMinutes != null ? game.meta.clockMinutes : gameFormat.minutes);
  const [clockSeconds, setClockSeconds] = useState(game.meta?.clockSeconds != null ? game.meta.clockSeconds : 0);
  const [editingClock, setEditingClock] = useState(false);
  const [editingFormat, setEditingFormat] = useState(false);
  const [draftFormat, setDraftFormat] = useState(null);
  const [editMin, setEditMin] = useState(clockMinutes);
  const [editSec, setEditSec] = useState(clockSeconds);
  const [onCourt, setOnCourt] = useState(game.meta?.onCourt || null);
  const [checkInClock, setCheckInClock] = useState(game.meta?.checkInClock || {});
  const [minutesLog, setMinutesLog] = useState(game.meta?.minutesLog || {});
  const [showSubs, setShowSubs] = useState(false);
  const [subOutIds, setSubOutIds] = useState([]);
  const [subInIds, setSubInIds] = useState([]);
  const [showSubClockConfirm, setShowSubClockConfirm] = useState(false);
  const [confirmMin, setConfirmMin] = useState(clockMinutes);
  const [confirmSec, setConfirmSec] = useState(clockSeconds);
  const [shotLog, setShotLog] = useState(game.shot_log || []);
  const [pendingShot, setPendingShot] = useState(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showLiveBoxScore, setShowLiveBoxScore] = useState(false);
  const [showShotChart, setShowShotChart] = useState(false);
  const [specialPicker, setSpecialPicker] = useState(null);
  const [actionHistory, setActionHistory] = useState(game.meta?.actionHistory || []);
  const [statDefsReady, setStatDefsReady] = useState(false);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('team_stat_defs').select('stat_defs').eq('team_id', team.id).maybeSingle();
      if (cancelled) return;
      if (data?.stat_defs && data.stat_defs.length > 0) applyStatDefs(data.stat_defs);
      else applyStatDefs(null);
      setStatDefsReady(true);
    })();
    return () => { cancelled = true; };
  }, [team.id]);


  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data); });
  }, [team.id]);


  useEffect(() => {
    if (!game.opponent_id) return;
    supabase.from('opponents').select('*').eq('id', game.opponent_id).single()
      .then(({ data, error }) => { if (!error) setOpponent(data); });
  }, [game.opponent_id]);


  const statsFor = (id) => stats[id] || emptyPlayerStats();


  const commitStatOnly = (playerId, key, loggedShot) => {
    setStats(prev => {
      const cur = prev[playerId] || emptyPlayerStats();
      return { ...prev, [playerId]: { ...cur, [key]: (cur[key] || 0) + 1 } };
    });
    setActionHistory(prev => [...prev, { playerId, key, loggedShot: !!loggedShot }]);
  };


  const tagStat = (playerId, key) => {
    if (!playerId) return;
    if (key === 'FTM' || key === 'FTA') {
      commitStatOnly(playerId, key, false);
      return;
    }
    if (SHOT_KEYS.includes(key)) {
      setPendingShot({ playerId, key });
      return;
    }
    commitStatOnly(playerId, key, false);
  };


  const handleCourtTap = (x, y) => {
    if (!pendingShot) return;
    commitStatOnly(pendingShot.playerId, pendingShot.key, true);
    setShotLog(prev => [...prev, { playerId: pendingShot.playerId, statKey: pendingShot.key, x, y, make: pendingShot.key === '3PM' || pendingShot.key === '2PM', period: currentPeriod }]);
    setPendingShot(null);
  };


  const undoLastAction = () => {
    setActionHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];
      setStats(prevStats => {
        const cur = prevStats[last.playerId] || emptyPlayerStats();
        return { ...prevStats, [last.playerId]: { ...cur, [last.key]: Math.max(0, (cur[last.key] || 0) - 1) } };
      });
      if (last.loggedShot) {
        setShotLog(prevShots => {
          const idx = prevShots.map((s, i) => i).reverse().find(i => prevShots[i].playerId === last.playerId && prevShots[i].statKey === last.key);
          return idx == null ? prevShots : prevShots.filter((_, i) => i !== idx);
        });
      }
      return prevHistory.slice(0, -1);
    });
  };


  const ourScore = players.reduce((s, p) => s + calcPts(statsFor(p.id)), 0);
  const oppScore = calcPts(statsFor('OPP'));


  const playLogRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const skipFirstAutoSave = useRef(true);
  useEffect(() => {
    if (skipFirstAutoSave.current) { skipFirstAutoSave.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      supabase.from('games').update({
        player_stats: stats,
        shot_log: shotLog,
        meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog, actionHistory },
        game_format: gameFormat,
        updated_at: new Date().toISOString(),
      }).eq('id', game.id).then(({ error }) => {
        if (error) console.error('Auto-save failed:', error.message);
      });
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [stats, shotLog, onCourt, checkInClock, minutesLog, currentPeriod, clockMinutes, clockSeconds, gameFormat, actionHistory]);


  const saveGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: stats,
      shot_log: shotLog,
      meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog, actionHistory },
      game_format: gameFormat,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (!error) onSaved();
    else alert('Error saving: ' + error.message);
  };


  const endGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: stats,
      shot_log: shotLog,
      meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog, actionHistory },
      game_format: gameFormat,
      is_final: true,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (!error) { setConfirmingEnd(false); setShowReport(true); }
    else alert('Error saving: ' + error.message);
  };


  const clockTotalSeconds = clockMinutes * 60 + clockSeconds;


  const checkInLineup = (ids, explicitSeconds) => {
    const ts = explicitSeconds != null ? explicitSeconds : clockTotalSeconds;
    setCheckInClock(prev => {
      const next = { ...prev };
      ids.forEach(pid => { next[pid] = ts; });
      return next;
    });
  };


  const startWithLineup = (ids) => {
    setOnCourt(ids);
    checkInLineup(ids, clockMinutes * 60 + clockSeconds);
  };


  const bankMinutes = (atSeconds) => {
    setMinutesLog(prevLog => {
      const next = { ...prevLog };
      (onCourt || []).forEach(pid => {
        const startSec = checkInClock[pid];
        if (startSec != null) {
          const elapsed = Math.max(0, startSec - atSeconds);
          next[pid] = (next[pid] || 0) + elapsed;
        }
      });
      return next;
    });
  };


  const openSubs = () => { setShowSubs(true); setSubOutIds([]); setSubInIds([]); };
  const toggleSubOut = (pid) => setSubOutIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  const toggleSubIn = (pid) => setSubInIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);


  const confirmSub = () => {
    if (subOutIds.length === 0 || subOutIds.length !== subInIds.length) return;
    setMinutesLog(prev => {
      const next = { ...prev };
      subOutIds.forEach(pid => {
        const elapsed = Math.max(0, (checkInClock[pid] || clockTotalSeconds) - clockTotalSeconds);
        next[pid] = (next[pid] || 0) + elapsed;
      });
      return next;
    });
    setCheckInClock(prev => {
      const next = { ...prev };
      subOutIds.forEach(pid => { delete next[pid]; });
      subInIds.forEach(pid => { next[pid] = clockTotalSeconds; });
      return next;
    });
    setOnCourt(prev => {
      const remaining = prev.filter(pid => !subOutIds.includes(pid));
      return [...remaining, ...subInIds];
    });
    setSubOutIds([]);
    setSubInIds([]);
    setShowSubs(false);
    setConfirmMin(clockMinutes);
    setConfirmSec(clockSeconds);
    setShowSubClockConfirm(true);
  };


  const applySubClockConfirm = () => {
    setClockMinutes(confirmMin);
    setClockSeconds(confirmSec);
    setShowSubClockConfirm(false);
  };


  const openClockEdit = () => { setEditMin(clockMinutes); setEditSec(clockSeconds); setEditingClock(true); };
  const saveClockEdit = () => { setClockMinutes(editMin); setClockSeconds(editSec); setEditingClock(false); };
  const advancePeriod = () => {
    bankMinutes(clockTotalSeconds);
    const isOT = currentPeriod >= gameFormat.periods;
    const newMinutes = isOT ? gameFormat.otMinutes : gameFormat.minutes;
    setCurrentPeriod(p => p + 1);
    setClockMinutes(newMinutes);
    setClockSeconds(0);
    checkInLineup(onCourt || [], newMinutes * 60);
    setEditingClock(false);
  };


  useEffect(() => {
    if (playLogRef.current) playLogRef.current.scrollTop = playLogRef.current.scrollHeight;
  }, [actionHistory]);


  const liveMinutesFor = (pid) => {
    const banked = minutesLog[pid] || 0;
    const startSec = checkInClock[pid];
    if (onCourt && onCourt.includes(pid) && startSec != null) {
      return banked + Math.max(0, startSec - clockTotalSeconds);
    }
    return banked;
  };
  const fmtMin = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  };


  if (!statDefsReady) {
    return <p style={{ color: COLORS.muted }}>Loading...</p>;
  }


  if (!onCourt) {
    return (
      <div>
        <h3>Pick Your 5 Starters</h3>
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Tap exactly 5 players to begin the game.</p>
        <StarterPicker players={players} onConfirm={startWithLineup} />
      </div>
    );
  }


  return (
    <div>
      {editingClock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: COLORS.text }}>Set Clock - {gameFormat.periodLabel} {currentPeriod}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="number" value={editMin} onChange={e => setEditMin(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
              <span style={{ fontSize: 18, alignSelf: 'center', color: COLORS.text }}>:</span>
              <input type="number" value={editSec} onChange={e => setEditSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
            </div>
            <button onClick={saveClockEdit} style={{ width: '100%', padding: 10, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Save Clock Time</button>
            <button onClick={advancePeriod} style={{ width: '100%', padding: 10, background: COLORS.greenBg, color: COLORS.green, border: `1px solid ${COLORS.green}`, borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>
              End {gameFormat.periodLabel} {currentPeriod} {'->'} Start {currentPeriod >= gameFormat.periods ? 'OT' : gameFormat.periodLabel + ' ' + (currentPeriod + 1)}
            </button>
            <button onClick={() => { setDraftFormat(gameFormat); setEditingFormat(true); }} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>
              ▼ Edit Game Format
            </button>
            <button onClick={() => setEditingClock(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}


      {editingFormat && draftFormat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 16 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Edit Game Format</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 12 }}>Applies going forward — the current period and clock stay as they are now.</div>
            <FormatPicker value={draftFormat} onChange={setDraftFormat} />
            <button onClick={() => {
              const nothingTaggedYet = Object.keys(stats).length === 0 && shotLog.length === 0;
              setGameFormat(draftFormat);
              if (nothingTaggedYet) {
                setClockMinutes(draftFormat.minutes);
                setClockSeconds(0);
                checkInLineup(onCourt || [], draftFormat.minutes * 60);
              }
              setEditingFormat(false);
              setDraftFormat(null);
            }} style={{ width: '100%', padding: 11, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 14 }}>
              Apply
            </button>
            <button onClick={() => { setEditingFormat(false); setDraftFormat(null); }} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>
              Cancel
            </button>
          </div>
        </div>
      )}


      {(() => {
        const ourPrimary = COLORS.navy;
        const oppPrimary = opponent?.primary_color || '#6b7280';
        const oppSecondary = opponent?.secondary_color || '#9ca3af';
        return (
          <div style={{
            display: 'flex', borderBottom: `2px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 6,
            background: `linear-gradient(90deg, ${ourPrimary} 0%, #000 48%, #000 52%, ${oppPrimary} 100%)`,
          }}>
            <div style={{ flex: 1, padding: '7px 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 9, minWidth: 0 }}>
              {logo
                ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: COLORS.gold }}>
                    {(teamName || '?').slice(0, 1)}
                  </div>}
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, color: COLORS.gold, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {teamName || 'TM'}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{ourScore}</div>
              </div>
            </div>
            <div style={{ padding: '7px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 88 }}>
              <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, letterSpacing: 1.5 }}>
                {gameFormat.periodLabel.slice(0, 1).toUpperCase()}{currentPeriod}{currentPeriod > gameFormat.periods ? ' OT' : ''}
              </div>
              <button onClick={openClockEdit} style={{
                fontSize: 24, fontWeight: 700, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Courier New', 'DSEG7-Classic', monospace", letterSpacing: 2, padding: 0, lineHeight: 1.1,
                textShadow: '0 0 6px rgba(255,59,48,0.85), 0 0 14px rgba(255,59,48,0.45)',
              }}>
                {clockMinutes}:{String(clockSeconds).padStart(2, '0')}
              </button>
            </div>
            <div style={{ flex: 1, padding: '7px 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 9, minWidth: 0 }}>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{oppScore}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, color: oppSecondary, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {(opponent?.name || game.meta?.opponentName || 'OPP').slice(0, 10)}
              </div>
              {opponent?.logo_url
                ? <img src={opponent.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: oppSecondary, border: `1px solid ${oppSecondary}` }}>
                    {(opponent?.abbr || game.meta?.opponentName || '?').slice(0, 1)}
                  </div>}
            </div>
          </div>
        );
      })()}


      {actionHistory.length > 0 && (
        <div ref={playLogRef} style={{ height: 38, overflowY: 'auto', marginBottom: 6, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, padding: '2px 6px' }}>
          {actionHistory.map((a, i) => {
            const def = STAT_DEFS.find(d => d.key === a.key);
            const p = players.find(pl => pl.id === a.playerId);
            const label = a.playerId === 'OPP' ? (game.meta?.opponentName ? game.meta.opponentName.slice(0, 10) : 'OPP') : (p ? `#${p.number || '—'} ${(p.name || '').split(' ')[0]}` : '#?');
            const isGreen = def ? def.value >= 0 : true;
            const isLast = i === actionHistory.length - 1;
            return (
              <div key={`${a.playerId}-${a.key}-${i}`}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 2px', fontSize: 10, fontWeight: isLast ? 800 : 600,
                  color: isGreen ? COLORS.statPosText : COLORS.statNegText,
                  background: isLast ? (isGreen ? COLORS.statPosBg : COLORS.statNegBg) : 'transparent' }}>
                <span>{label}</span>
                <span>{def ? def.label : a.key}</span>
              </div>
            );
          })}
        </div>
      )}


      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'stretch' }}>
        <div style={{ width: 78, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: 260 }}>
          {players.filter(p => onCourt.includes(p.id)).map(p => {
            const sel = selectedPlayer === p.id;
            const eff = calcEff(statsFor(p.id));
            return (
              <button key={p.id} onClick={() => setSelectedPlayer(p.id)}
                style={{ padding: '4px 3px', borderRadius: 7, border: sel ? `2px solid ${COLORS.gold}` : '1px solid #ccc', background: sel ? COLORS.goldLight : COLORS.playerBtnBg, color: sel ? COLORS.textDark : COLORS.playerBtnText, cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  #{p.number || '—'} {(p.name || '').split(' ')[0]}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sel ? COLORS.textDark : (eff >= 0 ? COLORS.green : COLORS.red) }}>{eff >= 0 ? '+' : ''}{eff}</span>
                  <span style={{ fontSize: 8, color: sel ? COLORS.textDark : COLORS.muted }}>{fmtMin(liveMinutesFor(p.id))}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MiniCourtSVG courtColor={court} laneColor={lane} />
        </div>
        <div style={{ width: 78, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <button onClick={() => setSelectedPlayer('OPP')}
            style={{ width: '100%', padding: '8px 4px', borderRadius: 7, border: selectedPlayer === 'OPP' ? `2px solid ${COLORS.gold}` : '1px solid #ccc', background: selectedPlayer === 'OPP' ? COLORS.gold : COLORS.navyMid, color: selectedPlayer === 'OPP' ? COLORS.textDark : COLORS.text, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
            {game.meta?.opponentName ? game.meta.opponentName.slice(0, 10) : 'Opponent'}
          </button>
          <button onClick={undoLastAction} disabled={actionHistory.length === 0}
            style={{ padding: '6px 2px', background: actionHistory.length === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: actionHistory.length === 0 ? COLORS.muted : COLORS.gold, fontWeight: 700, fontSize: 9, cursor: actionHistory.length === 0 ? 'default' : 'pointer', flexShrink: 0, opacity: actionHistory.length === 0 ? 0.5 : 1 }}>
            ↩ Undo
          </button>
          <button onClick={openSubs} style={{ marginTop: 6, padding: '6px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
            🔄 Subs
          </button>
          <button onClick={() => setShowLiveBoxScore(true)} style={{ padding: '6px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
            📊 Box Score
          </button>
          <button onClick={() => setShowShotChart(true)} style={{ padding: '6px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
            🎯 Shots
          </button>
          <button onClick={saveGame} style={{ padding: '6px 2px', background: 'rgba(200,168,75,0.1)', border: `1px solid ${COLORS.gold}`, borderRadius: 8, color: COLORS.gold, fontWeight: 700, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
            💾 Save
          </button>
          <button onClick={() => setConfirmingEnd(true)} style={{ padding: '6px 2px', background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, color: COLORS.red, fontWeight: 700, fontSize: 9, cursor: 'pointer', flexShrink: 0 }}>
            🏁 End
          </button>
        </div>
      </div>


      {onBack && (
        <button onClick={onBack} style={{ marginBottom: 8, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>
          ← {backLabel || 'Back'}
        </button>
      )}


      {pendingShot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 10, color: COLORS.text, fontWeight: 700 }}>Tap the court where the shot was taken</div>
            <CourtSVG shots={shotLog.filter(s => s.playerId === pendingShot.playerId)} onTap={handleCourtTap} interactive={true} courtColor={court} laneColor={lane} />
            <button onClick={() => setPendingShot(null)} style={{ marginTop: 10, width: '100%', padding: 12, background: 'none', border: '1px solid #ccc', color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Cancel Shot</button>
          </div>
        </div>
      )}


      {showSubs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 320, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: COLORS.text }}>Substitutions</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Tap any number of ON-COURT players to sub out ({subOutIds.length} selected):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {players.filter(p => onCourt.includes(p.id)).map(p => (
                <button key={p.id} onClick={() => toggleSubOut(p.id)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: subOutIds.includes(p.id) ? `2px solid ${COLORS.red}` : `1px solid ${COLORS.border}`, background: subOutIds.includes(p.id) ? COLORS.redBg : COLORS.navyDark, color: COLORS.text, cursor: 'pointer' }}>
                  #{p.number || '—'} {p.name}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Tap any number of BENCH players to sub in ({subInIds.length} selected):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {players.filter(p => !onCourt.includes(p.id)).map(p => (
                <button key={p.id} onClick={() => toggleSubIn(p.id)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: subInIds.includes(p.id) ? `2px solid ${COLORS.green}` : `1px solid ${COLORS.border}`, background: subInIds.includes(p.id) ? COLORS.greenBg : COLORS.navyDark, color: COLORS.text, cursor: 'pointer' }}>
                  #{p.number || '—'} {p.name}
                </button>
              ))}
            </div>
            {subOutIds.length !== subInIds.length && (subOutIds.length > 0 || subInIds.length > 0) && (
              <div style={{ fontSize: 12, color: COLORS.gold, marginBottom: 10, textAlign: 'center' }}>
                Select the same number on each side ({subOutIds.length} out, {subInIds.length} in)
              </div>
            )}
            <button onClick={confirmSub} disabled={subOutIds.length === 0 || subOutIds.length !== subInIds.length}
              style={{ width: '100%', padding: 10, background: (subOutIds.length > 0 && subOutIds.length === subInIds.length) ? COLORS.gold : COLORS.navyDark, color: (subOutIds.length > 0 && subOutIds.length === subInIds.length) ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: (subOutIds.length > 0 && subOutIds.length === subInIds.length) ? 'pointer' : 'default' }}>
              Confirm Sub
            </button>
            <button onClick={() => setShowSubs(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}


      {showSubClockConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 280 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: COLORS.text }}>What does the clock show right now?</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Confirming this keeps everyone's minutes accurate.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="number" value={confirmMin} onChange={e => setConfirmMin(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
              <span style={{ fontSize: 18, alignSelf: 'center', color: COLORS.text }}>:</span>
              <input type="number" value={confirmSec} onChange={e => setConfirmSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
            </div>
            <button onClick={applySubClockConfirm} style={{ width: '100%', padding: 10, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
          </div>
        </div>
      )}


      {confirmingEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 300 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: COLORS.text }}>End this game?</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>This marks the game as final. You can still reopen it later from the Game Log to fix a mistake.</div>
            <button onClick={endGame} style={{ width: '100%', padding: 10, background: COLORS.red, color: COLORS.text, border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Yes, end game</button>
            <button onClick={() => setConfirmingEnd(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Not yet</button>
          </div>
        </div>
      )}


      {showLiveBoxScore && (
        <BoxScoreReport
          team={team}
          teamName={teamName}
          logo={logo}
          opponent={opponent || { name: game.meta?.opponentName }}
          players={players}
          stats={stats}
          minutesLog={minutesLog}
          checkInClock={checkInClock}
          onCourt={onCourt}
          clockTotalSeconds={clockTotalSeconds}
          shotLog={shotLog}
          court={court}
          lane={lane}
          onClose={() => setShowLiveBoxScore(false)}
        />
      )}


      {showShotChart && (
        <ShotChartView
          players={players}
          shotLog={shotLog}
          opponent={opponent || { name: game.meta?.opponentName }}
          court={court}
          lane={lane}
          onClose={() => setShowShotChart(false)}
        />
      )}


      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', color: COLORS.textDark, zIndex: 200, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { setShowReport(false); onSaved(); }} style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: 8, background: 'none', cursor: 'pointer' }}>Close</button>
            <button onClick={() => window.print()} style={{ padding: '8px 14px', background: COLORS.gold, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>🖨 Print / Save as PDF</button>
          </div>
          <h2 style={{ marginBottom: 4 }}>Final: {ourScore} - {oppScore}</h2>
          <div style={{ color: COLORS.muted, marginBottom: 16 }}>vs. {game.meta?.opponentName || '—'} · {game.meta?.date || ''}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ background: COLORS.navy, color: COLORS.text }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Player</th>
                <th style={{ padding: 6 }}>MIN</th>
                <th style={{ padding: 6 }}>PTS</th>
                <th style={{ padding: 6 }}>EFF</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: 6 }}>#{p.number || '—'} {p.name}</td>
                  <td style={{ padding: 6, textAlign: 'center' }}>{fmtMin(liveMinutesFor(p.id))}</td>
                  <td style={{ padding: 6, textAlign: 'center' }}>{calcPts(statsFor(p.id))}</td>
                  <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: calcEff(statsFor(p.id)) >= 0 ? COLORS.green : COLORS.red }}>
                    {calcEff(statsFor(p.id)) >= 0 ? '+' : ''}{calcEff(statsFor(p.id))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <CourtSVG shots={shotLog.filter(s => s.playerId !== 'OPP')} interactive={false} courtColor={court} laneColor={lane} />
        </div>
      )}


      {(() => {
        const GREEN_KEYS = ["3PM", "2PM", "FTM", "O", "D", "AST", "STL"];
        const RED_KEYS = ["3PA", "2PA", "FTA", "TO", "AP", "PF"];
        const greenDefs = GREEN_KEYS.map(k => STAT_DEFS.find(d => d.key === k)).filter(Boolean);
        const redDefs = RED_KEYS.map(k => STAT_DEFS.find(d => d.key === k)).filter(Boolean);
        const LIVE_KEYS = new Set([...GREEN_KEYS, ...RED_KEYS]);
        const specialPosDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value >= 0);
        const specialNegDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value < 0);


        const btnStyle = (isGreen) => ({
          padding: '7px 2px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
          background: isGreen ? COLORS.statPosBg : COLORS.statNegBg,
          border: `2px solid ${isGreen ? COLORS.statPosBorder : COLORS.statNegBorder}`,
          color: isGreen ? COLORS.statPosText : COLORS.statNegText, fontWeight: 700,
        });


        const renderQuickBtn = (def) => (
          <button key={def.key} onClick={() => tagStat(selectedPlayer, def.key)} disabled={!selectedPlayer}
            style={{ ...btnStyle(def.value >= 0), opacity: selectedPlayer ? 1 : 0.5 }}>
            <div style={{ fontSize: 10 }}>{def.abbr}</div>
            <div style={{ fontSize: 13, fontWeight: 900 }}>{statsFor(selectedPlayer || '')[def.key] || 0}</div>
          </button>
        );


        const renderSpBtn = (mode) => {
          const isGreen = mode === 'pos';
          const hasOptions = isGreen ? specialPosDefs.length > 0 : specialNegDefs.length > 0;
          const isOpen = specialPicker === mode;
          return (
            <button key={`sp-${mode}`} disabled={!hasOptions || !selectedPlayer} onClick={() => setSpecialPicker(isOpen ? null : mode)}
              style={{ ...btnStyle(isGreen), opacity: (selectedPlayer && hasOptions) ? 1 : 0.5, position: 'relative' }}>
              <div style={{ fontSize: 9, fontWeight: 700 }}>SPECIAL</div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>SP{isOpen ? ' \u25B2' : ''}</div>
            </button>
          );
        };


        return (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, alignContent: 'start' }}>
                {greenDefs.map(renderQuickBtn)}
                {renderSpBtn('pos')}
              </div>
              <div style={{ width: 1, background: COLORS.border, alignSelf: 'stretch' }} />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, alignContent: 'start' }}>
                {redDefs.map(renderQuickBtn)}
                {renderSpBtn('neg')}
              </div>
            </div>


            {specialPicker && (() => {
              const opts = specialPicker === 'pos' ? specialPosDefs : specialNegDefs;
              const isGreen = specialPicker === 'pos';
              return (
                <div style={{ position: 'absolute', bottom: '100%', [isGreen ? 'left' : 'right']: 0, marginBottom: 6, background: COLORS.navyMid, border: `2px solid ${isGreen ? COLORS.green : COLORS.red}`, borderRadius: 10, padding: 8, zIndex: 50, minWidth: 170, maxHeight: '60vh', overflowY: 'auto', boxShadow: '0 -6px 24px rgba(0,0,0,0.5)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, marginBottom: 6, textAlign: 'center' }}>{isGreen ? 'Special (+)' : 'Special (-)'}</div>
                  {opts.map(def => (
                    <button key={def.key} onClick={() => { setSpecialPicker(null); tagStat(selectedPlayer, def.key); }} disabled={!selectedPlayer}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: COLORS.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 4, opacity: selectedPlayer ? 1 : 0.5 }}>
                      <span>{def.label}</span>
                      <span style={{ color: isGreen ? COLORS.green : COLORS.red, fontWeight: 900 }}>{def.value >= 0 ? '+' : ''}{def.value}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}


function MiniGameScoreboard({ game, opponentRecord, COLORS, logo, teamName }) {
  const oppName = game.opponents?.name || game.meta?.opponentName || 'Opponent';
  const oppAbbr = opponentRecord?.abbr;
  const oppPrimary = opponentRecord?.primary_color || '#6b7280';
  const oppSecondary = opponentRecord?.secondary_color || '#9ca3af';
  const ourScore = game.meta?.ourScore ?? 0;
  const theirScore = game.meta?.theirScore ?? 0;
  const isFinal = !!game.is_final;

  const teamRow = (color, logoSrc, fallbackInitial, fallbackColor, fallbackBorder, name, score, isTop) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
      background: `linear-gradient(90deg, ${color} 0%, #000 78%, #000 100%)`,
      borderRadius: isTop ? '6px 6px 0 0' : '0 0 6px 6px',
    }}>
      {logoSrc
        ? <img src={logoSrc} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: fallbackColor, border: fallbackBorder ? `1px solid ${fallbackBorder}` : 'none' }}>
            {fallbackInitial}
          </div>}
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.5, color: isTop ? COLORS.gold : fallbackColor, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
        {name}
      </div>
      {score != null && (
        <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{score}</div>
      )}
    </div>
  );

  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', borderBottom: `1px solid ${COLORS.border}` }}>
      {teamRow(COLORS.navy, logo, (teamName || '?').slice(0, 1), COLORS.gold, null, teamName || 'TM', ourScore, true)}
      <div style={{ padding: '2px 0', textAlign: 'center', background: '#0d1b2e' }}>
        {isFinal
          ? <div style={{ fontSize: 9, fontWeight: 800, color: '#ff3b30', letterSpacing: 1 }}>FINAL</div>
          : <div style={{ fontSize: 9, fontWeight: 700, color: COLORS.gold }}>IN PROGRESS</div>}
      </div>
      {teamRow(oppPrimary, opponentRecord?.logo_url, (oppAbbr || oppName || '?').slice(0, 1), oppSecondary, oppSecondary, oppName, theirScore, false)}
    </div>
  );
}


export default function GameScreen({ team, season, prefill, onPrefillConsumed }) {
  const { colors: COLORS, logo, teamName } = useTheme();
  const [opponents, setOpponents] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [games, setGames] = useState([]);
  const [oppId, setOppId] = useState('');
  const [date, setDate] = useState('');
  const [formatKey, setFormatKey] = useState(GAME_FORMAT_PRESETS[0].key);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);


  const loadGames = () => {
    supabase.from('games').select('*, opponents(name)').eq('season_id', season.id).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error) setGames(data); });
  };


  useEffect(() => {
    loadGames();
    supabase.from('opponents').select('*').eq('team_id', team.id).then(({ data, error }) => { if (!error) setOpponents(data); });
  }, [season.id, team.id]);


  useEffect(() => {
    if (prefill) {
      setOppId(prefill.opponentId || '');
      setDate(prefill.date || '');
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefill]);


  const deleteGame = async (gameId) => {
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (!error) { setConfirmingDeleteId(null); loadGames(); }
    else alert('Error deleting: ' + error.message);
  };


  const startGame = async () => {
    if (!oppId) return;
    const opp = opponents.find(o => o.id === oppId);
    const format = GAME_FORMAT_PRESETS.find(f => f.key === formatKey) || GAME_FORMAT_PRESETS[0];
    const { data, error } = await supabase.from('games').insert({
      season_id: season.id,
      opponent_id: oppId,
      meta: { opponentName: opp.name, date },
      player_stats: {},
      game_format: format,
    }).select().single();
    if (!error) setActiveGame(data);
  };


  if (activeGame) {
    return <ActiveGame team={team} game={activeGame} onSaved={() => { setActiveGame(null); loadGames(); }} onBack={() => { setActiveGame(null); loadGames(); }} backLabel="Back to Games" />;
  }


  const inputStyle = {
    padding: '9px 10px',
    background: COLORS.navyDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 7,
    color: COLORS.text,
    fontSize: 13,
  };

  return (
    <div>
      <div style={{ border: `1px solid ${COLORS.border}`, background: COLORS.navyMid, padding: 16, marginBottom: 20, borderRadius: 10 }}>
        <h4 style={{ color: COLORS.gold, marginTop: 0, marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Start New Game</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select value={oppId} onChange={e => setOppId(e.target.value)} style={inputStyle}>
            <option value="">Select opponent…</option>
            {opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <select value={formatKey} onChange={e => setFormatKey(e.target.value)} style={inputStyle}>
            {GAME_FORMAT_PRESETS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button onClick={startGame} style={{ padding: '9px 18px', background: COLORS.gold, border: 'none', borderRadius: 7, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Start Game →
          </button>
        </div>
      </div>


      <h4 style={{ color: COLORS.gold, marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Game Log</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {games.map(g => {
          const opponentRecord = opponents.find(o => o.name === g.opponents?.name);
          return (
            <div key={g.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 8, background: COLORS.navyMid }}>
              <MiniGameScoreboard game={g} opponentRecord={opponentRecord} COLORS={COLORS} logo={logo} teamName={teamName} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {!g.is_final && (
                  <button onClick={() => setActiveGame(g)}
                    style={{ flex: 1, padding: 8, background: COLORS.gold, border: 'none', color: COLORS.textDark, borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                    Continue Tagging
                  </button>
                )}
                {g.is_final && (
                  <button onClick={() => setActiveGame(g)}
                    style={{ flex: 1, padding: 8, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    View / Edit
                  </button>
                )}
                {confirmingDeleteId === g.id ? (
                  <>
                    <button onClick={() => deleteGame(g.id)} style={{ padding: '8px 10px', background: COLORS.red, color: COLORS.text, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Confirm</button>
                    <button onClick={() => setConfirmingDeleteId(null)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmingDeleteId(g.id)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {games.length === 0 && <p style={{ color: COLORS.muted }}>No games saved yet.</p>}
    </div>
  );
}