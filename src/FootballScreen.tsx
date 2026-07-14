import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const DEFENSE_STATS = [
  { key: 'T', label: 'Tackle', abbr: 'T', value: 3 },
  { key: 'AT', label: 'Assist Tackle', abbr: 'AT', value: 1 },
  { key: 'MT', label: 'Missed Tackle', abbr: 'MT', value: -3 },
  { key: 'MajA', label: 'Major Assignment', abbr: 'Maj A', value: -3 },
  { key: 'MinA', label: 'Minor Assignment', abbr: 'Min A', value: -1 },
  { key: 'MAlign', label: 'Misalignment', abbr: 'M Aln', value: -1 },
  { key: 'KA', label: 'Keep Alive', abbr: 'KA', value: 2 },
  { key: 'Sack', label: 'Sack', abbr: 'Sack', value: 5 },
  { key: 'Pressure', label: 'Pressure', abbr: 'Pres', value: 3 },
  { key: 'TFL', label: 'Tackle for Loss', abbr: 'TFL', value: 5 },
  { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
  { key: 'ForcedPen', label: 'Forced Penalty', abbr: 'F Pen', value: 2 },
  { key: 'SniffPD', label: 'Sniff/Pass Def', abbr: 'PD', value: 2 },
  { key: 'FRFum', label: 'Force/Rec Fumble', abbr: 'Fum', value: 5 },
  { key: 'PBU', label: 'Pass Break Up', abbr: 'PBU', value: 3 },
  { key: 'INT', label: 'Interception', abbr: 'INT', value: 5 },
  { key: 'DefTD', label: 'Defensive TD', abbr: 'DTD', value: 7 },
  { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
];

const OFFENSE_STATS_BY_POS = {
  QB: [
    { key: 'CA', label: 'Completion', abbr: 'CA', value: 3 },
    { key: 'INC', label: 'Incomplete', abbr: 'INC', value: -1 },
    { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 7 },
    { key: 'INT', label: 'Interception', abbr: 'INT', value: -5 },
    { key: 'IW', label: 'INT Worthy', abbr: 'IW', value: -3 },
    { key: 'SCR', label: 'Scramble/Run', abbr: 'SCR', value: 3 },
    { key: 'TA', label: 'Throw Away', abbr: 'TA', value: 1 },
    { key: 'Sack', label: 'Sack Taken', abbr: 'Sack', value: -3 },
    { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
    { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
  ],
  RB: [
    { key: 'YAC', label: 'Yards After Contact', abbr: 'YAC', value: 2 },
    { key: 'BT', label: 'Broken Tackle', abbr: 'BT', value: 3 },
    { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 7 },
    { key: 'Fum', label: 'Fumble', abbr: 'Fum', value: -5 },
    { key: 'PP', label: 'Pass Pro Success', abbr: 'PP', value: 2 },
    { key: 'PPF', label: 'Pass Pro Failure', abbr: 'PPF', value: -3 },
    { key: 'DC', label: 'Dropped Catch', abbr: 'DC', value: -2 },
    { key: 'WG', label: 'Wrong Gap', abbr: 'WG', value: -2 },
    { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
    { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
  ],
  WR: [
    { key: 'Catch', label: 'Catch', abbr: 'Catch', value: 2 },
    { key: 'CC', label: 'Contested Catch', abbr: 'CC', value: 5 },
    { key: 'YAC', label: 'Yards After Catch', abbr: 'YAC', value: 2 },
    { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 7 },
    { key: 'Drop', label: 'Dropped Pass', abbr: 'Drop', value: -3 },
    { key: 'WrongRoute', label: 'Wrong Route', abbr: 'WR', value: -2 },
    { key: 'OPI', label: 'Offensive PI', abbr: 'OPI', value: -3 },
    { key: 'DBL', label: 'Downfield Block', abbr: 'DBL', value: 2 },
    { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
    { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
  ],
  TE: [
    { key: 'Catch', label: 'Catch', abbr: 'Catch', value: 2 },
    { key: 'CC', label: 'Contested Catch', abbr: 'CC', value: 5 },
    { key: 'YAC', label: 'Yards After Catch', abbr: 'YAC', value: 2 },
    { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 7 },
    { key: 'Drop', label: 'Dropped Pass', abbr: 'Drop', value: -3 },
    { key: 'WrongRoute', label: 'Wrong Route', abbr: 'WR', value: -2 },
    { key: 'OPI', label: 'Offensive PI', abbr: 'OPI', value: -3 },
    { key: 'DBL', label: 'Downfield Block', abbr: 'DBL', value: 2 },
    { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
    { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
  ],
  OL: [
    { key: 'PB', label: 'Pancake Block', abbr: 'PB', value: 5 },
    { key: 'SB', label: 'Sustained Block', abbr: 'SB', value: 2 },
    { key: 'DB', label: 'Down Block', abbr: 'DB', value: 2 },
    { key: 'Pull', label: 'Pull Block', abbr: 'Pull', value: 3 },
    { key: 'SA', label: 'Sack Allowed', abbr: 'SA', value: -5 },
    { key: 'PA', label: 'Pressure Allowed', abbr: 'PA', value: -3 },
    { key: 'HA', label: 'Hurry Allowed', abbr: 'HA', value: -2 },
    { key: 'MA', label: 'Missed Assignment', abbr: 'MA', value: -3 },
    { key: 'WB', label: 'Whiff Block', abbr: 'WB', value: -3 },
    { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
    { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
  ],
};

const SPECIAL_TEAMS_STATS = [
  { key: 'FGM', label: 'FG Made', abbr: 'FGM', value: 5 },
  { key: 'FGX', label: 'FG Missed', abbr: 'FGX', value: -3 },
  { key: 'KO_TB', label: 'Kickoff Touchback', abbr: 'TB', value: 3 },
  { key: 'GoodRet', label: 'Good Return', abbr: 'Ret', value: 3 },
  { key: 'RetTD', label: 'Return TD', abbr: 'RTD', value: 7 },
  { key: 'Fum', label: 'Fumble', abbr: 'Fum', value: -5 },
  { key: 'STTackle', label: 'ST Tackle', abbr: 'T', value: 3 },
  { key: 'ForceOOB', label: 'Force Out of Bounds', abbr: 'OOB', value: 2 },
  { key: 'Pen', label: 'Penalty', abbr: 'Pen', value: -3 },
  { key: 'Loaf', label: 'Loafing', abbr: 'Loaf', value: -5 },
];

const POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS'];
const OFFENSE_POS = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSE_POS = ['DL', 'LB', 'DB'];
const SPECIAL_POS = ['K', 'P', 'LS'];

function getStatsForPosition(pos) {
  if (OFFENSE_POS.includes(pos)) return OFFENSE_STATS_BY_POS[pos] || OFFENSE_STATS_BY_POS['WR'];
  if (DEFENSE_POS.includes(pos)) return DEFENSE_STATS;
  if (SPECIAL_POS.includes(pos)) return SPECIAL_TEAMS_STATS;
  return DEFENSE_STATS;
}

function calcFootballEff(stats, statDefs) {
  return statDefs.reduce((sum, def) => sum + (stats[def.key] || 0) * def.value, 0);
}

const C = {
  navyDark: '#060f1a', navyMid: '#0d1b2e', navy: '#1a3a6b',
  border: '#243d6b', gold: '#c8a84b', goldLight: 'rgba(200,168,75,0.15)',
  text: '#e8edf5', muted: '#8a99b8', textDark: '#0d1b2e',
  green: '#22c55e', greenBg: 'rgba(34,197,94,0.12)',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.12)',
  statPosBg: 'rgba(22,101,52,0.3)', statPosBorder: '#16a34a', statPosText: '#4ade80',
  statNegBg: 'rgba(127,29,29,0.3)', statNegBorder: '#b91c1c', statNegText: '#f87171',
};

function FBRosterScreen({ team, role }) {
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('QB');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const load = () => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  };
  useEffect(() => { load(); }, [team.id]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('players').insert({
      team_id: team.id,
      name: newName.trim(),
      number: newNumber.trim() || null,
      position: newPos,
    });
    if (error) { alert('Error adding player: ' + error.message); return; }
    setNewName('');
    setNewNumber('');
    setNewPos('QB');
    load();
  };

  const remove = async (id) => {
    await supabase.from('players').delete().eq('id', id);
    load();
  };

  const updateField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    await supabase.from('players').update({ [field]: value }).eq('id', id);
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <input placeholder="#" value={newNumber} onChange={e => setNewNumber(e.target.value)} style={{ width: 56, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <input placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, minWidth: 120, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <select value={newPos} onChange={e => setNewPos(e.target.value)} style={{ padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }}>
            {POSITION_GROUPS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={add} style={{ padding: '8px 14px', background: C.gold, color: C.textDark, border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', width: '100%' }}>+ Add Player</button>
        </div>
      )}
      {players.map(p => (
        <div key={p.id} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          {editingId === p.id ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={p.number || ''} onChange={e => updateField(p.id, 'number', e.target.value)} placeholder="#" style={{ width: 56, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, textAlign: 'center' }} />
                <input value={p.name || ''} onChange={e => updateField(p.id, 'name', e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
                <select value={p.position || 'QB'} onChange={e => updateField(p.id, 'position', e.target.value)} style={{ padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }}>
                  {POSITION_GROUPS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
              <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: C.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: C.gold, border: `1px solid ${C.border}` }}>{p.number || '—'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{p.position || '—'}</div>
              </div>
              {canEdit && <button onClick={() => setEditingId(p.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Edit</button>}
              {canEdit && <button onClick={() => remove(p.id)} style={{ background: C.redBg, border: `1px solid ${C.red}`, color: C.red, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Remove</button>}
            </div>
          )}
        </div>
      ))}
      {players.length === 0 && <p style={{ color: C.muted }}>No players yet. Add them above.</p>}
    </div>
  );
}

function FBOpponentsScreen({ team, role }) {
  const [opponents, setOpponents] = useState([]);
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const load = () => supabase.from('opponents').select('*').eq('team_id', team.id).order('created_at').then(({ data }) => { if (data) setOpponents(data); });
  useEffect(() => { load(); }, [team.id]);

  const add = async () => {
    if (!newName.trim()) return;
    await supabase.from('opponents').insert({ team_id: team.id, name: newName.trim(), abbr: newAbbr.trim().toUpperCase() || null });
    setNewName(''); setNewAbbr(''); load();
  };
  const remove = async (id) => { await supabase.from('opponents').delete().eq('id', id); load(); };
  const updateField = async (id, field, value) => {
    setOpponents(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    await supabase.from('opponents').update({ [field]: value }).eq('id', id);
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="Team name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 8, background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <input placeholder="Abbr" value={newAbbr} onChange={e => setNewAbbr(e.target.value)} style={{ width: 70, padding: 8, background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <button onClick={add} style={{ padding: '8px 14px', background: C.gold, color: C.textDark, border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
        </div>
      )}
      {opponents.map(o => (
        <div key={o.id} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          {editingId === o.id ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={o.name || ''} onChange={e => updateField(o.id, 'name', e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
                <input value={o.abbr || ''} onChange={e => updateField(o.id, 'abbr', e.target.value.toUpperCase().slice(0,4))} style={{ width: 60, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, textAlign: 'center' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="color" value={o.primary_color || '#6b7280'} onChange={e => updateField(o.id, 'primary_color', e.target.value)} style={{ width: 26, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer' }} />
                  <span style={{ fontSize: 9, color: C.muted }}>Color</span>
                </label>
              </div>
              <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: o.primary_color || '#6b7280', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>{(o.abbr || o.name || '?').slice(0,1)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{o.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{o.abbr || '—'}</div>
              </div>
              {canEdit && <button onClick={() => setEditingId(o.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Edit</button>}
              {canEdit && <button onClick={() => remove(o.id)} style={{ background: C.redBg, border: `1px solid ${C.red}`, color: C.red, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Remove</button>}
            </div>
          )}
        </div>
      ))}
      {opponents.length === 0 && <p style={{ color: C.muted }}>No opponents yet.</p>}
    </div>
  );
}

function FBBoxScore({ team, game, players, onClose }) {
  const plays = game.meta?.plays || [];

  const playerRows = players.map(p => {
    const stats = game.player_stats?.[p.id] || {};
    const statDefs = getStatsForPosition(p.position || 'LB');
    const eff = calcFootballEff(stats, statDefs);
    const snaps = plays.filter(pl => pl.playerId === p.id).length;
    return { player: p, stats, eff, snaps, statDefs };
  }).filter(r => r.snaps > 0 || Object.values(r.stats).some(v => v > 0));

  playerRows.sort((a, b) => b.eff - a.eff);

  const groupedByPos = {};
  playerRows.forEach(r => {
    const pos = r.player.position || 'Other';
    if (!groupedByPos[pos]) groupedByPos[pos] = [];
    groupedByPos[pos].push(r);
  });

  const print = () => {
    const content = document.getElementById('fb-box-score-printable')?.innerHTML || '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Football Box Score</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:sans-serif;color:#1a1a1a;padding:20px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}th{background:#1a3a6b;color:#fff;padding:5px 4px;text-align:center;font-size:9px;}td{padding:4px;text-align:center;border-bottom:1px solid #dde;font-size:9px;}tr:nth-child(even){background:#f0f4fa;}@page{size:landscape;margin:8mm;}</style></head><body>${content}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', color: '#1a1a1a', zIndex: 200, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: 8, background: 'none', cursor: 'pointer' }}>Close</button>
        <button onClick={print} style={{ padding: '8px 14px', background: '#c8a84b', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>🖨 Print / PDF</button>
      </div>
      <div id="fb-box-score-printable">
        <div style={{ background: '#1a3a6b', color: '#fff', padding: '12px 16px', borderRadius: '8px 8px 0 0', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: '#c8a84b', letterSpacing: 1 }}>XOVR FOOTBALL · GAME GRADE REPORT</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>vs. {game.meta?.opponentName || 'OPP'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{game.meta?.date || ''} · {plays.length} plays</div>
        </div>
        <div style={{ height: 3, background: '#c8a84b', marginBottom: 16 }} />
        {playerRows.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No stats tagged yet.</div>}
        {Object.entries(groupedByPos).map(([pos, rows]) => (
          <div key={pos} style={{ marginBottom: 20 }}>
            <div style={{ background: '#1a3a6b', color: '#c8a84b', fontWeight: 900, fontSize: 11, padding: '4px 8px', marginBottom: 4, borderRadius: 4 }}>{pos}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ background: '#243d6b', color: '#fff' }}>
                    <th style={{ padding: '5px 6px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '5px 6px', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '5px 6px' }}>Snaps</th>
                    {rows[0].statDefs.map(d => <th key={d.key} style={{ padding: '5px 4px', color: d.value >= 0 ? '#4ade80' : '#f87171' }}>{d.abbr}</th>)}
                    <th style={{ padding: '5px 6px', color: '#c8a84b' }}>EFF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.player.id} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent', borderBottom: '1px solid #dde3ef' }}>
                      <td style={{ padding: '5px 6px', fontWeight: 700, color: '#1a3a6b' }}>{r.player.number || '—'}</td>
                      <td style={{ padding: '5px 6px', fontWeight: 600 }}>{r.player.name}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center' }}>{r.snaps}</td>
                      {r.statDefs.map(d => <td key={d.key} style={{ padding: '5px 4px', textAlign: 'center', fontWeight: (r.stats[d.key] || 0) > 0 ? 700 : 400, color: (r.stats[d.key] || 0) > 0 ? (d.value >= 0 ? '#16a34a' : '#dc2626') : '#999' }}>{r.stats[d.key] || 0}</td>)}
                      <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 900, color: r.eff >= 0 ? '#16a34a' : '#dc2626' }}>{r.eff >= 0 ? '+' : ''}{r.eff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {plays.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: '#1a3a6b', color: '#c8a84b', fontWeight: 900, fontSize: 11, padding: '4px 8px', marginBottom: 4, borderRadius: 4 }}>PLAY LOG</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <thead>
                <tr style={{ background: '#243d6b', color: '#fff' }}>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>Player</th>
                  <th style={{ padding: '4px 6px' }}>Pos</th>
                  <th style={{ padding: '4px 6px' }}>Down</th>
                  <th style={{ padding: '4px 6px' }}>Dist</th>
                  <th style={{ padding: '4px 6px' }}>Ball</th>
                  <th style={{ padding: '4px 6px' }}>Type</th>
                  <th style={{ padding: '4px 6px' }}>Stat</th>
                  <th style={{ padding: '4px 6px' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {plays.map((pl, i) => {
                  const statDef = getStatsForPosition(pl.playerPos).find(d => d.key === pl.statKey);
                  return (
                    <tr key={i} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent', borderBottom: '1px solid #dde' }}>
                      <td style={{ padding: '3px 6px', fontWeight: 700 }}>{pl.playerNumber}</td>
                      <td style={{ padding: '3px 6px' }}>{pl.playerName}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>{pl.playerPos}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>{pl.down}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>{pl.distance}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>{pl.fieldSide} {pl.yardLine}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>{pl.playType}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 700 }}>{pl.statKey}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 700, color: (statDef?.value || 0) >= 0 ? '#16a34a' : '#dc2626' }}>{(statDef?.value || 0) >= 0 ? '+' : ''}{statDef?.value || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 16, fontSize: 9, color: '#999', textAlign: 'center' }}>Generated by XOVR Football · {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
}

function FBGameTagger({ team, game, onSaved, onBack }) {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [plays, setPlays] = useState(game.meta?.plays || []);
  const [playerStats, setPlayerStats] = useState(game.player_stats || {});
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [playType, setPlayType] = useState('Run');
  const [fieldSide, setFieldSide] = useState('BWD');
  const [yardLine, setYardLine] = useState(20);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showBoxScore, setShowBoxScore] = useState(false);

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at').then(({ data }) => { if (data) setPlayers(data); });
  }, [team.id]);

  const selectedPlayerRecord = players.find(p => p.id === selectedPlayer);
  const statDefs = selectedPlayerRecord ? getStatsForPosition(selectedPlayerRecord.position || 'LB') : DEFENSE_STATS;

  const tagStat = (key, value) => {
    if (!selectedPlayer) return;
    const play = {
      playerId: selectedPlayer,
      playerName: selectedPlayerRecord?.name || '?',
      playerNumber: selectedPlayerRecord?.number || '?',
      playerPos: selectedPlayerRecord?.position || '?',
      statKey: key,
      statValue: value,
      down, distance, playType, fieldSide, yardLine,
      timestamp: new Date().toISOString(),
    };
    setPlays(prev => [...prev, play]);
    setPlayerStats(prev => {
      const cur = prev[selectedPlayer] || {};
      return { ...prev, [selectedPlayer]: { ...cur, [key]: (cur[key] || 0) + 1 } };
    });
    setSelectedPlayer(null);
  };

  const undoLast = () => {
    if (plays.length === 0) return;
    const last = plays[plays.length - 1];
    setPlays(prev => prev.slice(0, -1));
    setPlayerStats(prev => {
      const cur = prev[last.playerId] || {};
      return { ...prev, [last.playerId]: { ...cur, [last.statKey]: Math.max(0, (cur[last.statKey] || 0) - 1) } };
    });
  };

  const saveGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: playerStats,
      meta: { ...game.meta, plays },
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (error) alert('Save error: ' + error.message);
    else onSaved();
  };

  const endGame = async () => {
    const { error } = await supabase.from('games').update({
      player_stats: playerStats,
      meta: { ...game.meta, plays },
      is_final: true,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
    if (!error) { setConfirmingEnd(false); setShowBoxScore(true); }
    else alert('Save error: ' + error.message);
  };

  if (showBoxScore) return <FBBoxScore team={team} game={{ ...game, player_stats: playerStats, meta: { ...game.meta, plays } }} players={players} onClose={() => onSaved()} />;

  const lastPlay = plays[plays.length - 1];
  const PLAY_TYPES = ['Run', 'Pass', 'Punt', 'Kick', 'FG', 'PAT'];
  const oppAbbr = game.meta?.opponentName?.slice(0,3).toUpperCase() || 'OPP';

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ background: C.navy, borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>vs. {game.meta?.opponentName || 'OPP'}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{plays.length} plays tagged</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowBoxScore(true)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>📊 Box</button>
          <button onClick={saveGame} style={{ padding: '6px 10px', background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.gold}`, borderRadius: 7, color: C.gold, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>💾 Save</button>
          <button onClick={() => setConfirmingEnd(true)} style={{ padding: '6px 10px', background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 7, color: C.red, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🏁 End</button>
        </div>
      </div>

      {/* Down, Distance, Field Position, Play Type */}
      <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Play Info</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Down */}
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>DOWN</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4].map(d => (
                <button key={d} onClick={() => setDown(d)} style={{ width: 34, height: 34, borderRadius: 7, fontWeight: 900, fontSize: 14, cursor: 'pointer', background: down === d ? C.gold : C.navyDark, color: down === d ? C.textDark : C.text, border: `1px solid ${down === d ? C.gold : C.border}` }}>{d}</button>
              ))}
            </div>
          </div>
          {/* Distance */}
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>DISTANCE</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => setDistance(d => Math.max(1, d-1))} style={{ width: 30, height: 30, borderRadius: 7, background: C.navyDark, border: `1px solid ${C.border}`, color: C.text, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>−</button>
              <div style={{ width: 36, textAlign: 'center', fontSize: 17, fontWeight: 900, color: C.gold }}>{distance}</div>
              <button onClick={() => setDistance(d => d+1)} style={{ width: 30, height: 30, borderRadius: 7, background: C.navyDark, border: `1px solid ${C.border}`, color: C.text, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>+</button>
            </div>
          </div>
          {/* Field Side */}
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>SIDE</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setFieldSide('BWD')} style={{ padding: '6px 8px', borderRadius: 7, fontWeight: 700, fontSize: 10, cursor: 'pointer', background: fieldSide === 'BWD' ? C.gold : C.navyDark, color: fieldSide === 'BWD' ? C.textDark : C.text, border: `1px solid ${fieldSide === 'BWD' ? C.gold : C.border}` }}>BWD</button>
              <button onClick={() => setFieldSide(oppAbbr)} style={{ padding: '6px 8px', borderRadius: 7, fontWeight: 700, fontSize: 10, cursor: 'pointer', background: fieldSide === oppAbbr ? C.gold : C.navyDark, color: fieldSide === oppAbbr ? C.textDark : C.text, border: `1px solid ${fieldSide === oppAbbr ? C.gold : C.border}` }}>{oppAbbr}</button>
            </div>
          </div>
          {/* Yard Line */}
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>YARD LINE</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => setYardLine(y => Math.max(1, y-1))} style={{ width: 30, height: 30, borderRadius: 7, background: C.navyDark, border: `1px solid ${C.border}`, color: C.text, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>−</button>
              <div style={{ width: 36, textAlign: 'center', fontSize: 17, fontWeight: 900, color: C.gold }}>{yardLine}</div>
              <button onClick={() => setYardLine(y => Math.min(50, y+1))} style={{ width: 30, height: 30, borderRadius: 7, background: C.navyDark, border: `1px solid ${C.border}`, color: C.text, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>+</button>
            </div>
          </div>
          {/* Play Type */}
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>PLAY TYPE</div>
            <select value={playType} onChange={e => setPlayType(e.target.value)} style={{ padding: '7px 8px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12 }}>
              {PLAY_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
        </div>
        {/* Live play summary */}
        <div style={{ marginTop: 8, padding: '5px 8px', background: 'rgba(200,168,75,0.1)', borderRadius: 6, fontSize: 11, color: C.gold, fontWeight: 700 }}>
          {down}&{distance} · {fieldSide} {yardLine} · {playType}
        </div>
      </div>

      {/* Last play */}
      {lastPlay && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: C.text }}>
            <span style={{ fontWeight: 700 }}>#{lastPlay.playerNumber} {lastPlay.playerName}</span>
            <span style={{ color: C.muted, margin: '0 4px' }}>·</span>
            <span style={{ color: C.gold, fontWeight: 700 }}>{lastPlay.statKey}</span>
            <span style={{ color: C.muted, fontSize: 10, marginLeft: 4 }}>{lastPlay.down}&{lastPlay.distance} {lastPlay.fieldSide} {lastPlay.yardLine}</span>
          </div>
          <button onClick={undoLast} style={{ padding: '4px 8px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>↩ Undo</button>
        </div>
      )}

      {/* Player selector */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Select Player</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {players.map(p => {
            const sel = selectedPlayer === p.id;
            const pStats = playerStats[p.id] || {};
            const eff = getStatsForPosition(p.position || 'LB').reduce((s, d) => s + (pStats[d.key] || 0) * d.value, 0);
            return (
              <button key={p.id} onClick={() => setSelectedPlayer(sel ? null : p.id)}
                style={{ padding: '6px 8px', borderRadius: 7, border: sel ? `2px solid ${C.gold}` : `1px solid ${C.border}`, background: sel ? C.goldLight : C.navyMid, color: sel ? C.gold : C.text, cursor: 'pointer', textAlign: 'center', minWidth: 58 }}>
                <div style={{ fontSize: 10, fontWeight: 900 }}>#{p.number || '—'}</div>
                <div style={{ fontSize: 9, color: sel ? C.gold : C.muted }}>{p.position || '?'}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: eff >= 0 ? C.green : C.red }}>{eff >= 0 ? '+' : ''}{eff}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat buttons */}
      {selectedPlayer && (
        <div>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            #{selectedPlayerRecord?.number} {selectedPlayerRecord?.name} · {selectedPlayerRecord?.position}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {statDefs.map(def => {
              const count = (playerStats[selectedPlayer] || {})[def.key] || 0;
              const isPos = def.value >= 0;
              return (
                <button key={def.key} onClick={() => tagStat(def.key, def.value)}
                  style={{ padding: '10px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: isPos ? C.statPosBg : C.statNegBg, border: `2px solid ${isPos ? C.statPosBorder : C.statNegBorder}`, color: isPos ? C.statPosText : C.statNegText, fontWeight: 700 }}>
                  <div style={{ fontSize: 9 }}>{def.abbr}</div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{count}</div>
                  <div style={{ fontSize: 8, color: isPos ? C.green : C.red }}>{isPos ? '+' : ''}{def.value}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedPlayer && players.length > 0 && (
        <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: 13 }}>Select a player above to tag stats</div>
      )}

      {players.length === 0 && (
        <div style={{ textAlign: 'center', padding: 20, color: C.red, fontSize: 13, fontWeight: 700 }}>⚠️ No players on roster. Add players in the RSTR tab first.</div>
      )}

      <button onClick={onBack} style={{ marginTop: 16, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, cursor: 'pointer' }}>← Back to Games</button>

      {confirmingEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, width: 300 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: C.text }}>End this game?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>This marks the game as final and shows the box score.</div>
            <button onClick={endGame} style={{ width: '100%', padding: 10, background: C.red, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Yes, end game</button>
            <button onClick={() => setConfirmingEnd(false)} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: 'pointer' }}>Not yet</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FBGameScreen({ team, role }) {
  const [opponents, setOpponents] = useState([]);
  const [games, setGames] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [viewingGame, setViewingGame] = useState(null);
  const [oppId, setOppId] = useState('');
  const [date, setDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  useEffect(() => {
    supabase.from('opponents').select('*').eq('team_id', team.id).then(({ data }) => { if (data) setOpponents(data); });
    supabase.from('players').select('*').eq('team_id', team.id).then(({ data }) => { if (data) setPlayers(data); });
    const todayStr = new Date().toISOString().slice(0, 10);
    supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (!data || data.length === 0) return;
      const active = data.find(s => s.start_date <= todayStr && todayStr <= s.end_date);
      const season = active || data[0];
      setCurrentSeason(season);
      supabase.from('games').select('*, opponents(name)').eq('season_id', season.id).order('created_at', { ascending: false }).then(({ data: gData }) => { if (gData) setGames(gData); });
    });
  }, [team.id]);

  const loadGames = () => {
    if (!currentSeason) return;
    supabase.from('games').select('*, opponents(name)').eq('season_id', currentSeason.id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setGames(data); });
  };

  const startGame = async () => {
    if (!oppId || !currentSeason) {
      if (!currentSeason) alert('Create a season in the SZN tab first.');
      return;
    }
    const opp = opponents.find(o => o.id === oppId);
    const { data, error } = await supabase.from('games').insert({
      season_id: currentSeason.id,
      opponent_id: oppId,
      meta: { opponentName: opp?.name || 'OPP', date, plays: [] },
      player_stats: {},
    }).select().single();
    if (!error && data) setActiveGame(data);
    else if (error) alert('Error: ' + error.message);
  };

  const deleteGame = async (id) => {
    await supabase.from('games').delete().eq('id', id);
    setConfirmDeleteId(null);
    loadGames();
  };

  if (activeGame) return <FBGameTagger team={team} game={activeGame} onSaved={() => { setActiveGame(null); loadGames(); }} onBack={() => setActiveGame(null)} />;
  if (viewingGame) return <FBBoxScore team={team} game={viewingGame} players={players} onClose={() => setViewingGame(null)} />;

  const inputStyle = { padding: '8px 10px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13 };

  return (
    <div>
      {!currentSeason && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red, fontWeight: 700 }}>
          ⚠️ No season found. Create one in the SZN tab first.
        </div>
      )}
      {canEdit && currentSeason && (
        <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Start New Game · {currentSeason.name}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={oppId} onChange={e => setOppId(e.target.value)} style={inputStyle}>
              <option value="">Select opponent…</option>
              {opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            <button onClick={startGame} style={{ padding: '8px 18px', background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Start →</button>
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Game Log</div>
      {games.map(g => (
        <div key={g.id} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text }}>vs. {g.opponents?.name || g.meta?.opponentName || '—'}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{g.meta?.date || ''} · {(g.meta?.plays || []).length} plays · {g.is_final ? '✅ Final' : '🔴 Live'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!g.is_final ? (
              <button onClick={() => setActiveGame(g)} style={{ flex: 1, padding: 8, background: C.gold, border: 'none', color: C.textDark, borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Continue Tagging</button>
            ) : (
              <button onClick={() => setViewingGame(g)} style={{ flex: 1, padding: 8, background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📊 View Report</button>
            )}
            {confirmDeleteId === g.id ? (
              <>
                <button onClick={() => deleteGame(g.id)} style={{ padding: '8px 10px', background: C.red, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Confirm</button>
                <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </>
            ) : (
              canEdit && <button onClick={() => setConfirmDeleteId(g.id)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${C.border}`, color: C.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
            )}
          </div>
        </div>
      ))}
      {games.length === 0 && currentSeason && <p style={{ color: C.muted }}>No games yet. Start one above.</p>}
    </div>
  );
}

function FBSeasonsScreen({ team, role }) {
  const [seasons, setSeasons] = useState([]);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const canEdit = role === 'head_coach' || role === 'assistant';

  const load = () => supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at').then(({ data }) => { if (data) setSeasons(data); });
  useEffect(() => { load(); }, [team.id]);

  const add = async () => {
    if (!newName.trim() || !newStart || !newEnd) return;
    await supabase.from('seasons').insert({ team_id: team.id, name: newName.trim(), start_date: newStart, end_date: newEnd });
    setNewName(''); setNewStart(''); setNewEnd(''); load();
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <input placeholder='Season name e.g. "2025-26 Football"' value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
            <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          </div>
          <button onClick={add} style={{ padding: 8, background: C.gold, color: C.textDark, border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer' }}>+ Add Season</button>
        </div>
      )}
      {seasons.map(s => (
        <div key={s.id} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: C.text }}>{s.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{s.start_date} – {s.end_date}</div>
        </div>
      ))}
      {seasons.length === 0 && <p style={{ color: C.muted }}>No seasons yet.</p>}
    </div>
  );
}

export function FootballTeamView({ team, onBack }) {
  const [tab, setTab] = useState('game');
  const FB_LOGO = 'https://xqfykowofjswojwgdcmj.supabase.co/storage/v1/object/public/Assets/Untitled%20design.PNG';

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ padding: '7px 2px', fontWeight: tab === key ? 800 : 600, fontSize: 11, background: tab === key ? C.gold : 'rgba(255,255,255,0.08)', color: tab === key ? C.textDark : C.text, border: `1px solid ${tab === key ? C.gold : C.border}`, borderRadius: 7, cursor: 'pointer', textAlign: 'center' }}>{label}</button>
  );

  const tabs = [
    { key: 'game', label: 'GAME' },
    { key: 'roster', label: 'RSTR' },
    { key: 'opponents', label: 'OPNT' },
    { key: 'seasons', label: 'SZN' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.navyDark, color: C.text, fontFamily: 'sans-serif' }}>
      <div style={{ background: C.navy, borderBottom: `3px solid ${C.gold}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={FB_LOGO} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
        <div>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Briarwood Football</div>
          <h2 style={{ margin: 0, fontSize: 20, color: C.text }}>{team.name}</h2>
        </div>
        <button onClick={onBack} style={{ marginLeft: 'auto', padding: '8px 14px', background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, cursor: 'pointer' }}>Home</button>
      </div>
      <div style={{ padding: '16px 24px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4, marginBottom: 20 }}>
          {tabs.map(t => tabBtn(t.key, t.label))}
        </div>
        {tab === 'game' && <FBGameScreen team={team} role={team.role} />}
        {tab === 'roster' && <FBRosterScreen team={team} role={team.role} />}
        {tab === 'opponents' && <FBOpponentsScreen team={team} role={team.role} />}
        {tab === 'seasons' && <FBSeasonsScreen team={team} role={team.role} />}
      </div>
    </div>
  );
}
