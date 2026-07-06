import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';

export const FT_POSITION = { x: 50, y: 81 };
export const SHOT_KEYS = ["3PM", "3PA", "2PM", "2PA"];

export const STAT_DEFS = [
  { key: "3PM", label: "3PT Make", abbr: "3PM", value: 4,  group: "Scoring" },
  { key: "3PA", label: "3PT Miss", abbr: "3PA", value: -2, group: "Scoring" },
  { key: "2PM", label: "2PT Make", abbr: "2PM", value: 3,  group: "Scoring" },
  { key: "2PA", label: "2PT Miss", abbr: "2PA", value: -2, group: "Scoring" },
  { key: "FTM", label: "FT Make",  abbr: "FTM", value: 1,  group: "Scoring" },
  { key: "FTA", label: "FT Miss",  abbr: "FTA", value: -2, group: "Scoring" },
  { key: "O",   label: "OFF Reb",  abbr: "OFF", value: 3,  group: "Rebounds" },
  { key: "D",   label: "DEF Reb",  abbr: "DEF", value: 2,  group: "Rebounds" },
  { key: "TO",  label: "Turnover", abbr: "TO",  value: -3, group: "Minus" },
  { key: "CHG_comm", label: "CHG Comm",   abbr: "CHG", value: -2, group: "Minus" },
  { key: "AP",  label: "Allow Pen",abbr: "AP",  value: -2, group: "Minus" },
  { key: "PF",  label: "Player Foul", abbr: "PF", value: -1, group: "Minus" },
  { key: "STL", label: "Steal",    abbr: "STL", value: 3,  group: "Recoveries" },
  { key: "DF",  label: "Deflection",abbr: "DFL", value: 1, group: "Recoveries" },
  { key: "FE",  label: "Forced Err",abbr: "FE",  value: 1, group: "Recoveries" },
  { key: "AST", label: "Assist",   abbr: "AST", value: 2,  group: "Plus" },
  { key: "ACG", label: "Att. CHG", abbr: "ACG", value: 1,  group: "Plus" },
  { key: "CHG_taken", label: "CHG Taken", abbr: "CHG+", value: 4, group: "Plus" },
  { key: "BS",  label: "Block",    abbr: "BLK", value: 1,  group: "Plus" },
  { key: "HP",  label: "Hustle",   abbr: "HP",  value: 1,  group: "Plus" },
  { key: "pass_pos", label: "Good Pass", abbr: "PASS+", value: 1,  group: "Special", pairId: "pass" },
  { key: "pass_neg", label: "Bad Pass",  abbr: "PASS-", value: -1, group: "Special", pairId: "pass" },
  { key: "close_pos", label: "Good Close", abbr: "CLS+", value: 1,  group: "Special", pairId: "close" },
  { key: "close_neg", label: "Bad Close",  abbr: "CLS-", value: -1, group: "Special", pairId: "close" },
  { key: "help_pos", label: "Good Help", abbr: "HLP+", value: 1,  group: "Special", pairId: "help" },
  { key: "help_neg", label: "Bad Help",  abbr: "HLP-", value: -1, group: "Special", pairId: "help" },
];
export const GROUPS = ["Scoring", "Rebounds", "Minus", "Recoveries", "Plus", "Special"];

const BUILT_IN_STAT_DEFS = STAT_DEFS.map(d => ({ ...d }));

export function applyStatDefs(savedDefs) {
  if (!savedDefs || savedDefs.length === 0) {
    STAT_DEFS.length = 0;
    STAT_DEFS.push(...BUILT_IN_STAT_DEFS.map(d => ({ ...d })));
    return;
  }
  const overridesByKey = {};
  const customDefs = [];
  savedDefs.forEach(d => {
    const isBuiltIn = BUILT_IN_STAT_DEFS.some(base => base.key === d.key);
    if (isBuiltIn) overridesByKey[d.key] = d;
    else customDefs.push(d);
  });
  const merged = BUILT_IN_STAT_DEFS.map(base => overridesByKey[base.key] ? { ...base, ...overridesByKey[base.key] } : { ...base });
  STAT_DEFS.length = 0;
  STAT_DEFS.push(...merged, ...customDefs);
}

export const GAME_FORMAT_PRESETS = [
  { key: "hs_q8",  label: "HS — 4x8min Qtrs", periods: 4, periodLabel: "Quarter", minutes: 8, otMinutes: 4 },
  { key: "q10",    label: "Summer — 4x10min Qtrs", periods: 4, periodLabel: "Quarter", minutes: 10, otMinutes: 4 },
  { key: "half16", label: "Off — 2x16min Halves", periods: 2, periodLabel: "Half", minutes: 16, otMinutes: 4 },
  { key: "half18", label: "Off — 2x18min Halves", periods: 2, periodLabel: "Half", minutes: 18, otMinutes: 4 },
  { key: "half20", label: "Off — 2x20min Halves", periods: 2, periodLabel: "Half", minutes: 20, otMinutes: 4 }
];

export function emptyPlayerStats() {
  const s = {};
  STAT_DEFS.forEach(d => { s[d.key] = 0; });
  return s;
}

export function calcPts(stats) {
  return (stats["3PM"] || 0) * 3 + (stats["2PM"] || 0) * 2 + (stats["FTM"] || 0);
}
export function calcEff(stats) {
  return STAT_DEFS.reduce((sum, d) => sum + (stats[d.key] || 0) * d.value, 0);
}
export function pct(made, att) {
  return att === 0 ? '—' : Math.round((made / att) * 100) + '%';
}

export function CourtSVG({ shots, onTap, interactive, courtColor, laneColor }) {
  const getCoords = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  };
  const handleClick = (e) => { if (!interactive) return; const c = getCoords(e); onTap(c.x, c.y); };
  const handleTouch = (e) => { if (!interactive) return; e.preventDefault(); const c = getCoords(e); onTap(c.x, c.y); };

  return (
    <svg viewBox="0 0 500 470" onClick={handleClick} onTouchStart={handleTouch}
      style={{ width: '100%', background: courtColor || '#c8922a', borderRadius: 10, cursor: interactive ? 'crosshair' : 'default', touchAction: 'none', display: 'block', userSelect: 'none' }}>
      <rect x="10" y="10" width="480" height="450" fill={courtColor || '#c8922a'} stroke="#fff" strokeWidth="3" rx="4" />
      <rect x="170" y="10" width="160" height="190" fill={laneColor || '#a06414'} stroke="#fff" strokeWidth="2.5" />
      <line x1="170" y1="200" x2="330" y2="200" stroke="#fff" strokeWidth="2.5" />
      <path d="M170 200 A80 80 0 0 0 330 200" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="8 5" />
      <path d="M170 200 A80 80 0 0 1 330 200" fill="none" stroke="#fff" strokeWidth="2.5" />
      <line x1="210" y1="42" x2="290" y2="42" stroke="#fff" strokeWidth="4" />
      <circle cx="250" cy="58" r="16" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="250" cy="58" r="3" fill="#fff" />
      <path d="M216 58 A34 34 0 0 0 284 58" fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="30" y1="10" x2="30" y2="200" stroke="#fff" strokeWidth="2.5" />
      <line x1="470" y1="10" x2="470" y2="200" stroke="#fff" strokeWidth="2.5" />
      <path d="M30 200 A237 237 0 0 0 470 200" fill="none" stroke="#fff" strokeWidth="2.5" />
      <line x1="10" y1="455" x2="490" y2="455" stroke="#fff" strokeWidth="2.5" />
      <path d="M195 455 A55 55 0 0 1 305 455" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 4" />
      {(shots || []).map((s, i) => {
        const dx = s.x * 5, dy = s.y * 4.7;
        return (
          <g key={i}>
            <circle cx={dx} cy={dy} r="12" fill={s.make ? 'rgba(74,222,128,0.88)' : 'rgba(239,68,68,0.88)'} stroke={s.make ? '#16a34a' : '#dc2626'} strokeWidth="2.5" />
            {s.make
              ? <text x={dx} y={dy + 4} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="900">{'\u2713'}</text>
              : (<>
                  <line x1={dx - 6} y1={dy - 6} x2={dx + 6} y2={dy + 6} stroke="#fff" strokeWidth="2.5" />
                  <line x1={dx + 6} y1={dy - 6} x2={dx - 6} y2={dy + 6} stroke="#fff" strokeWidth="2.5" />
                </>)
            }
          </g>
        );
      })}
    </svg>
  );
}

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

export function ShotChartView({ players, shotLog, opponent, court, lane, onClose }) {
  const [chartMode, setChartMode] = useState('team');
  const [chartPlayer, setChartPlayer] = useState(players[0]?.id || null);
  const [chartPeriod, setChartPeriod] = useState('all');

  const periodsWithShots = [...new Set(shotLog.map(s => s.period).filter(p => p != null))].sort((a, b) => a - b);
  const periodLabel = (p) => `Q${p}`;

  const byMode = chartMode === 'team' ? shotLog.filter(s => s.playerId !== 'OPP')
    : chartMode === 'opp' ? shotLog.filter(s => s.playerId === 'OPP')
    : shotLog.filter(s => s.playerId === chartPlayer);
  const shots = chartPeriod !== 'all' ? byMode.filter(s => s.period === chartPeriod) : byMode;
  const makes = shots.filter(s => s.make).length;
  const att = shots.length;
  const threes = shots.filter(s => s.statKey === '3PM' || s.statKey === '3PA');
  const threeMakes = threes.filter(s => s.make).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 6 }}>✕ Close</button>
        <div style={{ color: '#e8edf5', fontWeight: 700, fontSize: 13 }}>Shot Chart</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['player', 'Player'], ['team', 'Team'], ['opp', opponent?.name || 'Opponent']].map(([key, label]) => (
            <button key={key} onClick={() => setChartMode(key)}
              style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: chartMode === key ? '1px solid #c8a84b' : '1px solid #243d6b', background: chartMode === key ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)', color: chartMode === key ? '#c8a84b' : '#e8edf5', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {chartMode === 'player' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {players.map(p => (
              <button key={p.id} onClick={() => setChartPlayer(p.id)}
                style={{ padding: '6px 12px', borderRadius: 8, border: p.id === chartPlayer ? '1px solid #c8a84b' : '1px solid #243d6b', background: p.id === chartPlayer ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)', color: p.id === chartPlayer ? '#c8a84b' : '#e8edf5', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {periodsWithShots.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <button onClick={() => setChartPeriod('all')}
              style={{ padding: '6px 12px', borderRadius: 8, border: chartPeriod === 'all' ? '1px solid #c8a84b' : '1px solid #243d6b', background: chartPeriod === 'all' ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)', color: chartPeriod === 'all' ? '#c8a84b' : '#e8edf5', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Full Game
            </button>
            {periodsWithShots.map(p => (
              <button key={p} onClick={() => setChartPeriod(p)}
                style={{ padding: '6px 12px', borderRadius: 8, border: chartPeriod === p ? '1px solid #c8a84b' : '1px solid #243d6b', background: chartPeriod === p ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)', color: chartPeriod === p ? '#c8a84b' : '#e8edf5', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {periodLabel(p)}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { l: 'SHOTS', v: att },
            { l: 'MAKES', v: makes },
            { l: 'FG%', v: att === 0 ? '—' : Math.round((makes / att) * 100) + '%' },
            { l: '3P%', v: threes.length === 0 ? '—' : Math.round((threeMakes / threes.length) * 100) + '%' },
          ].map(i => (
            <div key={i.l} style={{ background: '#162d50', borderRadius: 9, padding: '8px 4px', textAlign: 'center', border: '1px solid #243d6b' }}>
              <div style={{ fontSize: 10, color: '#8a99b8', fontWeight: 700 }}>{i.l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#e8edf5' }}>{i.v}</div>
            </div>
          ))}
        </div>

        <CourtSVG shots={shots} interactive={false} courtColor={court} laneColor={lane} />

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8a99b8' }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(74,222,128,0.85)', border: '2px solid #22c55e' }} />Make
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8a99b8' }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(239,68,68,0.85)', border: '2px solid #dc2626' }} />Miss
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoxScoreReport({ team, teamName, logo, opponent, players, stats, minutesLog, checkInClock, onCourt, clockTotalSeconds, shotLog, court, lane, onClose }) {
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
  const statsFor = (id) => stats[id] || emptyPlayerStats();

  const sorted = [...players].sort((a, b) => calcEff(statsFor(b.id)) - calcEff(statsFor(a.id)));
  const teamPts = sorted.reduce((s, p) => s + calcPts(statsFor(p.id)), 0);
  const teamEff = sorted.reduce((s, p) => s + calcEff(statsFor(p.id)), 0);
  const sumOurs = (key) => sorted.reduce((s, p) => s + (statsFor(p.id)[key] || 0), 0);
  const teamFgm = sumOurs('2PM') + sumOurs('3PM');
  const teamFga = teamFgm + sumOurs('2PA') + sumOurs('3PA');
  const team3pm = sumOurs('3PM');
  const team3pa = team3pm + sumOurs('3PA');
  const teamFtm = sumOurs('FTM');
  const teamFta = teamFtm + sumOurs('FTA');
  const teamOreb = sumOurs('O');
  const teamDreb = sumOurs('D');
  const teamAst = sumOurs('AST');
  const teamStl = sumOurs('STL');
  const teamBlk = sumOurs('BS');
  const teamDefl = sumOurs('DF');
  const teamChgt = sumOurs('CHG_taken');
  const teamHp = sumOurs('HP');
  const teamFe = sumOurs('FE');
  const teamTo = sumOurs('TO');
  const oppSt = statsFor('OPP');
  const oppEff = calcEff(oppSt);
  const oppPts = calcPts(oppSt);
  const oppFgm = (oppSt['2PM'] || 0) + (oppSt['3PM'] || 0);
  const oppFga = oppFgm + (oppSt['2PA'] || 0) + (oppSt['3PA'] || 0);
  const oppName = opponent?.name || 'Opponent';

  const th = { padding: '7px 5px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', background: '#1a3a6b', color: '#fff' };
  const td = { padding: '7px 5px', textAlign: 'center', borderBottom: '1px solid #dde3ef', fontSize: 12 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #box-score-printable, #box-score-printable * { visibility: visible; }
          #box-score-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          #box-score-no-print { display: none !important; }
        }
      `}</style>
      <div id="box-score-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 6 }}>✕ Close</button>
        <button onClick={() => {
  const content = document.getElementById('box-score-printable').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Box Score</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, sans-serif; color: #1a1a1a; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a3a6b; color: #fff; padding: 6px 4px; text-align: center; font-weight: 700; font-size: 9px; }
    td { padding: 5px 4px; text-align: center; border-bottom: 1px solid #dde3ef; font-size: 10px; }
    tr:nth-child(even) { background: #f0f4fa; }
    img { max-height: 36px; }
    @page { size: landscape; margin: 10mm; }
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}} style={{ background: '#c8a84b', border: 'none', color: '#0d1b2e', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>🖨 Print / Save as PDF</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#fff', padding: '24px 16px' }}>
        <div id="box-score-printable" style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '16px 18px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {logo && <img src={logo} style={{ height: 36, width: 'auto', borderRadius: 6, marginRight: 12 }} />}
              <div>
                <div style={{ fontSize: 11, color: '#aab8d4', letterSpacing: 1, textTransform: 'uppercase' }}>{teamName} Basketball</div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>vs. {oppName}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#aab8d4', letterSpacing: 1 }}>SCORE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#c8a84b' }}>{teamPts} – {oppPts}</div>
            </div>
          </div>
          <div style={{ height: 4, background: '#c8a84b' }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 12 }}>
              <thead><tr>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left' }}>Player</th>
                <th style={th}>MIN</th>
                <th style={th}>PTS</th>
                <th style={th}>FGM/A</th>
                <th style={th}>FG%</th>
                <th style={th}>3PM/A</th>
                <th style={th}>3P%</th>
                <th style={th}>FTM/A</th>
                <th style={th}>OREB</th>
                <th style={th}>DREB</th>
                <th style={th}>AST</th>
                <th style={th}>STL</th>
                <th style={th}>BLK</th>
                <th style={th}>DEFL</th>
                <th style={th}>CHGT</th>
                <th style={th}>HP</th>
                <th style={th}>FE</th>
                <th style={th}>TO</th>
                <th style={th}>EFF</th>
                <th style={th}>PER</th>
              </tr></thead>
              <tbody>
                {sorted.map((p, i) => {
                  const st = statsFor(p.id);
                  const eff = calcEff(st);
                  const pts = calcPts(st);
                  const fgm = (st['2PM'] || 0) + (st['3PM'] || 0);
                  const fga = fgm + (st['2PA'] || 0) + (st['3PA'] || 0);
                  const minSec = liveMinutesFor(p.id);
                  const minDecimal = minSec / 60;
                  const per = minDecimal > 0 ? (eff / minDecimal).toFixed(1) : '—';
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent' }}>
                      <td style={td}>{p.number || '—'}</td>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{p.name}</td>
                      <td style={td}>{fmtMin(minSec)}</td>
                      <td style={td}>{pts}</td>
                      <td style={td}>{fgm}/{fga}</td>
                      <td style={td}>{pct(fgm, fga)}</td>
                      <td style={td}>{st['3PM'] || 0}/{(st['3PM'] || 0) + (st['3PA'] || 0)}</td>
                      <td style={td}>{pct(st['3PM'] || 0, (st['3PM'] || 0) + (st['3PA'] || 0))}</td>
                      <td style={td}>{st['FTM'] || 0}/{(st['FTM'] || 0) + (st['FTA'] || 0)}</td>
                      <td style={td}>{st['O'] || 0}</td>
                      <td style={td}>{st['D'] || 0}</td>
                      <td style={td}>{st['AST'] || 0}</td>
                      <td style={td}>{st['STL'] || 0}</td>
                      <td style={td}>{st['BS'] || 0}</td>
                      <td style={td}>{st['DF'] || 0}</td>
                      <td style={td}>{st['CHG_taken'] || 0}</td>
                      <td style={td}>{st['HP'] || 0}</td>
                      <td style={td}>{st['FE'] || 0}</td>
                      <td style={td}>{st['TO'] || 0}</td>
                      <td style={{ ...td, fontWeight: 800, color: eff >= 0 ? '#16a34a' : '#dc2626' }}>{eff >= 0 ? '+' : ''}{eff}</td>
                      <td style={{ ...td, fontWeight: 800, color: '#4169e1' }}>{per}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#1a3a6b', color: '#fff', fontWeight: 700 }}>
                  <td style={{ ...td, color: '#fff' }} colSpan={3}>{(teamName || 'TEAM').toUpperCase()}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamPts}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamFgm}/{teamFga}</td>
                  <td style={{ ...td, color: '#fff' }}>{pct(teamFgm, teamFga)}</td>
                  <td style={{ ...td, color: '#fff' }}>{team3pm}/{team3pa}</td>
                  <td style={{ ...td, color: '#fff' }}>{pct(team3pm, team3pa)}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamFtm}/{teamFta}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamOreb}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamDreb}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamAst}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamStl}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamBlk}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamDefl}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamChgt}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamHp}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamFe}</td>
                  <td style={{ ...td, color: '#fff' }}>{teamTo}</td>
                  <td style={{ ...td, color: '#fff', fontWeight: 800 }}>{teamEff >= 0 ? '+' : ''}{teamEff}</td>
                  <td style={td}></td>
                </tr>
                <tr><td colSpan={21} style={{ padding: 4, background: '#eee' }}></td></tr>
                <tr style={{ background: '#fff5f5' }}>
                  <td style={td}>—</td>
                  <td style={{ ...td, textAlign: 'left', color: '#dc2626', fontWeight: 700 }}>{oppName} (Team)</td>
                  <td style={td}>—</td>
                  <td style={td}>{oppPts}</td>
                  <td style={td}>{oppFgm}/{oppFga}</td>
                  <td style={td}>{pct(oppFgm, oppFga)}</td>
                  <td style={td}>{oppSt['3PM'] || 0}/{(oppSt['3PM'] || 0) + (oppSt['3PA'] || 0)}</td>
                  <td style={td}>{pct(oppSt['3PM'] || 0, (oppSt['3PM'] || 0) + (oppSt['3PA'] || 0))}</td>
                  <td style={td}>{oppSt['FTM'] || 0}/{(oppSt['FTM'] || 0) + (oppSt['FTA'] || 0)}</td>
                  <td style={td}>{oppSt['O'] || 0}</td>
                  <td style={td}>{oppSt['D'] || 0}</td>
                  <td style={td}>{oppSt['AST'] || 0}</td>
                  <td style={td}>{oppSt['STL'] || 0}</td>
                  <td style={td}>{oppSt['BS'] || 0}</td>
                  <td style={td}>{oppSt['DF'] || 0}</td>
                  <td style={td}>{oppSt['CHG_taken'] || 0}</td>
                  <td style={td}>{oppSt['HP'] || 0}</td>
                  <td style={td}>{oppSt['FE'] || 0}</td>
                  <td style={td}>{oppSt['TO'] || 0}</td>
                  <td style={{ ...td, fontWeight: 800, color: oppEff >= 0 ? '#16a34a' : '#dc2626' }}>{oppEff >= 0 ? '+' : ''}{oppEff}</td>
                  <td style={td}></td>
                </tr>
              </tbody>
            </table>
          </div>
          {shotLog && shotLog.length > 0 && (
            <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1a3a6b', marginBottom: 6, textAlign: 'center' }}>{(teamName || 'Team').toUpperCase()} Shots</div>
                <CourtSVG shots={shotLog.filter(s => s.playerId !== 'OPP')} interactive={false} courtColor={court} laneColor={lane} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#dc2626', marginBottom: 6, textAlign: 'center' }}>{oppName.toUpperCase()} Shots</div>
                <CourtSVG shots={shotLog.filter(s => s.playerId === 'OPP')} interactive={false} courtColor={court} laneColor={lane} />
              </div>
            </div>
          )}
          <div style={{ marginTop: 20, padding: 14, background: '#f0f4fa', borderRadius: 8, borderLeft: '4px solid #c8a84b' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1a3a6b', marginBottom: 8 }}>Efficiency Point Values</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, fontSize: 11 }}>
              {STAT_DEFS.map(d => <div key={d.key}><span style={{ fontWeight: 800, color: '#1a3a6b' }}>{d.value >= 0 ? '+' : ''}{d.value}</span> {d.label}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinishedGameView({ team, game, onBack }) {
  const { colors: COLORS, teamName, logo, court, lane } = useTheme();
  const [players, setPlayers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [view, setView] = useState('box');

  useEffect(() => {
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data); });
  }, [team.id]);

  useEffect(() => {
    if (!game.opponent_id) return;
    supabase.from('opponents').select('*').eq('id', game.opponent_id).single()
      .then(({ data, error }) => { if (!error) setOpponent(data); });
  }, [game.opponent_id]);

  const stats = game.player_stats || {};
  const shotLog = game.shot_log || [];
  const minutesLog = game.meta?.minutesLog || {};
  const checkInClock = {};
  const onCourt = game.meta?.onCourt || players.map(p => p.id);
  const clockTotalSeconds = 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 7, padding: '8px 14px', cursor: 'pointer' }}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('box')}
            style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${view === 'box' ? COLORS.gold : COLORS.border}`, background: view === 'box' ? COLORS.gold : 'none', color: view === 'box' ? COLORS.textDark : COLORS.text, fontWeight: 700, cursor: 'pointer' }}>
            📊 Box Score
          </button>
          <button onClick={() => setView('shots')}
            style={{ padding: '8px 14px', borderRadius: 7, border: `1px solid ${view === 'shots' ? COLORS.gold : COLORS.border}`, background: view === 'shots' ? COLORS.gold : 'none', color: view === 'shots' ? COLORS.textDark : COLORS.text, fontWeight: 700, cursor: 'pointer' }}>
            🎯 Shots
          </button>
        </div>
      </div>

      {view === 'box' && (
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
          onClose={onBack}
        />
      )}
      {view === 'shots' && (
        <ShotChartView
          players={players}
          shotLog={shotLog}
          opponent={opponent || { name: game.meta?.opponentName }}
          court={court}
          lane={lane}
          onClose={onBack}
        />
      )}
    </div>
  );
}

export function ScrimmageTagger({ team, practice, players, onSave, onClose }) {
  const { colors: COLORS } = useTheme();
  const scrimmage = practice.plan?.scrimmage;

  const [navyColor, setNavyColor] = useState(scrimmage?.navyColor || '#1a3a6b');
  const [whiteColor, setWhiteColor] = useState(scrimmage?.whiteColor || '#e8edf5');
  const [teamAssign, setTeamAssign] = useState(scrimmage?.teamAssign || {});
  const [stats, setStats] = useState(scrimmage?.stats || {});
  const [shotLog, setShotLog] = useState(scrimmage?.shotLog || []);
  const [started, setStarted] = useState(!!scrimmage?.started);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pendingShot, setPendingShot] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [quickMode, setQuickMode] = useState(true);
  const [specialPicker, setSpecialPicker] = useState(null);
  const [saving, setSaving] = useState(false);
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

  const teamOf = (pid) => teamAssign[pid] || 'navy';
  const toggleTeam = (pid) => setTeamAssign(prev => ({ ...prev, [pid]: teamOf(pid) === 'navy' ? 'white' : 'navy' }));
  const navyRoster = players.filter(p => teamOf(p.id) === 'navy');
  const whiteRoster = players.filter(p => teamOf(p.id) === 'white');
  const statsFor = (id) => stats[id] || emptyPlayerStats();

  const persist = async (next) => {
    setSaving(true);
    const nextPlan = { ...practice.plan, scrimmage: next };
    const { error } = await supabase.from('practices').update({ plan: nextPlan, updated_at: new Date().toISOString() }).eq('id', practice.id);
    setSaving(false);
    if (error) alert('Error saving: ' + error.message);
    if (onSave) onSave(nextPlan);
  };

  const saveNow = () => {
    persist({ navyColor, whiteColor, teamAssign, stats, shotLog, started: true });
  };

  const startScrimmage = () => {
    const fresh = {};
    players.forEach(p => { fresh[p.id] = emptyPlayerStats(); });
    setStats(fresh);
    setShotLog([]);
    setLastAction(null);
    setStarted(true);
  };

  const commitStat = (pid, key, shotPos) => {
    setStats(prev => {
      const cur = prev[pid] || emptyPlayerStats();
      return { ...prev, [pid]: { ...cur, [key]: (cur[key] || 0) + 1 } };
    });
    if (shotPos) {
      setShotLog(prev => [...prev, { playerId: pid, statKey: key, x: shotPos.x, y: shotPos.y, make: key === 'FTM' || key === '3PM' || key === '2PM' }]);
    }
    setLastAction({ playerId: pid, statKey: key });
    setSelectedPlayer(null);
  };

  const tagStat = (pid, key) => {
    if (!pid) return;
    if (key === 'FTM' || key === 'FTA') { commitStat(pid, key, FT_POSITION); return; }
    if (SHOT_KEYS.includes(key)) { setPendingShot({ pid, key }); return; }
    commitStat(pid, key, null);
  };

  const handleCourtTap = (x, y) => {
    if (!pendingShot) return;
    commitStat(pendingShot.pid, pendingShot.key, { x, y });
    setPendingShot(null);
  };

  const undoLast = () => {
    if (!lastAction) return;
    const { playerId, statKey } = lastAction;
    setStats(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), [statKey]: Math.max(0, (prev[playerId]?.[statKey] || 1) - 1) } }));
    setShotLog(prev => {
      const idx = [...prev].map((s, i) => i).reverse().find(i => prev[i].playerId === playerId && prev[i].statKey === statKey);
      return idx == null ? prev : prev.filter((_, i) => i !== idx);
    });
    setLastAction(null);
  };

  const navyPts = navyRoster.reduce((s, p) => s + calcPts(statsFor(p.id)), 0);
  const whitePts = whiteRoster.reduce((s, p) => s + calcPts(statsFor(p.id)), 0);
  const navyEff = navyRoster.reduce((s, p) => s + calcEff(statsFor(p.id)), 0);
  const whiteEff = whiteRoster.reduce((s, p) => s + calcEff(statsFor(p.id)), 0);

  if (!statDefsReady) {
    return <p style={{ color: COLORS.muted }}>Loading...</p>;
  }

  if (!started) {
    return (
      <div>
        <button onClick={onClose} style={{ marginBottom: 16, background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 7, padding: '8px 14px', cursor: 'pointer' }}>← Back</button>
        <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scrimmage Setup</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px' }}>
              <input type="color" value={navyColor} onChange={e => setNavyColor(e.target.value)} style={{ width: 30, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Navy Team</span>
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 10px' }}>
              <input type="color" value={whiteColor} onChange={e => setWhiteColor(e.target.value)} style={{ width: 30, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>White Team</span>
            </label>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, marginBottom: 8 }}>Tap a player to switch their team</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {players.map(p => {
              const t = teamOf(p.id);
              const color = t === 'navy' ? navyColor : whiteColor;
              const isLight = t === 'white';
              return (
                <button key={p.id} onClick={() => toggleTeam(p.id)}
                  style={{ padding: '7px 12px', borderRadius: 9, border: `2px solid ${color}`, background: color, color: isLight ? COLORS.textDark : '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  #{p.number || '—'} {(p.name || '').split(' ')[0]}
                </button>
              );
            })}
          </div>
          <button onClick={startScrimmage} style={{ width: '100%', padding: 11, background: COLORS.gold, border: 'none', borderRadius: 10, color: COLORS.textDark, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Start Scrimmage →
          </button>
        </div>
      </div>
    );
  }

  const rosterColumn = (roster, color, side) => (
    <div style={{ width: 78, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: 320, background: `${color}22`, borderRadius: 8, padding: 4 }}>
      {roster.map(p => {
        const sel = selectedPlayer === p.id;
        const eff = calcEff(statsFor(p.id));
        const isLight = side === 'white';
        return (
          <div key={p.id}>
            <button onClick={() => { if (pendingShot) return; setSelectedPlayer(sel ? null : p.id); }}
              style={{ width: '100%', background: sel ? color : `${color}30`, border: sel ? `2px solid ${color}` : `1px solid ${COLORS.border}`, borderRadius: '7px 7px 0 0', padding: '5px 3px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, color: sel ? (isLight ? COLORS.textDark : '#fff') : color }}>{p.number || '—'}</div>
              <div style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, marginTop: 1, color: sel ? (isLight ? COLORS.textDark : '#fff') : COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(p.name || '').split(' ')[0]}</div>
              <div style={{ fontSize: 9, marginTop: 1, fontWeight: 700, color: sel ? (isLight ? 'rgba(13,27,46,0.7)' : 'rgba(255,255,255,0.7)') : COLORS.muted }}>{eff >= 0 ? '+' : ''}{eff}</div>
            </button>
            <button onClick={() => toggleTeam(p.id)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: `1px solid ${COLORS.border}`, borderTop: 'none', borderRadius: '0 0 7px 7px', color: '#fff', fontSize: 8, fontWeight: 800, cursor: 'pointer', padding: '3px 0' }}>
              ⇄ {side === 'navy' ? 'White' : 'Navy'}
            </button>
          </div>
        );
      })}
    </div>
  );

  const btnStyle = (isGreen) => ({
    padding: '7px 2px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
    background: isGreen ? COLORS.statPosBg : COLORS.statNegBg,
    border: `2px solid ${isGreen ? COLORS.statPosBorder : COLORS.statNegBorder}`,
    color: isGreen ? COLORS.statPosText : COLORS.statNegText, fontWeight: 700,
  });
  const GREEN_KEYS = ["3PM", "2PM", "FTM", "O", "D", "AST", "STL"];
  const RED_KEYS = ["3PA", "2PA", "FTA", "TO", "AP", "PF"];
  const LIVE_KEYS = new Set([...GREEN_KEYS, ...RED_KEYS]);
  const greenDefs = GREEN_KEYS.map(k => STAT_DEFS.find(d => d.key === k)).filter(Boolean);
  const redDefs = RED_KEYS.map(k => STAT_DEFS.find(d => d.key === k)).filter(Boolean);
  const specialPosDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value >= 0);
  const specialNegDefs = STAT_DEFS.filter(d => !LIVE_KEYS.has(d.key) && d.value < 0);
  const renderQuickBtn = (def) => (
    <button key={def.key} onClick={() => tagStat(selectedPlayer, def.key)} disabled={!selectedPlayer}
      style={{ ...btnStyle(def.value >= 0), opacity: selectedPlayer ? 1 : 0.5 }}>
      <div style={{ fontSize: 10 }}>{def.abbr}</div>
      <div style={{ fontSize: 13, fontWeight: 900 }}>{statsFor(selectedPlayer || '')[def.key] || 0}</div>
    </button>
  );
  const renderSpBtn = (mode) => {
    const isGreen = mode === 'pos';
    const opts = isGreen ? specialPosDefs : specialNegDefs;
    const isOpen = specialPicker === mode;
    return (
      <button key={`sp-${mode}`} disabled={opts.length === 0 || !selectedPlayer} onClick={() => setSpecialPicker(isOpen ? null : mode)}
        style={{ ...btnStyle(isGreen), opacity: (selectedPlayer && opts.length > 0) ? 1 : 0.5, position: 'relative' }}>
        <div style={{ fontSize: 9, fontWeight: 700 }}>SPECIAL</div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>SP{isOpen ? ' \u25B2' : ''}</div>
      </button>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>← Back</button>
        <div style={{ fontSize: 11, color: COLORS.muted }}>{saving ? 'Saving…' : 'Saved'}</div>
        <button onClick={saveNow} style={{ background: COLORS.gold, border: 'none', color: COLORS.textDark, fontWeight: 800, fontSize: 12, padding: '6px 14px', borderRadius: 7, cursor: 'pointer' }}>💾 Save</button>
      </div>

      <div style={{ background: '#060f1a', border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: '8px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: navyColor, textTransform: 'uppercase' }}>Navy</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: navyColor, lineHeight: 1 }}>{navyPts}</div>
            <div style={{ fontSize: 10, color: COLORS.muted }}>EFF <span style={{ color: navyEff >= 0 ? COLORS.green : COLORS.red, fontWeight: 800 }}>{navyEff >= 0 ? '+' : ''}{navyEff}</span></div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>{practice.date}</div>
            {lastAction && <button onClick={undoLast} style={{ fontSize: 9, color: COLORS.gold, background: 'none', border: `1px solid ${COLORS.gold}`, borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontWeight: 700, marginTop: 2 }}>↩ Undo</button>}
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: whiteColor, textTransform: 'uppercase' }}>White</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: whiteColor, lineHeight: 1 }}>{whitePts}</div>
            <div style={{ fontSize: 10, color: COLORS.muted }}>EFF <span style={{ color: whiteEff >= 0 ? COLORS.green : COLORS.red, fontWeight: 800 }}>{whiteEff >= 0 ? '+' : ''}{whiteEff}</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {rosterColumn(navyRoster, navyColor, 'navy')}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 300 260" style={{ width: '100%', display: 'block', background: '#c8922a', borderRadius: 8 }}>
            <rect x="5" y="5" width="290" height="250" fill="#c8922a" stroke="#fff" strokeWidth="2" rx="3" />
            <rect x="100" y="5" width="100" height="115" fill="#a06414" stroke="#fff" strokeWidth="1.5" />
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
            <text x="150" y="195" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)" fontWeight="700">
              {pendingShot ? 'tap court to record shot' : selectedPlayer ? 'tap stat' : 'tap player first'}
            </text>
          </svg>
        </div>
        {rosterColumn(whiteRoster, whiteColor, 'white')}
      </div>

      {pendingShot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 10, color: COLORS.text, fontWeight: 700 }}>Tap the court where the shot was taken</div>
            <CourtSVG shots={shotLog.filter(s => s.playerId === pendingShot.pid)} onTap={handleCourtTap} interactive={true} />
            <button onClick={() => setPendingShot(null)} style={{ marginTop: 10, width: '100%', padding: 12, background: 'none', border: '1px solid #ccc', color: COLORS.text, borderRadius: 8, cursor: 'pointer' }}>Cancel Shot</button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5 }}>
            {greenDefs.map(renderQuickBtn)}
            {renderSpBtn('pos')}
          </div>
          <div style={{ width: 1, background: COLORS.border, alignSelf: 'stretch' }} />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5 }}>
            {redDefs.map(renderQuickBtn)}
            {renderSpBtn('neg')}
          </div>
        </div>
        {specialPicker && (() => {
          const opts = specialPicker === 'pos' ? specialPosDefs : specialNegDefs;
          const isGreen = specialPicker === 'pos';
          return (
            <div style={{ position: 'absolute', bottom: '100%', [isGreen ? 'left' : 'right']: 0, marginBottom: 6, background: COLORS.navyMid, border: `2px solid ${isGreen ? COLORS.green : COLORS.red}`, borderRadius: 10, padding: 8, zIndex: 50, minWidth: 170, boxShadow: '0 -6px 24px rgba(0,0,0,0.5)' }}>
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
    </div>
  );
}

export function FormatPicker({ value, onChange }) {
  const { colors: COLORS } = useTheme();
  const isCustomActive = !GAME_FORMAT_PRESETS.some(f => f.key === value.key);

  const selectPreset = (preset) => onChange(preset);
  const setCustomPeriods = (n) => onChange({ ...value, key: 'custom', periodLabel: 'Period', periods: Math.max(1, n), otMinutes: value.otMinutes || 4 });
  const setCustomMinutes = (n) => onChange({ ...value, key: 'custom', periodLabel: value.periodLabel || 'Period', minutes: Math.max(1, n), otMinutes: value.otMinutes || 4 });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 10 }}>
        {GAME_FORMAT_PRESETS.map(f => (
          <button key={f.key} onClick={() => selectPreset(f)}
            style={{ padding: '9px 8px', borderRadius: 8, border: value.key === f.key ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.border}`, background: value.key === f.key ? 'rgba(200,168,75,0.15)' : COLORS.navyDark, color: value.key === f.key ? COLORS.gold : COLORS.text, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: COLORS.muted }}>Custom:</div>
        <input type="number" value={isCustomActive ? value.periods : ''} placeholder={String(value.periods)} onChange={e => setCustomPeriods(parseInt(e.target.value, 10) || 1)}
          style={{ width: 50, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '6px 6px', color: COLORS.text, fontSize: 13, textAlign: 'center' }} />
        <div style={{ fontSize: 11, color: COLORS.muted }}>periods of</div>
        <input type="number" value={isCustomActive ? value.minutes : ''} placeholder={String(value.minutes)} onChange={e => setCustomMinutes(parseInt(e.target.value, 10) || 1)}
          style={{ width: 50, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '6px 6px', color: COLORS.text, fontSize: 13, textAlign: 'center' }} />
        <div style={{ fontSize: 11, color: COLORS.muted }}>min</div>
      </div>
    </div>
  );
}
