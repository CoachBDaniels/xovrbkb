import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { STAT_DEFS, GAME_FORMAT_PRESETS, emptyPlayerStats, calcPts, calcEff, CourtSVG, ShotChartView, BoxScoreReport, FormatPicker, applyStatDefs } from './GameReports';

function isInsideArc(x, y) {
  const svgX = x * 3;
  const svgY = y * 2.6;
  const dist = Math.sqrt((svgX - 150) ** 2 + (svgY - 32) ** 2);
  if (svgX <= 18 || svgX >= 282) return false;
  return dist < 145;
}

function MiniCourtTappable({ courtColor, laneColor, onTap, pendingShot, onConfirmShot, onCancelShot, COLORS }) {
  const svgRef = useRef(null);
  const getCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100, px: clientX - rect.left, py: clientY - rect.top, rectW: rect.width, rectH: rect.height };
  };
  const handleClick = (e) => { if (pendingShot) return; const c = getCoords(e); if (!c) return; onTap(c.x, c.y, c.px, c.py, c.rectW, c.rectH); };
  const handleTouch = (e) => { e.preventDefault(); if (pendingShot) return; const c = getCoords(e); if (!c) return; onTap(c.x, c.y, c.px, c.py, c.rectW, c.rectH); };
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} viewBox="0 0 300 260" onClick={handleClick} onTouchStart={handleTouch}
        style={{ width: '100%', display: 'block', background: courtColor || '#c8922a', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', userSelect: 'none' }}>
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
      {pendingShot && (
        <div style={{ position: 'absolute', left: Math.min(Math.max(pendingShot.px - 70, 0), pendingShot.rectW - 150), top: Math.min(Math.max(pendingShot.py - 60, 0), pendingShot.rectH - 80), width: 150, background: 'rgba(10,20,40,0.97)', border: `2px solid ${COLORS.gold}`, borderRadius: 12, padding: '8px 6px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: COLORS.muted, textAlign: 'center', fontWeight: 700, marginBottom: 2 }}>{pendingShot.is2pt ? '2PT' : '3PT'} — Make or Miss?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <button onClick={() => onConfirmShot(true)} style={{ padding: '10px 4px', background: '#14532d', border: '1px solid #22c55e', borderRadius: 8, color: '#4ade80', fontWeight: 900, fontSize: 18, cursor: 'pointer' }}>{pendingShot.is2pt ? '2✅' : '3✅'}</button>
            <button onClick={() => onConfirmShot(false)} style={{ padding: '10px 4px', background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, color: '#f87171', fontWeight: 900, fontSize: 18, cursor: 'pointer' }}>{pendingShot.is2pt ? '2❌' : '3❌'}</button>
          </div>
          <button onClick={onCancelShot} style={{ padding: '5px', background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.muted, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function StarterPicker({ players, onConfirm }) {
  const { colors: COLORS } = useTheme();
  const [picked, setPicked] = useState([]);
  const toggle = (id) => setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 5 ? [...prev, id] : prev));
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {players.map(p => {
          const sel = picked.includes(p.id);
          return <button key={p.id} onClick={() => toggle(p.id)} style={{ padding: '10px 14px', borderRadius: 8, border: sel ? '2px solid #c8a84b' : '1px solid #ccc', background: sel ? COLORS.goldLight : COLORS.navyMid, color: sel ? COLORS.textDark : COLORS.text, cursor: 'pointer', fontWeight: sel ? 700 : 500 }}>#{p.number || '—'} {p.name}</button>;
        })}
      </div>
      <div style={{ marginBottom: 12, fontSize: 13, color: COLORS.muted }}>{picked.length} of 5 selected</div>
      <button onClick={() => onConfirm(picked)} disabled={picked.length !== 5} style={{ padding: '12px 24px', fontWeight: 'bold', background: picked.length === 5 ? COLORS.gold : COLORS.navyMid, color: picked.length === 5 ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 8, cursor: picked.length === 5 ? 'pointer' : 'default' }}>Start Game →</button>
    </div>
  );
}

function HudlCompareModal({ game, team, onClose, onSaved }) {
  const { colors: COLORS } = useTheme();
  const [step, setStep] = useState('upload');
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [matchedStats, setMatchedStats] = useState([]);
  const [saving, setSaving] = useState(false);
  const [comparisons, setComparisons] = useState([]);
  const [showFull, setShowFull] = useState({});

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  }, [team.id]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('parsing'); setError(null);
    try {
      const base64Data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('Read failed')); r.readAsDataURL(file); });
      const prompt = `You are parsing a Hudl basketball box score PDF. Extract player stats for OUR team only (the first team listed).
Return ONLY valid JSON, no markdown:
{"players":[{"number":"<digits>","name":"<name>","pts":<n>,"fgm":<n>,"fga":<n>,"fg3m":<n>,"fg3a":<n>,"ftm":<n>,"fta":<n>,"oreb":<n>,"dreb":<n>,"ast":<n>,"defl":<n>,"stl":<n>,"blk":<n>,"to":<n>,"pf":<n>,"chg":<n>}]}
Rules: only non-zero stats players, jersey number digits only, fgm/fga = TOTAL including 3s, missing = 0`;
      const response = await fetch('/api/parse-hudl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }, { type: 'text', text: prompt }] }] }) });
      const data = await response.json();
      if (!data.content?.length) throw new Error('No content: ' + JSON.stringify(data));
      const parsed = JSON.parse(data.content.map(i => i.text || '').join('').trim().replace(/```json|```/g, '').trim());
      setParsedData(parsed);
      const matched = (parsed.players || []).map(hp => {
        const rp = players.find(p => String(p.number || '').replace('#', '').trim() === String(hp.number || '').replace('#', '').trim());
        return { hudlName: hp.name, hudlNumber: hp.number, rosterPlayerId: rp?.id || null, hudlStats: hp };
      });
      setMatchedStats(matched);
      setStep('compare');
    } catch (err) { setError('Failed to parse PDF: ' + err.message); setStep('upload'); }
  };

  const setRosterMatch = (idx, playerId) => setMatchedStats(prev => prev.map((m, i) => i === idx ? { ...m, rosterPlayerId: playerId || null } : m));

  const hudlToXovr = (s) => ({
    '2PM': Math.max(0, (s.fgm || 0) - (s.fg3m || 0)), '2PA': Math.max(0, (s.fga || 0) - (s.fg3a || 0)),
    '3PM': s.fg3m || 0, '3PA': s.fg3a || 0, 'FTM': s.ftm || 0, 'FTA': s.fta || 0,
    'O': s.oreb || 0, 'D': s.dreb || 0, 'AST': s.ast || 0, 'DF': s.defl || 0,
    'STL': s.stl || 0, 'BS': s.blk || 0, 'TO': s.to || 0, 'PF': s.pf || 0, 'CHG_taken': s.chg || 0,
  });

  const COMPARE_STATS = [
    { key: '2PM', label: '2PM' }, { key: '2PA', label: '2PA' }, { key: '3PM', label: '3PM' }, { key: '3PA', label: '3PA' },
    { key: 'FTM', label: 'FTM' }, { key: 'FTA', label: 'FTA' }, { key: 'O', label: 'OREB' }, { key: 'D', label: 'DREB' },
    { key: 'AST', label: 'AST' }, { key: 'DF', label: 'DEFL' }, { key: 'STL', label: 'STL' }, { key: 'BS', label: 'BLK' },
    { key: 'TO', label: 'TO' }, { key: 'PF', label: 'PF' }, { key: 'CHG_taken', label: 'CHG' },
  ];

  const buildComparison = useCallback(() => {
    return matchedStats.filter(m => m.rosterPlayerId).map(m => {
      const xovrStats = game.player_stats?.[m.rosterPlayerId] || {};
      const hudlXovr = hudlToXovr(m.hudlStats);
      const diffs = COMPARE_STATS.filter(s => (xovrStats[s.key] || 0) !== (hudlXovr[s.key] || 0));
      return { rosterPlayerId: m.rosterPlayerId, player: players.find(p => p.id === m.rosterPlayerId), hudlName: m.hudlName, hudlNumber: m.hudlNumber, xovrStats, hudlXovr, diffs, accepted: { ...xovrStats } };
    });
  }, [matchedStats, players, game.player_stats]);

  useEffect(() => { if (step === 'compare' && matchedStats.length > 0 && players.length > 0) setComparisons(buildComparison()); }, [step, matchedStats, players]);

  const acceptHudl = (pi, k) => setComparisons(prev => prev.map((c, i) => i !== pi ? c : { ...c, accepted: { ...c.accepted, [k]: c.hudlXovr[k] } }));
  const acceptXovr = (pi, k) => setComparisons(prev => prev.map((c, i) => i !== pi ? c : { ...c, accepted: { ...c.accepted, [k]: c.xovrStats[k] || 0 } }));
  const acceptAllHudl = (pi) => setComparisons(prev => prev.map((c, i) => { if (i !== pi) return c; const a = { ...c.accepted }; c.diffs.forEach(s => { a[s.key] = c.hudlXovr[s.key]; }); return { ...c, accepted: a }; }));
  const acceptAllXovr = (pi) => setComparisons(prev => prev.map((c, i) => { if (i !== pi) return c; const a = { ...c.accepted }; c.diffs.forEach(s => { a[s.key] = c.xovrStats[s.key] || 0; }); return { ...c, accepted: a }; }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedStats = { ...game.player_stats };
      comparisons.forEach(c => { updatedStats[c.rosterPlayerId] = { ...(updatedStats[c.rosterPlayerId] || {}), ...c.accepted }; });
      const { error } = await supabase.from('games').update({ player_stats: updatedStats, updated_at: new Date().toISOString() }).eq('id', game.id);
      if (error) throw new Error(error.message);
      onSaved(); onClose();
    } catch (err) { setError('Save failed: ' + err.message); }
    finally { setSaving(false); }
  };

  const totalDiscrepancies = comparisons.reduce((n, c) => n + c.diffs.length, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: COLORS.gold }}><span style={{ color: '#ff6a00', fontWeight: 900, fontSize: 18 }}>H</span> Hudl Compare</div>
        {step === 'compare' && comparisons.length > 0 ? <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button> : <div style={{ width: 60 }} />}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div>
            <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16, textAlign: 'center' }}>Upload Hudl Box Score</div>
            <div style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>Upload the Hudl PDF for this game. XOVR will compare it to your tagged stats and highlight discrepancies.</div>
            {error && <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px' }}>{error}</div>}
            <label style={{ padding: '14px 28px', background: COLORS.gold, borderRadius: 10, color: COLORS.textDark, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Choose PDF<input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} /></label>
          </div>
        )}
        {step === 'parsing' && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 48 }}><div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00', lineHeight: 1 }}>H</div><div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>Reading box score…</div></div>}
        {step === 'compare' && matchedStats.some(m => !m.rosterPlayerId) && (
          <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.gold}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 700, marginBottom: 8 }}>Map players to your roster:</div>
            {matchedStats.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>#{m.hudlNumber} {m.hudlName}</div>
                <select value={m.rosterPlayerId || ''} onChange={e => setRosterMatch(i, e.target.value)} style={{ width: '100%', padding: '7px 8px', background: COLORS.navyDark, border: `1px solid ${m.rosterPlayerId ? COLORS.gold : COLORS.border}`, borderRadius: 7, color: m.rosterPlayerId ? COLORS.gold : COLORS.muted, fontSize: 12, boxSizing: 'border-box' }}>
                  <option value="">— Skip —</option>
                  {players.map(p => <option key={p.id} value={p.id}>#{p.number || '—'} {p.name}</option>)}
                </select>
              </div>
            ))}
            <button onClick={() => setComparisons(buildComparison())} style={{ width: '100%', marginTop: 8, padding: 10, background: COLORS.gold, border: 'none', borderRadius: 8, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Run Comparison →</button>
          </div>
        )}
        {step === 'compare' && comparisons.length > 0 && (
          <div>
            <div style={{ background: totalDiscrepancies > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', border: `1px solid ${totalDiscrepancies > 0 ? COLORS.red : COLORS.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              {totalDiscrepancies > 0 ? <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>⚠️ <span style={{ color: COLORS.red }}>{totalDiscrepancies} discrepanc{totalDiscrepancies === 1 ? 'y' : 'ies'}</span> found. Tap each stat to choose XOVR or Hudl.</div>
                : <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 700 }}>✅ All stats match!</div>}
            </div>
            {error && <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>{error}</div>}
            {comparisons.map((c, pi) => {
              const hasDiffs = c.diffs.length > 0;
              const isExpanded = showFull[pi];
              return (
                <div key={c.rosterPlayerId} style={{ background: COLORS.navyMid, border: `1px solid ${hasDiffs ? COLORS.red : COLORS.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div><div style={{ fontWeight: 900, color: COLORS.text, fontSize: 13 }}>#{c.player?.number || '—'} {c.player?.name}</div><div style={{ fontSize: 10, color: COLORS.muted }}>Hudl: #{c.hudlNumber} {c.hudlName}</div></div>
                    {hasDiffs ? <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => acceptAllHudl(pi)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', background: 'rgba(255,106,0,0.12)', border: '1px solid #ff6a00', color: '#ff6a00' }}>All <span style={{ fontWeight: 900 }}>H</span></button>
                      <button onClick={() => acceptAllXovr(pi)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold }}>All XOVR</button>
                    </div> : <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 700 }}>✅ Match</div>}
                  </div>
                  {hasDiffs && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Discrepancies</div>
                      {c.diffs.map(s => {
                        const xv = c.xovrStats[s.key] || 0, hv = c.hudlXovr[s.key] || 0, acc = c.accepted[s.key] ?? xv;
                        const cx = acc === xv, ch = acc === hv && acc !== xv;
                        return (
                          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                            <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: COLORS.muted }}>{s.label}</div>
                            <button onClick={() => acceptXovr(pi, s.key)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: `2px solid ${cx ? COLORS.gold : COLORS.border}`, background: cx ? COLORS.goldLight : COLORS.navyDark, color: cx ? COLORS.gold : COLORS.text }}>{xv}<div style={{ fontSize: 9, fontWeight: 400, color: cx ? COLORS.gold : COLORS.muted }}>XOVR</div></button>
                            <div style={{ color: COLORS.muted, fontSize: 12 }}>vs</div>
                            <button onClick={() => acceptHudl(pi, s.key)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: `2px solid ${ch ? '#ff6a00' : COLORS.border}`, background: ch ? 'rgba(255,106,0,0.12)' : COLORS.navyDark, color: ch ? '#ff6a00' : COLORS.text }}>{hv}<div style={{ fontSize: 9, fontWeight: 400, color: ch ? '#ff6a00' : COLORS.muted }}>Hudl</div></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => setShowFull(prev => ({ ...prev, [pi]: !prev[pi] }))} style={{ width: '100%', padding: '6px 0', background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.muted, fontSize: 11, cursor: 'pointer', marginBottom: isExpanded ? 8 : 0 }}>{isExpanded ? '▲ Hide full stats' : '▼ Show all stats'}</button>
                  {isExpanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                      {COMPARE_STATS.map(s => {
                        const xv = c.xovrStats[s.key] || 0, hv = c.hudlXovr[s.key] || 0, isDiff = xv !== hv, acc = c.accepted[s.key] ?? xv;
                        return <div key={s.key} style={{ background: isDiff ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '5px 6px', border: `1px solid ${isDiff ? 'rgba(220,38,38,0.3)' : COLORS.border}` }}><div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, marginBottom: 2 }}>{s.label}</div><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 900, color: isDiff ? COLORS.gold : COLORS.text }}>{acc}</span>{isDiff && <span style={{ fontSize: 9, color: '#ff6a00' }}>H:{hv}</span>}</div></div>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 14, background: COLORS.gold, border: 'none', borderRadius: 10, color: COLORS.textDark, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>{saving ? 'Saving…' : 'Save Changes →'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildStatsFromEvents(events) {
  const stats = {};
  events.forEach(ev => {
    if (!stats[ev.player_id]) stats[ev.player_id] = emptyPlayerStats();
    stats[ev.player_id][ev.stat_key] = (stats[ev.player_id][ev.stat_key] || 0) + (ev.value || 1);
  });
  return stats;
}

function buildShotLogFromEvents(events) {
  return events.filter(ev => ev.meta?.isShot).map(ev => ({ playerId: ev.player_id, statKey: ev.stat_key, x: ev.meta.x, y: ev.meta.y, make: ev.meta.make, period: ev.period }));
}

export function ActiveGame({ team, game, onSaved, onBack, backLabel }) {
  const { colors: COLORS, logo, teamName, court, lane } = useTheme();
  const [players, setPlayers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameFormat, setGameFormat] = useState(game.game_format || GAME_FORMAT_PRESETS[0]);
  const [currentPeriod, setCurrentPeriod] = useState(game.meta?.currentPeriod || 1);
  const [clockMinutes, setClockMinutes] = useState(game.meta?.clockMinutes != null ? game.meta.clockMinutes : (game.game_format?.minutes || GAME_FORMAT_PRESETS[0].minutes));
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
  const [pendingShot, setPendingShot] = useState(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showLiveBoxScore, setShowLiveBoxScore] = useState(false);
  const [showShotChart, setShowShotChart] = useState(false);
  const [specialPicker, setSpecialPicker] = useState(null);
  const [statDefsReady, setStatDefsReady] = useState(false);

  const stats = buildStatsFromEvents(events);
  const shotLog = buildShotLogFromEvents(events);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('team_stat_defs').select('stat_defs').eq('team_id', team.id).maybeSingle();
      if (cancelled) return;
      if (data?.stat_defs?.length > 0) applyStatDefs(data.stat_defs);
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

  useEffect(() => {
    supabase.from('game_events').select('*').eq('game_id', game.id).order('created_at')
      .then(({ data, error }) => { if (!error && data) setEvents(data); });
  }, [game.id]);

  useEffect(() => {
    const channel = supabase.channel(`game-events-${game.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${game.id}` }, (payload) => {
        setEvents(prev => prev.find(e => e.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'game_events', filter: `game_id=eq.${game.id}` }, (payload) => {
        setEvents(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game.id]);

  const statsFor = (id) => stats[id] || emptyPlayerStats();

  const tagStat = async (playerId, key, shotMeta) => {
    if (!playerId) return;
    const { data, error } = await supabase.from('game_events').insert({
      game_id: game.id, player_id: playerId, stat_key: key, value: 1,
      period: currentPeriod, clock_seconds: clockMinutes * 60 + clockSeconds,
      meta: shotMeta || null,
    }).select().single();
    if (!error && data) setEvents(prev => prev.find(e => e.id === data.id) ? prev : [...prev, data]);
    setSelectedPlayer(null);
  };

  const handleCourtTap = (x, y, px, py, rectW, rectH) => {
    if (!selectedPlayer) return;
    setPendingShot({ x, y, px, py, rectW, rectH, is2pt: isInsideArc(x, y) });
  };

  const confirmShot = async (make) => {
    if (!pendingShot || !selectedPlayer) return;
    const { x, y, is2pt } = pendingShot;
    const key = is2pt ? (make ? '2PM' : '2PA') : (make ? '3PM' : '3PA');
    await tagStat(selectedPlayer, key, { isShot: true, x, y, make, period: currentPeriod });
    setPendingShot(null);
  };

  const undoLastAction = async () => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    await supabase.from('game_events').delete().eq('id', last.id);
    setEvents(prev => prev.filter(e => e.id !== last.id));
  };

  const ourScore = players.reduce((s, p) => s + calcPts(statsFor(p.id)), 0);
  const oppScore = calcPts(statsFor('OPP'));

  const playLogRef = useRef(null);
  useEffect(() => { if (playLogRef.current) playLogRef.current.scrollTop = playLogRef.current.scrollHeight; }, [events.length]);

  const autoSaveTimer = useRef(null);
  const skipFirstAutoSave = useRef(true);
  useEffect(() => {
    if (skipFirstAutoSave.current) { skipFirstAutoSave.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      supabase.from('games').update({
        meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog },
        game_format: gameFormat, updated_at: new Date().toISOString(),
      }).eq('id', game.id).then(({ error }) => { if (error) console.error('Meta save failed:', error.message); });
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [onCourt, checkInClock, minutesLog, currentPeriod, clockMinutes, clockSeconds, gameFormat]);

  const saveGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: stats, shot_log: shotLog,
      meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog },
      game_format: gameFormat, updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (!error) onSaved();
    else alert('Error saving: ' + error.message);
  };

  const endGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: stats, shot_log: shotLog,
      meta: { ...game.meta, ourScore: String(ourScore), theirScore: String(oppScore), currentPeriod, clockMinutes, clockSeconds, onCourt, checkInClock, minutesLog },
      game_format: gameFormat, is_final: true, updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (!error) { setConfirmingEnd(false); setShowReport(true); }
    else alert('Error saving: ' + error.message);
  };

  const clockTotalSeconds = clockMinutes * 60 + clockSeconds;

  const checkInLineup = (ids, explicitSeconds) => {
    const ts = explicitSeconds != null ? explicitSeconds : clockTotalSeconds;
    setCheckInClock(prev => { const next = { ...prev }; ids.forEach(pid => { next[pid] = ts; }); return next; });
  };

  const startWithLineup = (ids) => { setOnCourt(ids); checkInLineup(ids, clockMinutes * 60 + clockSeconds); };

  const bankMinutes = (atSeconds) => {
    setMinutesLog(prevLog => {
      const next = { ...prevLog };
      (onCourt || []).forEach(pid => { const startSec = checkInClock[pid]; if (startSec != null) { const elapsed = Math.max(0, startSec - atSeconds); next[pid] = (next[pid] || 0) + elapsed; } });
      return next;
    });
  };

  const openSubs = () => { setShowSubs(true); setSubOutIds([]); setSubInIds([]); };
  const toggleSubOut = (pid) => setSubOutIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  const toggleSubIn = (pid) => setSubInIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);

  const confirmSub = () => {
    if (subOutIds.length === 0 || subOutIds.length !== subInIds.length) return;
    setMinutesLog(prev => { const next = { ...prev }; subOutIds.forEach(pid => { const elapsed = Math.max(0, (checkInClock[pid] || clockTotalSeconds) - clockTotalSeconds); next[pid] = (next[pid] || 0) + elapsed; }); return next; });
    setCheckInClock(prev => { const next = { ...prev }; subOutIds.forEach(pid => { delete next[pid]; }); subInIds.forEach(pid => { next[pid] = clockTotalSeconds; }); return next; });
    setOnCourt(prev => [...prev.filter(pid => !subOutIds.includes(pid)), ...subInIds]);
    setSubOutIds([]); setSubInIds([]); setShowSubs(false);
    setConfirmMin(clockMinutes); setConfirmSec(clockSeconds); setShowSubClockConfirm(true);
  };

  const applySubClockConfirm = () => { setClockMinutes(confirmMin); setClockSeconds(confirmSec); setShowSubClockConfirm(false); };
  const openClockEdit = () => { setEditMin(clockMinutes); setEditSec(clockSeconds); setEditingClock(true); };
  const saveClockEdit = () => { setClockMinutes(editMin); setClockSeconds(editSec); setEditingClock(false); };

  const advancePeriod = () => {
    bankMinutes(clockTotalSeconds);
    const isOT = currentPeriod >= gameFormat.periods;
    const newMinutes = isOT ? gameFormat.otMinutes : gameFormat.minutes;
    setCurrentPeriod(p => p + 1); setClockMinutes(newMinutes); setClockSeconds(0);
    checkInLineup(onCourt || [], newMinutes * 60); setEditingClock(false);
  };

  const liveMinutesFor = (pid) => {
    const banked = minutesLog[pid] || 0;
    const startSec = checkInClock[pid];
    if (onCourt && onCourt.includes(pid) && startSec != null) return banked + Math.max(0, startSec - clockTotalSeconds);
    return banked;
  };
  const fmtMin = (totalSeconds) => { const m = Math.floor(totalSeconds / 60); const s = totalSeconds % 60; return m + ':' + String(s).padStart(2, '0'); };

  if (!statDefsReady) return <p style={{ color: COLORS.muted }}>Loading...</p>;
  if (!onCourt) return (
    <div>
      <h3>Pick Your 5 Starters</h3>
      <p style={{ color: COLORS.muted, fontSize: 13 }}>Tap exactly 5 players to begin the game.</p>
      <StarterPicker players={players} onConfirm={startWithLineup} />
    </div>
  );

  const ourDisplayName = teamName || 'TM';
  const oppDisplayName = opponent?.name || game.meta?.opponentName || 'OPP';
  const oppAbbr = opponent?.abbr || oppDisplayName.slice(0, 4).toUpperCase();

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
            <button onClick={advancePeriod} style={{ width: '100%', padding: 10, background: COLORS.greenBg, color: COLORS.green, border: `1px solid ${COLORS.green}`, borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>End {gameFormat.periodLabel} {currentPeriod} → Start {currentPeriod >= gameFormat.periods ? 'OT' : gameFormat.periodLabel + ' ' + (currentPeriod + 1)}</button>
            <button onClick={() => { setDraftFormat(gameFormat); setEditingFormat(true); }} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>▼ Edit Game Format</button>
            <button onClick={() => setEditingClock(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {editingFormat && draftFormat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 16 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Edit Game Format</div>
            <FormatPicker value={draftFormat} onChange={setDraftFormat} />
            <button onClick={() => { setGameFormat(draftFormat); setEditingFormat(false); setDraftFormat(null); }} style={{ width: '100%', padding: 11, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 14 }}>Apply</button>
            <button onClick={() => { setEditingFormat(false); setDraftFormat(null); }} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
          </div>
        </div>
      )}

      {(() => {
        const ourPrimary = COLORS.navy;
        const oppPrimary = opponent?.primary_color || '#6b7280';
        const oppSecondary = opponent?.secondary_color || '#9ca3af';
        return (
          <div style={{ display: 'flex', borderBottom: `2px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: `linear-gradient(90deg, ${ourPrimary} 0%, #000 48%, #000 52%, ${oppPrimary} 100%)` }}>
            <div style={{ flex: 1, padding: '6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}>
              {logo ? <img src={logo} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: COLORS.gold }}>{ourDisplayName.slice(0, 1)}</div>}
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: COLORS.gold, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80, flexShrink: 1 }}>{ourDisplayName}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{ourScore}</div>
            </div>
            <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 80 }}>
              <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, letterSpacing: 1.5 }}>{gameFormat.periodLabel.slice(0, 1).toUpperCase()}{currentPeriod}{currentPeriod > gameFormat.periods ? ' OT' : ''}</div>
              <button onClick={openClockEdit} style={{ fontSize: 22, fontWeight: 700, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Courier New', monospace", letterSpacing: 2, padding: 0, lineHeight: 1.1, textShadow: '0 0 6px rgba(255,59,48,0.85)' }}>{clockMinutes}:{String(clockSeconds).padStart(2, '0')}</button>
            </div>
            <div style={{ flex: 1, padding: '6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{oppScore}</div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: oppSecondary, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80, flexShrink: 1 }}>{oppDisplayName}</div>
              {opponent?.logo_url ? <img src={opponent.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: oppSecondary, border: `1px solid ${oppSecondary}` }}>{oppDisplayName.slice(0, 1)}</div>}
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'stretch' }}>
        <div style={{ width: 78, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 260 }}>
          {players.filter(p => onCourt.includes(p.id)).map(p => {
            const sel = selectedPlayer === p.id;
            const eff = calcEff(statsFor(p.id));
            return (
              <button key={p.id} onClick={() => setSelectedPlayer(sel ? null : p.id)}
                style={{ padding: '6px 3px', borderRadius: 7, border: sel ? `2px solid ${COLORS.gold}` : '1px solid #ccc', background: sel ? COLORS.goldLight : COLORS.playerBtnBg, color: sel ? COLORS.textDark : COLORS.playerBtnText, cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{p.number || '—'} {(p.name || '').split(' ')[0]}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sel ? COLORS.textDark : (eff >= 0 ? COLORS.green : COLORS.red) }}>{eff >= 0 ? '+' : ''}{eff}</span>
                  <span style={{ fontSize: 8, color: sel ? COLORS.textDark : COLORS.muted }}>{fmtMin(liveMinutesFor(p.id))}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }}>
          <MiniCourtTappable courtColor={court} laneColor={lane} onTap={handleCourtTap} pendingShot={pendingShot} onConfirmShot={confirmShot} onCancelShot={() => setPendingShot(null)} COLORS={COLORS} />
        </div>
        <div style={{ width: 78, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setSelectedPlayer('OPP')} style={{ width: '100%', padding: '8px 4px', borderRadius: 7, border: selectedPlayer === 'OPP' ? `2px solid ${COLORS.gold}` : '1px solid #ccc', background: selectedPlayer === 'OPP' ? COLORS.gold : COLORS.navyMid, color: selectedPlayer === 'OPP' ? COLORS.textDark : COLORS.text, cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>{oppAbbr}</button>
          <button onClick={openSubs} style={{ padding: '8px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>🔄 Subs</button>
          <button onClick={() => setShowLiveBoxScore(true)} style={{ padding: '8px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>📊 Box</button>
          <button onClick={() => setShowShotChart(true)} style={{ padding: '8px 2px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>🎯 Shots</button>
          <button onClick={saveGame} style={{ padding: '8px 2px', background: 'rgba(200,168,75,0.1)', border: `1px solid ${COLORS.gold}`, borderRadius: 8, color: COLORS.gold, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>💾 Save</button>
          <button onClick={() => setConfirmingEnd(true)} style={{ padding: '8px 2px', background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, color: COLORS.red, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>🏁 End</button>
        </div>
      </div>

      {onBack && <button onClick={onBack} style={{ marginBottom: 8, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer' }}>← {backLabel || 'Back'}</button>}

      {events.length > 0 && (
        <div ref={playLogRef} style={{ height: 30, overflowY: 'auto', marginBottom: 10, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, padding: '2px 6px' }}>
          {events.map((ev, i) => {
            const def = STAT_DEFS.find(d => d.key === ev.stat_key);
            const p = players.find(pl => pl.id === ev.player_id);
            const label = ev.player_id === 'OPP' ? oppAbbr : (p ? `#${p.number || '—'} ${(p.name || '').split(' ')[0]}` : '#?');
            const isGreen = def ? def.value >= 0 : true;
            const isLast = i === events.length - 1;
            return (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 2px', fontSize: 10, fontWeight: isLast ? 800 : 600, color: isGreen ? COLORS.statPosText : COLORS.statNegText, background: isLast ? (isGreen ? COLORS.statPosBg : COLORS.statNegBg) : 'transparent' }}>
                <span>{label}</span>
                <span>{def ? def.label : ev.stat_key}</span>
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const GREEN_KEYS = ["O", "D", "AST", "STL", "FTM"];
        const greenDefs = GREEN_KEYS.map(k => STAT_DEFS.find(d => d.key === k)).filter(Boolean);
        const LIVE_KEYS = new Set([...GREEN_KEYS, "TO", "AP", "FTA", "PF"]);
        const specialPosDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value >= 0 && !['3PM','3PA','2PM','2PA'].includes(d.key));
        const specialNegDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value < 0 && !['3PM','3PA','2PM','2PA'].includes(d.key));
        const btnStyle = (isGreen) => ({ padding: '10px 2px', borderRadius: 7, cursor: 'pointer', textAlign: 'center', background: isGreen ? COLORS.statPosBg : COLORS.statNegBg, border: `2px solid ${isGreen ? COLORS.statPosBorder : COLORS.statNegBorder}`, color: isGreen ? COLORS.statPosText : COLORS.statNegText, fontWeight: 700 });
        const renderBtn = (def) => (
          <button key={def.key} onClick={() => tagStat(selectedPlayer, def.key)} disabled={!selectedPlayer} style={{ ...btnStyle(def.value >= 0), opacity: selectedPlayer ? 1 : 0.5 }}>
            <div style={{ fontSize: 10 }}>{def.abbr}</div>
            <div style={{ fontSize: 13, fontWeight: 900 }}>{statsFor(selectedPlayer || '')[def.key] || 0}</div>
          </button>
        );
        const toBtn = STAT_DEFS.find(d => d.key === 'TO');
        const pfBtn = STAT_DEFS.find(d => d.key === 'PF');
        const apBtn = STAT_DEFS.find(d => d.key === 'AP');
        const ftaBtn = STAT_DEFS.find(d => d.key === 'FTA');
        return (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, alignContent: 'start' }}>
                {greenDefs.map(renderBtn)}
                <button disabled={specialPosDefs.length === 0 || !selectedPlayer} onClick={() => setSpecialPicker(specialPicker === 'pos' ? null : 'pos')} style={{ ...btnStyle(true), opacity: (selectedPlayer && specialPosDefs.length > 0) ? 1 : 0.5 }}>
                  <div style={{ fontSize: 9 }}>SPECIAL</div><div style={{ fontSize: 13, fontWeight: 900 }}>SP{specialPicker === 'pos' ? ' ▲' : ''}</div>
                </button>
              </div>
              <div style={{ width: 1, background: COLORS.border, alignSelf: 'stretch' }} />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, alignContent: 'start' }}>
                {toBtn && renderBtn(toBtn)}
                {pfBtn && renderBtn(pfBtn)}
                {apBtn && renderBtn(apBtn)}
                {ftaBtn && renderBtn(ftaBtn)}
                <button disabled={specialNegDefs.length === 0 || !selectedPlayer} onClick={() => setSpecialPicker(specialPicker === 'neg' ? null : 'neg')} style={{ ...btnStyle(false), opacity: (selectedPlayer && specialNegDefs.length > 0) ? 1 : 0.5 }}>
                  <div style={{ fontSize: 9 }}>SPECIAL</div><div style={{ fontSize: 13, fontWeight: 900 }}>SP{specialPicker === 'neg' ? ' ▲' : ''}</div>
                </button>
                <button onClick={undoLastAction} disabled={events.length === 0} style={{ padding: '10px 2px', borderRadius: 7, textAlign: 'center', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: `2px solid ${events.length === 0 ? COLORS.border : COLORS.gold}`, color: events.length === 0 ? COLORS.muted : COLORS.gold, cursor: events.length === 0 ? 'default' : 'pointer', opacity: events.length === 0 ? 0.4 : 1 }}>
                  <div style={{ fontSize: 10 }}>UNDO</div><div style={{ fontSize: 13, fontWeight: 900 }}>↩</div>
                </button>
              </div>
            </div>
            {specialPicker === 'pos' && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: COLORS.navyMid, border: `2px solid ${COLORS.green}`, borderRadius: 10, padding: 8, zIndex: 50, minWidth: 170, maxHeight: '60vh', overflowY: 'auto', boxShadow: '0 -6px 24px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, marginBottom: 6, textAlign: 'center' }}>Special (+)</div>
                {specialPosDefs.map(def => <button key={def.key} onClick={() => { setSpecialPicker(null); tagStat(selectedPlayer, def.key); }} disabled={!selectedPlayer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: COLORS.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 6, opacity: selectedPlayer ? 1 : 0.5 }}><span>{def.label}</span><span style={{ color: COLORS.green, fontWeight: 900 }}>+{def.value}</span></button>)}
              </div>
            )}
            {specialPicker === 'neg' && (
              <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, background: COLORS.navyMid, border: `2px solid ${COLORS.red}`, borderRadius: 10, padding: 8, zIndex: 50, minWidth: 170, maxHeight: '60vh', overflowY: 'auto', boxShadow: '0 -6px 24px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, marginBottom: 6, textAlign: 'center' }}>Special (-)</div>
                {specialNegDefs.map(def => <button key={def.key} onClick={() => { setSpecialPicker(null); tagStat(selectedPlayer, def.key); }} disabled={!selectedPlayer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 10px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: COLORS.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 6, opacity: selectedPlayer ? 1 : 0.5 }}><span>{def.label}</span><span style={{ color: COLORS.red, fontWeight: 900 }}>{def.value}</span></button>)}
              </div>
            )}
          </div>
        );
      })()}

      {showSubs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 320, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Substitutions</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Sub OUT ({subOutIds.length} selected):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {players.filter(p => onCourt.includes(p.id)).map(p => <button key={p.id} onClick={() => toggleSubOut(p.id)} style={{ padding: '8px 10px', borderRadius: 8, border: subOutIds.includes(p.id) ? `2px solid ${COLORS.red}` : `1px solid ${COLORS.border}`, background: subOutIds.includes(p.id) ? COLORS.redBg : COLORS.navyDark, color: COLORS.text, cursor: 'pointer' }}>#{p.number || '—'} {p.name}</button>)}
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Sub IN ({subInIds.length} selected):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {players.filter(p => !onCourt.includes(p.id)).map(p => <button key={p.id} onClick={() => toggleSubIn(p.id)} style={{ padding: '8px 10px', borderRadius: 8, border: subInIds.includes(p.id) ? `2px solid ${COLORS.green}` : `1px solid ${COLORS.border}`, background: subInIds.includes(p.id) ? COLORS.greenBg : COLORS.navyDark, color: COLORS.text, cursor: 'pointer' }}>#{p.number || '—'} {p.name}</button>)}
            </div>
            {subOutIds.length !== subInIds.length && (subOutIds.length > 0 || subInIds.length > 0) && <div style={{ fontSize: 12, color: COLORS.gold, marginBottom: 10, textAlign: 'center' }}>Select the same number on each side ({subOutIds.length} out, {subInIds.length} in)</div>}
            <button onClick={confirmSub} disabled={subOutIds.length === 0 || subOutIds.length !== subInIds.length} style={{ width: '100%', padding: 10, background: (subOutIds.length > 0 && subOutIds.length === subInIds.length) ? COLORS.gold : COLORS.navyDark, color: (subOutIds.length > 0 && subOutIds.length === subInIds.length) ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Confirm Sub</button>
            <button onClick={() => setShowSubs(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      {showSubClockConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 280 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>What does the clock show right now?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="number" value={confirmMin} onChange={e => setConfirmMin(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
              <span style={{ fontSize: 18, alignSelf: 'center' }}>:</span>
              <input type="number" value={confirmSec} onChange={e => setConfirmSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 70, padding: 10, fontSize: 18, textAlign: 'center', background: COLORS.navyDark, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 7 }} />
            </div>
            <button onClick={applySubClockConfirm} style={{ width: '100%', padding: 10, background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
          </div>
        </div>
      )}

      {confirmingEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, width: 300 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>End this game?</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>This marks the game as final.</div>
            <button onClick={endGame} style={{ width: '100%', padding: 10, background: COLORS.red, color: COLORS.text, border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Yes, end game</button>
            <button onClick={() => setConfirmingEnd(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Not yet</button>
          </div>
        </div>
      )}

      {showLiveBoxScore && <BoxScoreReport team={team} teamName={teamName} logo={logo} opponent={opponent || { name: game.meta?.opponentName }} players={players} stats={stats} minutesLog={minutesLog} checkInClock={checkInClock} onCourt={onCourt} clockTotalSeconds={clockTotalSeconds} shotLog={shotLog} court={court} lane={lane} onClose={() => setShowLiveBoxScore(false)} />}
      {showShotChart && <ShotChartView players={players} shotLog={shotLog} opponent={opponent || { name: game.meta?.opponentName }} court={court} lane={lane} onClose={() => setShowShotChart(false)} />}

      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', color: COLORS.textDark, zIndex: 200, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { setShowReport(false); onSaved(); }} style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: 8, background: 'none', cursor: 'pointer' }}>Close</button>
            <button onClick={() => {
              const content = document.getElementById('final-report-printable')?.innerHTML || '';
              const win = window.open('', '_blank');
              win.document.write(`<!DOCTYPE html><html><head><title>Game Report</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Inter, sans-serif; color: #1a1a1a; padding: 20px; } table { width: 100%; border-collapse: collapse; } th { background: #1a3a6b; color: #fff; padding: 6px 4px; text-align: center; font-weight: 700; font-size: 9px; } td { padding: 5px 4px; text-align: center; border-bottom: 1px solid #dde3ef; font-size: 10px; } tr:nth-child(even) { background: #f0f4fa; } @page { size: landscape; margin: 10mm; }</style></head><body>${content}</body></html>`);
              win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
            }} style={{ padding: '8px 14px', background: COLORS.gold, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
          </div>
          <div id="final-report-printable">
            <h2 style={{ marginBottom: 4 }}>Final: {ourScore} - {oppScore}</h2>
            <div style={{ color: COLORS.muted, marginBottom: 16 }}>vs. {opponent?.name || game.meta?.opponentName || '—'} · {game.meta?.date || ''}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <thead><tr style={{ background: COLORS.navy, color: COLORS.text }}><th style={{ padding: 6, textAlign: 'left' }}>Player</th><th style={{ padding: 6 }}>MIN</th><th style={{ padding: 6 }}>PTS</th><th style={{ padding: 6 }}>EFF</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: 6 }}>#{p.number || '—'} {p.name}</td>
                    <td style={{ padding: 6, textAlign: 'center' }}>{fmtMin(liveMinutesFor(p.id))}</td>
                    <td style={{ padding: 6, textAlign: 'center' }}>{calcPts(statsFor(p.id))}</td>
                    <td style={{ padding: 6, textAlign: 'center', fontWeight: 700, color: calcEff(statsFor(p.id)) >= 0 ? COLORS.green : COLORS.red }}>{calcEff(statsFor(p.id)) >= 0 ? '+' : ''}{calcEff(statsFor(p.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <CourtSVG shots={shotLog.filter(s => s.playerId !== 'OPP')} interactive={false} courtColor={court} laneColor={lane} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniGameScoreboard({ game, opponentRecord, COLORS, logo, teamName }) {
  const oppName = game.opponents?.name || game.meta?.opponentName || 'Opponent';
  const oppPrimary = opponentRecord?.primary_color || '#6b7280';
  const oppSecondary = opponentRecord?.secondary_color || '#9ca3af';
  const ourScore = game.meta?.ourScore ?? 0;
  const theirScore = game.meta?.theirScore ?? 0;
  const isFinal = !!game.is_final;
  const teamRow = (color, logoSrc, fallbackInitial, fallbackColor, fallbackBorder, name, score, isTop) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: `linear-gradient(90deg, ${color} 0%, #000 78%, #000 100%)`, borderRadius: isTop ? '6px 6px 0 0' : '0 0 6px 6px' }}>
      {logoSrc ? <img src={logoSrc} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: fallbackColor, border: fallbackBorder ? `1px solid ${fallbackBorder}` : 'none' }}>{fallbackInitial}</div>}
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.5, color: isTop ? COLORS.gold : fallbackColor, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{name}</div>
      {score != null && <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{score}</div>}
    </div>
  );
  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', borderBottom: `1px solid ${COLORS.border}` }}>
      {teamRow(COLORS.navy, logo, (teamName || '?').slice(0, 1), COLORS.gold, null, teamName || 'TM', ourScore, true)}
      <div style={{ padding: '2px 0', textAlign: 'center', background: '#0d1b2e' }}>
        {isFinal ? <div style={{ fontSize: 9, fontWeight: 800, color: '#ff3b30', letterSpacing: 1 }}>FINAL</div> : <div style={{ fontSize: 9, fontWeight: 700, color: COLORS.gold }}>IN PROGRESS</div>}
      </div>
      {teamRow(oppPrimary, opponentRecord?.logo_url, (oppName || '?').slice(0, 1), oppSecondary, oppSecondary, oppName, theirScore, false)}
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
  const [hudlCompareGame, setHudlCompareGame] = useState(null);

  const loadGames = () => {
    supabase.from('games').select('*, opponents(name)').eq('season_id', season.id).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error) setGames(data); });
  };

  useEffect(() => {
    loadGames();
    supabase.from('opponents').select('*').eq('team_id', team.id).then(({ data, error }) => { if (!error) setOpponents(data); });
  }, [season.id, team.id]);

  useEffect(() => {
    if (prefill) { setOppId(prefill.opponentId || ''); setDate(prefill.date || ''); if (onPrefillConsumed) onPrefillConsumed(); }
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
      season_id: season.id, opponent_id: oppId,
      meta: { opponentName: opp.name, date },
      player_stats: {}, game_format: format,
    }).select().single();
    if (!error) setActiveGame(data);
  };

  if (activeGame) return <ActiveGame team={team} game={activeGame} onSaved={() => { setActiveGame(null); loadGames(); }} onBack={() => { setActiveGame(null); loadGames(); }} backLabel="Back to Games" />;

  const inputStyle = { padding: '9px 10px', background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, fontSize: 13 };

  return (
    <div>
      {hudlCompareGame && <HudlCompareModal game={hudlCompareGame} team={team} onClose={() => setHudlCompareGame(null)} onSaved={() => { loadGames(); }} />}
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
          <button onClick={startGame} style={{ padding: '9px 18px', background: COLORS.gold, border: 'none', borderRadius: 7, color: COLORS.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Start Game →</button>
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
                {!g.is_final ? (
                  <button onClick={() => setActiveGame(g)} style={{ flex: 1, padding: 8, background: COLORS.gold, border: 'none', color: COLORS.textDark, borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Continue Tagging</button>
                ) : (
                  <>
                    <button onClick={() => setActiveGame(g)} style={{ flex: 1, padding: 8, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>View / Edit</button>
                    <button onClick={() => setHudlCompareGame(g)} style={{ padding: '8px 12px', background: 'rgba(255,106,0,0.12)', border: '1px solid #ff6a00', color: '#ff6a00', borderRadius: 6, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>H</button>
                  </>
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
