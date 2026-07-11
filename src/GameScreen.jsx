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
  const hudlToXovr = (s) => ({ '2PM': Math.max(0, (s.fgm || 0) - (s.fg3m || 0)), '2PA': Math.max(0, (s.fga || 0) - (s.fg3a || 0)), '3PM': s.fg3m || 0, '3PA': s.fg3a || 0, 'FTM': s.ftm || 0, 'FTA': s.fta || 0, 'O': s.oreb || 0, 'D': s.dreb || 0, 'AST': s.ast || 0, 'DF': s.defl || 0, 'STL': s.stl || 0, 'BS': s.blk || 0, 'TO': s.to || 0, 'PF': s.pf || 0, 'CHG_taken': s.chg || 0 });
  const COMPARE_STATS = [{ key: '2PM', label: '2PM' }, { key: '2PA', label: '2PA' }, { key: '3PM', label: '3PM' }, { key: '3PA', label: '3PA' }, { key: 'FTM', label: 'FTM' }, { key: 'FTA', label: 'FTA' }, { key: 'O', label: 'OREB' }, { key: 'D', label: 'DREB' }, { key: 'AST', label: 'AST' }, { key: 'DF', label: 'DEFL' }, { key: 'STL', label: 'STL' }, { key: 'BS', label: 'BLK' }, { key: 'TO', label: 'TO' }, { key: 'PF', label: 'PF' }, { key: 'CHG_taken', label: 'CHG' }];
  const buildComparison = useCallback(() => matchedStats.filter(m => m.rosterPlayerId).map(m => { const xovrStats = game.player_stats?.[m.rosterPlayerId] || {}; const hudlXovr = hudlToXovr(m.hudlStats); const diffs = COMPARE_STATS.filter(s => (xovrStats[s.key] || 0) !== (hudlXovr[s.key] || 0)); return { rosterPlayerId: m.rosterPlayerId, player: players.find(p => p.id === m.rosterPlayerId), hudlName: m.hudlName, hudlNumber: m.hudlNumber, xovrStats, hudlXovr, diffs, accepted: { ...xovrStats } }; }), [matchedStats, players, game.player_stats]);
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
    } catch (err) { setError('Save failed: ' + err.message); } finally { setSaving(false); }
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
            {error && <div style={{ color: COLORS.red, fontSize: 13, background: COLORS.redBg, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px 14px' }}>{error}</div>}
            <label style={{ padding: '14px 28px', background: COLORS.gold, borderRadius: 10, color: COLORS.textDark, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Choose PDF<input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} /></label>
          </div>
        )}
        {step === 'parsing' && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 48 }}><div style={{ fontSize: 64, fontWeight: 900, color: '#ff6a00' }}>H</div><div style={{ color: COLORS.text, fontWeight: 700, fontSize: 16 }}>Reading box score…</div></div>}
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
              {totalDiscrepancies > 0 ? <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700 }}>⚠️ <span style={{ color: COLORS.red }}>{totalDiscrepancies} discrepanc{totalDiscrepancies === 1 ? 'y' : 'ies'}</span> found.</div> : <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 700 }}>✅ All stats match!</div>}
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
                      <button onClick={() => acceptAllHudl(pi)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', background: 'rgba(255,106,0,0.12)', border: '1px solid #ff6a00', color: '#ff6a00' }}>All H</button>
                      <button onClick={() => acceptAllXovr(pi)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', background: COLORS.goldLight, border: `1px solid ${COLORS.gold}`, color: COLORS.gold }}>All XOVR</button>
                    </div> : <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 700 }}>✅ Match</div>}
                  </div>
                  {hasDiffs && (
                    <div style={{ marginBottom: 8 }}>
                      {c.diffs.map(s => {
                        const xv = c.xovrStats[s.key] || 0, hv = c.hudlXovr[s.key] || 0, acc = c.accepted[s.key] ?? xv;
                        const cx = acc === xv, ch = acc === hv && acc !== xv;
                        return (
                          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                            <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: COLORS.muted }}>{s.label}</div>
                            <button onClick={() => acceptXovr(pi, s.key)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: `2px solid ${cx ? COLORS.gold : COLORS.border}`, background: cx ? COLORS.goldLight : COLORS.navyDark, color: cx ? COLORS.gold : COLORS.text }}>{xv}<div style={{ fontSize: 9, color: cx ? COLORS.gold : COLORS.muted }}>XOVR</div></button>
                            <div style={{ color: COLORS.muted, fontSize: 12 }}>vs</div>
                            <button onClick={() => acceptHudl(pi, s.key)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: `2px solid ${ch ? '#ff6a00' : COLORS.border}`, background: ch ? 'rgba(255,106,0,0.12)' : COLORS.navyDark, color: ch ? '#ff6a00' : COLORS.text }}>{hv}<div style={{ fontSize: 9, color: ch ? '#ff6a00' : COLORS.muted }}>Hudl</div></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => setShowFull(prev => ({ ...prev, [pi]: !prev[pi] }))} style={{ width: '100%', padding: '6px 0', background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.muted, fontSize: 11, cursor: 'pointer' }}>{isExpanded ? '▲ Hide' : '▼ Show all stats'}</button>
                  {isExpanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginTop: 8 }}>
                      {COMPARE_STATS.map(s => { const xv = c.xovrStats[s.key] || 0, hv = c.hudlXovr[s.key] || 0, isDiff = xv !== hv, acc = c.accepted[s.key] ?? xv; return <div key={s.key} style={{ background: isDiff ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '5px 6px', border: `1px solid ${isDiff ? 'rgba(220,38,38,0.3)' : COLORS.border}` }}><div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 700, marginBottom: 2 }}>{s.label}</div><div style={{ display: 'flex', gap: 4 }}><span style={{ fontSize: 12, fontWeight: 900, color: isDiff ? COLORS.gold : COLORS.text }}>{acc}</span>{isDiff && <span style={{ fontSize: 9, color: '#ff6a00' }}>H:{hv}</span>}</div></div>; })}
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
