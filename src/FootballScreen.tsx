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

const BWD_TEAM_STATS = [
  { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 6 },
  { key: 'PAT', label: 'Extra Point', abbr: 'PAT', value: 1 },
  { key: 'FGM', label: 'Field Goal', abbr: 'FGM', value: 3 },
  { key: 'Safety', label: 'Safety', abbr: 'SAF', value: 2 },
];

const OPP_TEAM_STATS = [
  { key: 'TD', label: 'Touchdown', abbr: 'TD', value: 6 },
  { key: 'PAT', label: 'Extra Point', abbr: 'PAT', value: 1 },
  { key: 'FGM', label: 'Field Goal', abbr: 'FGM', value: 3 },
  { key: 'Safety', label: 'Safety', abbr: 'SAF', value: 2 },
];

const POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS'];
const OFFENSE_POS = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSE_POS = ['DL', 'LB', 'DB'];
const SPECIAL_POS = ['K', 'P', 'LS'];
const ST_PLAY_TYPES = new Set(['Punt', 'Kick', 'FG', 'PAT']);
const BWD_TURNOVER_KEYS = new Set(['INT', 'FRFum', 'DefTD']);
const OPP_TURNOVER_KEYS = new Set(['Fum', 'INT']);

// -1 = own 1yd line, -20 = touchback, -49 = own 49, 50 = midfield, 49 = opp 49, 1 = opp goal line
function formatFieldPos(fp) {
  if (fp === null || fp === undefined) return 'BWD 20';
  if (fp === 50) return '50';
  if (fp < 0) return `BWD ${Math.abs(fp)}`;
  return `OPP ${fp}`;
}

// Field position options: -1 to -49, then 50, then 49 down to 1
const FIELD_POS_OPTIONS = [
  ...Array.from({length: 49}, (_, i) => -(i + 1)),  // -1, -2, ... -49
  50,                                                   // midfield
  ...Array.from({length: 49}, (_, i) => 49 - i),     // 49, 48, ... 1
];

// Gain/loss: -50 to +99 with 0 in middle
const GAIN_LOSS_OPTIONS = [
  ...Array.from({length: 50}, (_, i) => -(50 - i)),  // -50 to -1
  0,
  ...Array.from({length: 99}, (_, i) => i + 1),       // 1 to 99
];

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

function FootballScoreboard({ bwdScore, oppScore, oppAbbr, possession, quarter, down, distance, fieldPos, clockMin, clockSec, onClockClick, isFinal }) {
  const bwdHasBall = possession === 'BWD';
  const downSuffix = down === 1 ? 'ST' : down === 2 ? 'ND' : down === 3 ? 'RD' : 'TH';
  const fpColor = fieldPos === 50 ? '#e7b977' : fieldPos < 0 ? '#aaa' : '#f87171';
  return (
    <div style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', height: 54 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'linear-gradient(90deg, #1a3a6b 55%, #0a1628 100%)' }}>
          {bwdHasBall && !isFinal && <span style={{ fontSize: 15 }}>🏈</span>}
          <span style={{ fontSize: 15, fontWeight: 900, color: '#e7b977', letterSpacing: 1 }}>BWD</span>
          <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginLeft: 'auto', letterSpacing: -1 }}>{bwdScore}</span>
        </div>
        <div style={{ width: 2, background: '#000' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'linear-gradient(270deg, #3a3a3a 55%, #0a1628 100%)' }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>{oppScore}</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#ccc', letterSpacing: 1, marginLeft: 'auto' }}>{oppAbbr}</span>
          {!bwdHasBall && !isFinal && <span style={{ fontSize: 15 }}>🏈</span>}
        </div>
      </div>
      <div style={{ background: '#111', padding: '5px 12px', display: 'flex', alignItems: 'center' }}>
        {isFinal ? (
          <span style={{ fontSize: 12, fontWeight: 900, color: '#ff3b30', letterSpacing: 2, margin: '0 auto' }}>FINAL</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#e7b977', minWidth: 28 }}>Q{quarter}</span>
            <div style={{ width: 1, background: '#333', height: 16, margin: '0 8px' }} />
            <button onClick={onClockClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: '#ff3b30', letterSpacing: 1, textShadow: '0 0 6px rgba(255,59,48,0.7)' }}>
              {String(clockMin).padStart(2,'0')}:{String(clockSec).padStart(2,'0')}
            </button>
            <div style={{ width: 1, background: '#333', height: 16, margin: '0 8px' }} />
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{down}{downSuffix} & {distance}</span>
            <div style={{ width: 1, background: '#333', height: 16, margin: '0 8px' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: fpColor }}>{formatFieldPos(fieldPos)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ClockModal({ clockMin, clockSec, quarter, onSave, onClose }) {
  const [min, setMin] = useState(clockMin);
  const [sec, setSec] = useState(clockSec);
  const [q, setQ] = useState(quarter);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, width: 280 }}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: 14 }}>Set Clock</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <input type="number" value={min} min={0} max={99} onChange={e => setMin(Math.max(0,parseInt(e.target.value)||0))}
            style={{ width: 64, padding: 10, fontSize: 20, textAlign: 'center', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
          <span style={{ fontSize: 20, color: C.text }}>:</span>
          <input type="number" value={sec} min={0} max={59} onChange={e => setSec(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))}
            style={{ width: 64, padding: 10, fontSize: 20, textAlign: 'center', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>QUARTER</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[1,2,3,4].map(n => (
            <button key={n} onClick={() => setQ(n)} style={{ flex: 1, padding: 8, borderRadius: 7, fontWeight: 900, background: q===n?C.gold:C.navyDark, color: q===n?C.textDark:C.text, border: `1px solid ${q===n?C.gold:C.border}`, cursor: 'pointer' }}>{n}</button>
          ))}
        </div>
        <button onClick={() => onSave(min,sec,q)} style={{ width: '100%', padding: 10, background: C.gold, border: 'none', borderRadius: 8, color: C.textDark, fontWeight: 800, cursor: 'pointer', marginBottom: 8 }}>Set Clock</button>
        <button onClick={onClose} style={{ width: '100%', padding: 10, background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function LineupPicker({ players, unit, existingLineup, onConfirm }) {
  const isOffense = unit === 'offense';
  const eligible = players.filter(p => isOffense ? OFFENSE_POS.includes(p.position||'') : DEFENSE_POS.includes(p.position||''));
  const [selected, setSelected] = useState(existingLineup || []);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 11 ? [...prev, id] : prev);
  const posOrder = isOffense ? ['OL','QB','RB','WR','TE'] : ['DL','LB','DB'];
  const groups = {};
  eligible.forEach(p => { const pos = p.position||'Other'; if (!groups[pos]) groups[pos]=[]; groups[pos].push(p); });

  return (
    <div style={{ color: C.text }}>
      <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.gold, marginBottom: 4 }}>
          {isOffense ? '⚔️ Offensive Lineup' : '🛡️ Defensive Lineup'}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>{selected.length}/11 selected · tap to toggle</div>
        {posOrder.map(pos => {
          const grp = groups[pos] || [];
          if (grp.length === 0) return null;
          return (
            <div key={pos} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{pos}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {grp.map(p => {
                  const sel = selected.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggle(p.id)}
                      style={{ padding: '7px 11px', borderRadius: 7, border: sel?`2px solid ${C.gold}`:`1px solid ${C.border}`, background: sel?C.goldLight:C.navyDark, color: sel?C.gold:C.text, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      #{p.number||'—'} {p.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {eligible.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>
            No {isOffense ? 'offensive' : 'defensive'} players on roster yet.
          </div>
        )}
      </div>
      <button onClick={() => onConfirm(selected)}
        style={{ width: '100%', padding: 12, background: C.gold, border: 'none', borderRadius: 8, color: C.textDark, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
        {selected.length > 0 ? `Confirm ${isOffense?'Offense':'Defense'} (${selected.length}) →` : `Skip — Set ${isOffense?'Offense':'Defense'} Later`}
      </button>
    </div>
  );
}

function SubModal({ players, currentLineup, unit, onConfirm, onClose }) {
  const isOffense = unit === 'offense';
  const eligible = players.filter(p => isOffense ? OFFENSE_POS.includes(p.position||'') : DEFENSE_POS.includes(p.position||''));
  const [lineup, setLineup] = useState([...currentLineup]);
  const toggle = (id) => setLineup(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 11 ? [...prev, id] : prev);
  const posOrder = isOffense ? ['OL','QB','RB','WR','TE'] : ['DL','LB','DB'];
  const groups = {};
  eligible.forEach(p => { const pos = p.position||'Other'; if (!groups[pos]) groups[pos]=[]; groups[pos].push(p); });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.navyMid, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Cancel</button>
        <div style={{ color: C.gold, fontWeight: 800, fontSize: 13 }}>{isOffense?'⚔️ OFF':'🛡️ DEF'} Lineup · {lineup.length}/11</div>
        <button onClick={() => onConfirm(lineup)} style={{ padding: '6px 14px', background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Done</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {posOrder.map(pos => {
          const grp = groups[pos] || [];
          if (grp.length === 0) return null;
          return (
            <div key={pos} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{pos}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {grp.map(p => {
                  const inLineup = lineup.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggle(p.id)}
                      style={{ padding: '8px 12px', borderRadius: 7, border: inLineup?`2px solid ${C.gold}`:`1px solid ${C.border}`, background: inLineup?C.goldLight:C.navyDark, color: inLineup?C.gold:C.text, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      #{p.number||'—'} {p.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FBRosterScreen({ team, role }) {
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('QB');
  const [editingId, setEditingId] = useState(null);
  const canEdit = role === 'head_coach' || role === 'assistant';

  const load = () => supabase.from('players').select('*').eq('team_id', team.id).order('created_at').then(({ data }) => { if (data) setPlayers(data); });
  useEffect(() => { load(); }, [team.id]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('players').insert({ team_id: team.id, name: newName.trim(), number: newNumber.trim()||null, position: newPos });
    if (error) { alert('Error: '+error.message); return; }
    setNewName(''); setNewNumber(''); setNewPos('QB'); load();
  };
  const remove = async (id) => { await supabase.from('players').delete().eq('id', id); load(); };
  const updateField = async (id, field, value) => {
    setPlayers(prev => prev.map(p => p.id===id ? { ...p, [field]: value } : p));
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
                <input value={p.number||''} onChange={e => updateField(p.id,'number',e.target.value)} placeholder="#" style={{ width: 56, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, textAlign: 'center' }} />
                <input value={p.name||''} onChange={e => updateField(p.id,'name',e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
                <select value={p.position||'QB'} onChange={e => updateField(p.id,'position',e.target.value)} style={{ padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }}>
                  {POSITION_GROUPS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
              <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: C.navy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: C.gold, border: `1px solid ${C.border}` }}>{p.number||'—'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{p.position||'—'}</div>
              </div>
              {canEdit && <button onClick={() => setEditingId(p.id)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Edit</button>}
              {canEdit && <button onClick={() => remove(p.id)} style={{ background: C.redBg, border: `1px solid ${C.red}`, color: C.red, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Remove</button>}
            </div>
          )}
        </div>
      ))}
      {players.length === 0 && <p style={{ color: C.muted }}>No players yet.</p>}
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
    await supabase.from('opponents').insert({ team_id: team.id, name: newName.trim(), abbr: newAbbr.trim().toUpperCase()||null });
    setNewName(''); setNewAbbr(''); load();
  };
  const remove = async (id) => { await supabase.from('opponents').delete().eq('id', id); load(); };
  const updateField = async (id, field, value) => {
    setOpponents(prev => prev.map(o => o.id===id ? { ...o, [field]: value } : o));
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
                <input value={o.name||''} onChange={e => updateField(o.id,'name',e.target.value)} style={{ flex: 1, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
                <input value={o.abbr||''} onChange={e => updateField(o.id,'abbr',e.target.value.toUpperCase().slice(0,4))} style={{ width: 60, padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, textAlign: 'center' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="color" value={o.primary_color||'#6b7280'} onChange={e => updateField(o.id,'primary_color',e.target.value)} style={{ width: 26, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer' }} />
                  <span style={{ fontSize: 9, color: C.muted }}>Color</span>
                </label>
              </div>
              <button onClick={() => setEditingId(null)} style={{ width: '100%', padding: 8, background: C.gold, border: 'none', borderRadius: 7, color: C.textDark, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: o.primary_color||'#6b7280', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>{(o.abbr||o.name||'?').slice(0,1)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{o.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{o.abbr||'—'}</div>
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
  const snaps = game.meta?.snaps || [];
  const oppAbbr = game.meta?.opponentAbbr || (game.meta?.opponentName||'OPP').slice(0,3).toUpperCase();

  const playerRows = players.map(p => {
    const stats = game.player_stats?.[p.id] || {};
    const statDefs = getStatsForPosition(p.position||'LB');
    const eff = calcFootballEff(stats, statDefs);
    const snapCount = snaps.filter(s => s.tags?.some(t => t.playerId === p.id)).length;
    return { player: p, stats, eff, snapCount, statDefs };
  }).filter(r => r.snapCount > 0 || Object.values(r.stats).some(v => v > 0));
  playerRows.sort((a,b) => b.eff - a.eff);

  const groupedByPos = {};
  playerRows.forEach(r => { const pos = r.player.position||'Other'; if (!groupedByPos[pos]) groupedByPos[pos]=[]; groupedByPos[pos].push(r); });

  const print = () => {
    const content = document.getElementById('fb-box-score-printable')?.innerHTML || '';
    const win = window.open('','_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Football Box Score</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:sans-serif;color:#1a1a1a;padding:20px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}th{background:#1a3a6b;color:#fff;padding:5px 4px;text-align:center;font-size:9px;}td{padding:4px;text-align:center;border-bottom:1px solid #dde;font-size:9px;}tr:nth-child(even){background:#f0f4fa;}@page{size:landscape;margin:8mm;}</style></head><body>${content}</body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>{ win.print(); win.close(); },500);
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
          <div style={{ fontSize: 18, fontWeight: 900 }}>vs. {game.meta?.opponentName||'OPP'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{game.meta?.date||''} · {snaps.length} plays · BWD {game.meta?.bwdScore||0} – {game.meta?.oppScore||0} {oppAbbr}</div>
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
                    {rows[0].statDefs.map(d => <th key={d.key} style={{ padding: '5px 4px', color: d.value>=0?'#4ade80':'#f87171' }}>{d.abbr}</th>)}
                    <th style={{ padding: '5px 6px', color: '#c8a84b' }}>EFF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i) => (
                    <tr key={r.player.id} style={{ background: i%2===1?'#f0f4fa':'transparent', borderBottom: '1px solid #dde3ef' }}>
                      <td style={{ padding: '5px 6px', fontWeight: 700, color: '#1a3a6b' }}>{r.player.number||'—'}</td>
                      <td style={{ padding: '5px 6px', fontWeight: 600 }}>{r.player.name}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center' }}>{r.snapCount}</td>
                      {r.statDefs.map(d => <td key={d.key} style={{ padding: '5px 4px', textAlign: 'center', fontWeight: (r.stats[d.key]||0)>0?700:400, color: (r.stats[d.key]||0)>0?(d.value>=0?'#16a34a':'#dc2626'):'#999' }}>{r.stats[d.key]||0}</td>)}
                      <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 900, color: r.eff>=0?'#16a34a':'#dc2626' }}>{r.eff>=0?'+':''}{r.eff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {snaps.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: '#1a3a6b', color: '#c8a84b', fontWeight: 900, fontSize: 11, padding: '4px 8px', marginBottom: 4, borderRadius: 4 }}>PLAY LOG</div>
            {snaps.map((snap,si) => (
              <div key={si} style={{ marginBottom: 10, borderLeft: '3px solid #1a3a6b', paddingLeft: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 10, color: '#1a3a6b', marginBottom: 3 }}>
                  Play {si+1} · {snap.possession==='BWD'?'BWD OFF':'OPP OFF'} · {snap.down}&{snap.distance} · {formatFieldPos(snap.fieldPos)} · {snap.hash||'M'} Hash · {snap.playDirection||'—'} · {snap.playType} · {snap.gainLoss>0?'+':''}{snap.gainLoss||0} yds · Q{snap.quarter} {String(snap.clockMin||0).padStart(2,'0')}:{String(snap.clockSec||0).padStart(2,'0')}
                </div>
                {(snap.tags||[]).map((t,ti) => {
                  const statDef = t.teamTag ? { value: t.statValue||0 } : getStatsForPosition(t.playerPos).find(d => d.key===t.statKey);
                  return (
                    <div key={ti} style={{ fontSize: 9, color: (statDef?.value||0)>=0?'#16a34a':'#dc2626', paddingLeft: 8, marginBottom: 2 }}>
                      {t.teamTag?`[${t.teamTag}]`:`#${t.playerNumber} ${t.playerName} (${t.playerPos})`} — {t.statKey} {(statDef?.value||0)>=0?'+':''}{statDef?.value||0}
                    </div>
                  );
                })}
              </div>
            ))}
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
  const [snaps, setSnaps] = useState(game.meta?.snaps || []);
  const [currentTags, setCurrentTags] = useState([]);
  const [playerStats, setPlayerStats] = useState(game.player_stats || {});
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [playType, setPlayType] = useState('Run');
  const [fieldPos, setFieldPos] = useState(game.meta?.fieldPos ?? -20);
  const [hash, setHash] = useState('M');
  const [playDirection, setPlayDirection] = useState('Middle');
  const [gainLoss, setGainLoss] = useState(0);
  const [possession, setPossession] = useState(game.meta?.possession || 'BWD');
  const [quarter, setQuarter] = useState(game.meta?.quarter || 1);
  const [clockMin, setClockMin] = useState(game.meta?.clockMin ?? 12);
  const [clockSec, setClockSec] = useState(game.meta?.clockSec ?? 0);
  const [showClock, setShowClock] = useState(false);
  const [bwdScore, setBwdScore] = useState(game.meta?.bwdScore || 0);
  const [oppScore, setOppScore] = useState(game.meta?.oppScore || 0);
  const [offenseLineup, setOffenseLineup] = useState(game.meta?.offenseLineup || null);
  const [defenseLineup, setDefenseLineup] = useState(game.meta?.defenseLineup || null);
  const [lineupStep, setLineupStep] = useState(null);
  const [showSubs, setShowSubs] = useState(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [expandedSnap, setExpandedSnap] = useState(null);

  const oppName = game.meta?.opponentName || 'OPP';
  const oppAbbr = game.meta?.opponentAbbr || oppName.slice(0,3).toUpperCase();

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data }) => { if (data) setPlayers(data); });
  }, [team.id]);

  useEffect(() => {
    if (players.length > 0 && offenseLineup === null && defenseLineup === null && lineupStep === null) {
      setLineupStep('offense');
    }
  }, [players.length, lineupStep]);

  const offenseOnField = players.filter(p => (offenseLineup||[]).includes(p.id));
  const defenseOnField = players.filter(p => (defenseLineup||[]).includes(p.id));

  const selectedPlayerRecord = players.find(p => p.id === selectedPlayer);
  const isTeamTag = selectedPlayer === 'BWD' || selectedPlayer === 'OPP';
  const bwdTeamStatDefs = possession === 'BWD' ? BWD_TEAM_STATS : DEFENSE_STATS;
  const oppTeamStatDefs = possession === 'BWD' ? DEFENSE_STATS : OPP_TEAM_STATS;
  const teamStatDefs = selectedPlayer === 'BWD' ? bwdTeamStatDefs : oppTeamStatDefs;
  const statDefs = isTeamTag ? teamStatDefs : (selectedPlayerRecord ? getStatsForPosition(selectedPlayerRecord.position||'LB') : DEFENSE_STATS);

  const applyScore = (key, forBWD) => {
    if (key==='TD'||key==='DefTD'||key==='RetTD') { if (forBWD) setBwdScore(s=>s+6); else setOppScore(s=>s+6); }
    if (key==='PAT') { if (forBWD) setBwdScore(s=>s+1); else setOppScore(s=>s+1); }
    if (key==='FGM') { if (forBWD) setBwdScore(s=>s+3); else setOppScore(s=>s+3); }
    if (key==='Safety') { if (forBWD) setBwdScore(s=>s+2); else setOppScore(s=>s+2); }
  };

  const tagStat = (key, value) => {
    if (!selectedPlayer) return;
    if (isTeamTag) {
      const forBWD = selectedPlayer === 'BWD';
      setCurrentTags(prev => [...prev, { teamTag: selectedPlayer, statKey: key, statValue: value }]);
      applyScore(key, forBWD);
      setSelectedPlayer(null);
      return;
    }
    const tag = {
      playerId: selectedPlayer,
      playerName: selectedPlayerRecord?.name||'?',
      playerNumber: selectedPlayerRecord?.number||'?',
      playerPos: selectedPlayerRecord?.position||'?',
      statKey: key, statValue: value,
    };
    setCurrentTags(prev => [...prev, tag]);
    setPlayerStats(prev => {
      const cur = prev[selectedPlayer]||{};
      return { ...prev, [selectedPlayer]: { ...cur, [key]: (cur[key]||0)+1 } };
    });
    applyScore(key, possession === 'BWD');
    const playerPos = selectedPlayerRecord?.position||'';
    if (DEFENSE_POS.includes(playerPos) && BWD_TURNOVER_KEYS.has(key)) { setPossession('BWD'); setDown(1); setDistance(10); }
    else if (OFFENSE_POS.includes(playerPos) && OPP_TURNOVER_KEYS.has(key)) { setPossession('OPP'); setDown(1); setDistance(10); }
    setSelectedPlayer(null);
  };

  const undoLastTag = () => {
    if (currentTags.length===0) return;
    const last = currentTags[currentTags.length-1];
    setCurrentTags(prev => prev.slice(0,-1));
    if (!last.teamTag && last.playerId) {
      setPlayerStats(prev => {
        const cur = prev[last.playerId]||{};
        return { ...prev, [last.playerId]: { ...cur, [last.statKey]: Math.max(0,(cur[last.statKey]||0)-1) } };
      });
    }
  };

  const commitSnap = () => {
    if (currentTags.length===0) return;
    const snap = {
      snapNumber: snaps.length+1,
      down, distance, playType, fieldPos,
      hash, playDirection, gainLoss,
      possession, quarter, clockMin, clockSec, oppAbbr,
      tags: currentTags,
      timestamp: new Date().toISOString(),
    };
    setSnaps(prev => [...prev, snap]);
    setCurrentTags([]);
    setSelectedPlayer(null);
  };

  const undoLastSnap = () => {
    if (snaps.length===0) return;
    const lastSnap = snaps[snaps.length-1];
    setPlayerStats(prev => {
      const next = { ...prev };
      (lastSnap.tags||[]).forEach(t => {
        if (!t.teamTag && t.playerId) {
          const cur = next[t.playerId]||{};
          next[t.playerId] = { ...cur, [t.statKey]: Math.max(0,(cur[t.statKey]||0)-1) };
        }
      });
      return next;
    });
    setSnaps(prev => prev.slice(0,-1));
  };

  const getMeta = () => ({ ...game.meta, snaps, possession, quarter, clockMin, clockSec, bwdScore, oppScore, offenseLineup, defenseLineup, fieldPos });

  const saveGame = async () => {
    const { error } = await supabase.from('games').update({ player_stats: playerStats, meta: getMeta(), updated_at: new Date().toISOString() }).eq('id', game.id);
    if (error) alert('Save error: '+error.message); else onSaved();
  };

  const endGame = async () => {
    const { error } = await supabase.from('games').update({ player_stats: playerStats, meta: getMeta(), is_final: true, updated_at: new Date().toISOString() }).eq('id', game.id);
    if (!error) { setConfirmingEnd(false); setShowBoxScore(true); }
    else alert('Save error: '+error.message);
  };

  if (showBoxScore) return <FBBoxScore team={team} game={{ ...game, player_stats: playerStats, meta: getMeta() }} players={players} onClose={() => onSaved()} />;

  if (lineupStep === 'offense') return (
    <div style={{ color: C.text }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Step 1 of 2 — Pick your starting offensive 11</div>
      <LineupPicker key="offense" players={players} unit="offense" existingLineup={offenseLineup||[]}
        onConfirm={(ids) => { setOffenseLineup(ids); setTimeout(() => setLineupStep('defense'), 0); }} />
    </div>
  );

  if (lineupStep === 'defense') return (
    <div style={{ color: C.text }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Step 2 of 2 — Pick your starting defensive 11</div>
      <LineupPicker key="defense" players={players} unit="defense" existingLineup={defenseLineup||[]}
        onConfirm={(ids) => { setDefenseLineup(ids); setTimeout(() => setLineupStep(null), 0); }} />
    </div>
  );

  if (showSubs) return (
    <SubModal players={players} currentLineup={showSubs==='offense'?(offenseLineup||[]):(defenseLineup||[])} unit={showSubs}
      onConfirm={(ids) => { if (showSubs==='offense') setOffenseLineup(ids); else setDefenseLineup(ids); setShowSubs(null); }}
      onClose={() => setShowSubs(null)} />
  );

  const PLAY_TYPES = ['Run','Pass','Punt','Kick','FG','PAT'];
  const distOptions = Array.from({length:75},(_,i)=>i+1);

  return (
    <div style={{ color: C.text }}>
      <FootballScoreboard
        bwdScore={bwdScore} oppScore={oppScore} oppAbbr={oppAbbr}
        possession={possession} quarter={quarter}
        down={down} distance={distance} fieldPos={fieldPos}
        clockMin={clockMin} clockSec={clockSec}
        onClockClick={() => setShowClock(true)}
        isFinal={false}
      />

      {showClock && <ClockModal clockMin={clockMin} clockSec={clockSec} quarter={quarter}
        onSave={(m,s,q) => { setClockMin(m); setClockSec(s); setQuarter(q); setShowClock(false); }}
        onClose={() => setShowClock(false)} />}

      {/* Play counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>▶ PLAY</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: -1 }}>{snaps.length+1}</span>
        {currentTags.length > 0 && <span style={{ fontSize: 10, color: C.green, fontWeight: 700, marginLeft: 4 }}>● {currentTags.length} tag{currentTags.length!==1?'s':''} in progress</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>{snaps.length} completed</span>
      </div>

      {/* Possession flip + actions */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => { setPossession(p => p==='BWD'?'OPP':'BWD'); setDown(1); setDistance(10); }}
          style={{ flex: 1, padding: '7px 0', background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.gold}`, borderRadius: 7, color: C.gold, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
          🏈 Flip
        </button>
        <button onClick={() => setShowBoxScore(true)} style={{ flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>📊 Box</button>
        <button onClick={saveGame} style={{ flex: 1, padding: '7px 0', background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.gold}`, borderRadius: 7, color: C.gold, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>💾 Save</button>
        <button onClick={() => setConfirmingEnd(true)} style={{ flex: 1, padding: '7px 0', background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 7, color: C.red, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🏁 End</button>
      </div>

      {/* Play setup */}
      <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Down */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Down</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3,4].map(d => (
                <button key={d} onClick={() => setDown(d)} style={{ width: 30, height: 30, borderRadius: 6, fontWeight: 900, fontSize: 13, cursor: 'pointer', background: down===d?C.gold:C.navyDark, color: down===d?C.textDark:C.text, border: `1px solid ${down===d?C.gold:C.border}` }}>{d}</button>
              ))}
            </div>
          </div>
          {/* Distance */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Dist</div>
            <select value={distance} onChange={e => setDistance(Number(e.target.value))}
              style={{ padding: '5px 4px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 6, color: C.gold, fontSize: 13, fontWeight: 900, width: 56 }}>
              {distOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {/* Field position */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Field Pos</div>
            <select value={fieldPos} onChange={e => setFieldPos(Number(e.target.value))}
              style={{ padding: '5px 4px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontWeight: 900, width: 72,
                color: fieldPos === 50 ? C.gold : fieldPos < 0 ? C.muted : C.statPosText }}>
              {/* Own side: -1 to -49 */}
              {Array.from({length:49},(_,i)=>-(i+1)).map(n => (
                <option key={`own${n}`} value={n}>{n}</option>
              ))}
              {/* Midfield */}
              <option value={50}>50</option>
              {/* Opp side: 49 down to 1 */}
              {Array.from({length:49},(_,i)=>49-i).map(n => (
                <option key={`opp${n}`} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {/* Hash */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Hash</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['L','M','R'].map(h => (
                <button key={h} onClick={() => setHash(h)} style={{ width: 26, height: 28, borderRadius: 6, fontWeight: 900, fontSize: 11, cursor: 'pointer', background: hash===h?C.gold:C.navyDark, color: hash===h?C.textDark:C.text, border: `1px solid ${hash===h?C.gold:C.border}` }}>{h}</button>
              ))}
            </div>
          </div>
          {/* Direction */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Dir</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['←','↑','→'].map((arrow,i) => {
                const dir = ['Left','Middle','Right'][i];
                return (
                  <button key={dir} onClick={() => setPlayDirection(dir)} style={{ width: 26, height: 28, borderRadius: 6, fontWeight: 900, fontSize: 13, cursor: 'pointer', background: playDirection===dir?C.gold:C.navyDark, color: playDirection===dir?C.textDark:C.text, border: `1px solid ${playDirection===dir?C.gold:C.border}` }}>{arrow}</button>
                );
              })}
            </div>
          </div>
          {/* Play type */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Type</div>
            <select value={playType} onChange={e => setPlayType(e.target.value)}
              style={{ padding: '5px 4px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 11, width: 58 }}>
              {PLAY_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          {/* Gain/Loss */}
          <div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Gain/Loss</div>
            <select value={gainLoss} onChange={e => setGainLoss(Number(e.target.value))}
              style={{ padding: '5px 4px', background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 6, color: gainLoss>0?C.statPosText:gainLoss<0?C.statNegText:C.muted, fontSize: 12, fontWeight: 900, width: 66 }}>
              {GAIN_LOSS_OPTIONS.map(n => (
                <option key={n} value={n}>{n>0?'+'+n:n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub buttons */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        <button onClick={() => setShowSubs('offense')} style={{ flex: 1, padding: '6px 0', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>⚔️ OFF Sub</button>
        <button onClick={() => setShowSubs('defense')} style={{ flex: 1, padding: '6px 0', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>🛡️ DEF Sub</button>
        <button onClick={() => { setOffenseLineup(null); setDefenseLineup(null); setTimeout(() => setLineupStep('offense'), 0); }}
          style={{ flex: 1, padding: '6px 0', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>↺ Reset</button>
      </div>

      {/* Current snap tags */}
      {currentTags.length > 0 && (
        <div style={{ background: 'rgba(200,168,75,0.06)', border: `1px solid ${C.gold}`, borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700 }}>Play {snaps.length+1} · {currentTags.length} tag{currentTags.length!==1?'s':''}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={undoLastTag} style={{ padding: '3px 8px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.gold, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>↩ Undo Tag</button>
              <button onClick={commitSnap} style={{ padding: '3px 10px', background: C.gold, border: 'none', borderRadius: 6, color: C.textDark, fontSize: 10, cursor: 'pointer', fontWeight: 800 }}>Next Play →</button>
            </div>
          </div>
          {currentTags.map((t,i) => {
            const def = t.teamTag ? { value: t.statValue||0 } : getStatsForPosition(t.playerPos).find(d => d.key===t.statKey);
            const isPos = (def?.value||0) >= 0;
            return (
              <div key={i} style={{ fontSize: 10, color: isPos?C.statPosText:C.statNegText, paddingLeft: 4, marginBottom: 2 }}>
                {t.teamTag?`[${t.teamTag}]`:`#${t.playerNumber} ${t.playerName} (${t.playerPos})`} — {t.statKey} <span style={{ fontWeight: 900 }}>{isPos?'+':''}{def?.value||0}</span>
              </div>
            );
          })}
        </div>
      )}

      {currentTags.length === 0 && snaps.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={undoLastSnap} style={{ padding: '4px 10px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>↩ Undo Last Play</button>
        </div>
      )}

      {/* Offense players */}
      {offenseOnField.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>⚔️ Offense</div>
          {['OL','QB','RB','WR','TE'].map(pos => {
            const grp = offenseOnField.filter(p => p.position===pos);
            if (grp.length===0) return null;
            return (
              <div key={pos} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{pos}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {grp.map(p => {
                    const sel = selectedPlayer===p.id;
                    const tagged = currentTags.some(t => t.playerId===p.id);
                    const pStats = playerStats[p.id]||{};
                    const eff = getStatsForPosition(p.position||'OL').reduce((s,d)=>s+(pStats[d.key]||0)*d.value,0);
                    return (
                      <button key={p.id} onClick={() => setSelectedPlayer(sel?null:p.id)}
                        style={{ padding: '5px 7px', borderRadius: 7, border: sel?`2px solid ${C.gold}`:tagged?`2px solid ${C.green}`:`1px solid ${C.border}`, background: sel?C.goldLight:tagged?'rgba(34,197,94,0.1)':C.navyMid, color: sel?C.gold:C.text, cursor: 'pointer', textAlign: 'center', minWidth: 50 }}>
                        <div style={{ fontSize: 11, fontWeight: 900 }}>#{p.number||'—'}</div>
                        <div style={{ fontSize: 8, color: sel?C.gold:C.muted }}>{p.name.split(' ')[0].slice(0,6)}</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: eff>=0?C.green:C.red }}>{eff>=0?'+':''}{eff}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Defense players */}
      {defenseOnField.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>🛡️ Defense</div>
          {['DL','LB','DB'].map(pos => {
            const grp = defenseOnField.filter(p => p.position===pos);
            if (grp.length===0) return null;
            return (
              <div key={pos} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{pos}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {grp.map(p => {
                    const sel = selectedPlayer===p.id;
                    const tagged = currentTags.some(t => t.playerId===p.id);
                    const pStats = playerStats[p.id]||{};
                    const eff = getStatsForPosition(p.position||'LB').reduce((s,d)=>s+(pStats[d.key]||0)*d.value,0);
                    return (
                      <button key={p.id} onClick={() => setSelectedPlayer(sel?null:p.id)}
                        style={{ padding: '5px 7px', borderRadius: 7, border: sel?`2px solid ${C.gold}`:tagged?`2px solid ${C.green}`:`1px solid ${C.border}`, background: sel?C.goldLight:tagged?'rgba(34,197,94,0.1)':C.navyMid, color: sel?C.gold:C.text, cursor: 'pointer', textAlign: 'center', minWidth: 50 }}>
                        <div style={{ fontSize: 11, fontWeight: 900 }}>#{p.number||'—'}</div>
                        <div style={{ fontSize: 8, color: sel?C.gold:C.muted }}>{p.name.split(' ')[0].slice(0,6)}</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: eff>=0?C.green:C.red }}>{eff>=0?'+':''}{eff}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team tag buttons */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        <button onClick={() => setSelectedPlayer(selectedPlayer==='BWD'?null:'BWD')}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, fontWeight: 800, fontSize: 11, cursor: 'pointer', border: selectedPlayer==='BWD'?`2px solid ${C.gold}`:`1px solid ${C.border}`, background: selectedPlayer==='BWD'?C.goldLight:C.navyMid, color: selectedPlayer==='BWD'?C.gold:C.text }}>
          🏈 BWD Team
        </button>
        <button onClick={() => setSelectedPlayer(selectedPlayer==='OPP'?null:'OPP')}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, fontWeight: 800, fontSize: 11, cursor: 'pointer', border: selectedPlayer==='OPP'?`2px solid ${C.red}`:`1px solid ${C.border}`, background: selectedPlayer==='OPP'?C.redBg:C.navyMid, color: selectedPlayer==='OPP'?C.red:C.text }}>
          🏈 {oppAbbr} Team
        </button>
      </div>

      {/* Stat buttons */}
      {selectedPlayer && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {isTeamTag ? (selectedPlayer==='BWD'?'BWD Team':oppAbbr+' Team') : `#${selectedPlayerRecord?.number} ${selectedPlayerRecord?.name} · ${selectedPlayerRecord?.position}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
            {statDefs.map(def => {
              const count = isTeamTag ? 0 : (playerStats[selectedPlayer]||{})[def.key]||0;
              const isPos = def.value >= 0;
              return (
                <button key={def.key} onClick={() => tagStat(def.key, def.value)}
                  style={{ padding: '8px 3px', borderRadius: 7, cursor: 'pointer', textAlign: 'center', background: isPos?C.statPosBg:C.statNegBg, border: `2px solid ${isPos?C.statPosBorder:C.statNegBorder}`, color: isPos?C.statPosText:C.statNegText, fontWeight: 700 }}>
                  <div style={{ fontSize: 8 }}>{def.abbr}</div>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>{count}</div>
                  <div style={{ fontSize: 7, color: isPos?C.green:C.red }}>{isPos?'+':''}{def.value}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedPlayer && (
        <div style={{ textAlign: 'center', padding: 10, color: C.muted, fontSize: 12 }}>
          {currentTags.length > 0 ? 'Tap another player · hit Next Play → when done' : 'Tap a player above or use BWD/OPP Team buttons'}
        </div>
      )}

      {/* Play log */}
      {snaps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Play Log · {snaps.length} plays</div>
          {[...snaps].reverse().map((snap,i) => {
            const snapIndex = snaps.length-1-i;
            const isExpanded = expandedSnap===snapIndex;
            return (
              <div key={snapIndex} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 5, overflow: 'hidden' }}>
                <button onClick={() => setExpandedSnap(isExpanded?null:snapIndex)}
                  style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: C.gold }}>P{snap.snapNumber}</span>
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>
                      {snap.possession==='BWD'?'⚔️':'🛡️'} {snap.down}&{snap.distance} · {formatFieldPos(snap.fieldPos)} · {snap.hash||'M'} · {snap.playDirection==='Left'?'←':snap.playDirection==='Right'?'→':'↑'} · {snap.playType} · {snap.gainLoss>0?'+':''}{snap.gainLoss||0}yds
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: C.muted, flexShrink: 0, marginLeft: 6 }}>{snap.tags?.length||0}t {isExpanded?'▲':'▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '2px 10px 8px' }}>
                    {(snap.tags||[]).map((t,ti) => {
                      const def = t.teamTag ? { value: t.statValue||0 } : getStatsForPosition(t.playerPos).find(d=>d.key===t.statKey);
                      const isPos = (def?.value||0)>=0;
                      return (
                        <div key={ti} style={{ fontSize: 10, color: isPos?C.statPosText:C.statNegText, paddingLeft: 4, marginBottom: 2 }}>
                          {t.teamTag?`[${t.teamTag}]`:`#${t.playerNumber} ${t.playerName} (${t.playerPos})`} — {t.statKey} <span style={{ fontWeight: 900 }}>{isPos?'+':''}{def?.value||0}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onBack} style={{ marginTop: 12, padding: '4px 10px', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, cursor: 'pointer' }}>← Back to Games</button>

      {confirmingEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, width: 300 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: C.text }}>End this game?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Marks as final and shows box score.</div>
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
    const todayStr = new Date().toISOString().slice(0,10);
    supabase.from('seasons').select('*').eq('team_id', team.id).order('created_at',{ascending:false}).then(({ data }) => {
      if (!data||data.length===0) return;
      const active = data.find(s => s.start_date<=todayStr && todayStr<=s.end_date);
      const season = active||data[0];
      setCurrentSeason(season);
      supabase.from('games').select('*, opponents(name)').eq('season_id',season.id).order('created_at',{ascending:false}).then(({ data: gData }) => { if (gData) setGames(gData); });
    });
  }, [team.id]);

  const loadGames = () => {
    if (!currentSeason) return;
    supabase.from('games').select('*, opponents(name)').eq('season_id',currentSeason.id).order('created_at',{ascending:false}).then(({ data }) => { if (data) setGames(data); });
  };

  const startGame = async () => {
    if (!oppId||!currentSeason) { if (!currentSeason) alert('Create a season in the SZN tab first.'); return; }
    const opp = opponents.find(o => o.id===oppId);
    const { data, error } = await supabase.from('games').insert({
      season_id: currentSeason.id, opponent_id: oppId,
      meta: {
        opponentName: opp?.name||'OPP',
        opponentAbbr: opp?.abbr||(opp?.name||'OPP').slice(0,3).toUpperCase(),
        date, snaps: [], possession: 'BWD', quarter: 1,
        clockMin: 12, clockSec: 0, bwdScore: 0, oppScore: 0, fieldPos: -20,
      },
      player_stats: {},
    }).select().single();
    if (!error&&data) setActiveGame(data); else if (error) alert('Error: '+error.message);
  };

  const deleteGame = async (id) => { await supabase.from('games').delete().eq('id',id); setConfirmDeleteId(null); loadGames(); };

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
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Start New Game · {currentSeason.name}</div>
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
      {games.map(g => {
        const bwd = g.meta?.bwdScore??0;
        const opp = g.meta?.oppScore??0;
        const gOppAbbr = g.meta?.opponentAbbr||(g.meta?.opponentName||'OPP').slice(0,3).toUpperCase();
        return (
          <div key={g.id} style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <FootballScoreboard
                bwdScore={bwd} oppScore={opp} oppAbbr={gOppAbbr}
                possession={g.meta?.possession||'BWD'} quarter={g.meta?.quarter||1}
                down={1} distance={10} fieldPos={g.meta?.fieldPos??-20}
                clockMin={g.meta?.clockMin??12} clockSec={g.meta?.clockSec??0}
                onClockClick={() => {}} isFinal={!!g.is_final}
              />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {g.meta?.date||''} · {(g.meta?.snaps||[]).length} plays · {g.is_final?'✅ Final':'🔴 Live'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {!g.is_final ? (
                <button onClick={() => setActiveGame(g)} style={{ flex: 1, padding: 8, background: C.gold, border: 'none', color: C.textDark, borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Continue Tagging</button>
              ) : (
                <button onClick={() => setViewingGame(g)} style={{ flex: 1, padding: 8, background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📊 View Report</button>
              )}
              {confirmDeleteId===g.id ? (
                <>
                  <button onClick={() => deleteGame(g.id)} style={{ padding: '8px 10px', background: C.red, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Confirm</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                </>
              ) : (
                canEdit && <button onClick={() => setConfirmDeleteId(g.id)} style={{ padding: '8px 10px', background: 'none', border: `1px solid ${C.border}`, color: C.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
              )}
            </div>
          </div>
        );
      })}
      {games.length===0&&currentSeason&&<p style={{ color: C.muted }}>No games yet. Start one above.</p>}
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
    if (!newName.trim()||!newStart||!newEnd) return;
    await supabase.from('seasons').insert({ team_id: team.id, name: newName.trim(), start_date: newStart, end_date: newEnd });
    setNewName(''); setNewStart(''); setNewEnd(''); load();
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <input placeholder='Season name e.g. "Pre Season 26"' value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: 8, background: C.navyDark, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text }} />
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
      {seasons.length===0&&<p style={{ color: C.muted }}>No seasons yet.</p>}
    </div>
  );
}

export function FootballTeamView({ team, onBack }) {
  const [tab, setTab] = useState('game');
  const FB_LOGO = 'https://xqfykowofjswojwgdcmj.supabase.co/storage/v1/object/public/Assets/Untitled%20design.PNG';

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ padding: '7px 2px', fontWeight: tab===key?800:600, fontSize: 11, background: tab===key?C.gold:'rgba(255,255,255,0.08)', color: tab===key?C.textDark:C.text, border: `1px solid ${tab===key?C.gold:C.border}`, borderRadius: 7, cursor: 'pointer', textAlign: 'center' }}>{label}</button>
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length},1fr)`, gap: 4, marginBottom: 20 }}>
          {tabs.map(t => tabBtn(t.key, t.label))}
        </div>
        {tab==='game'&&<FBGameScreen team={team} role={team.role} />}
        {tab==='roster'&&<FBRosterScreen team={team} role={team.role} />}
        {tab==='opponents'&&<FBOpponentsScreen team={team} role={team.role} />}
        {tab==='seasons'&&<FBSeasonsScreen team={team} role={team.role} />}
      </div>
    </div>
  );
}
