import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import { BIBLE_STRUCTURE } from './bibleStructure';

const SEGMENTS = ['Pre-Practice', 'Offense', 'Defense'];
const DURATION_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 2);

function emptyRow() {
  return { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timeOfDay: '', duration: '', drillId: '', seriesId: '', focus: '' };
}
function emptyPlan() {
  return { segments: { 'Pre-Practice': [emptyRow()], 'Offense': [emptyRow()], 'Defense': [emptyRow()] }, verse: { book: '', chapter: '', verse: '', text: '' } };
}

function PracticePlanReport({ entry, drillLibrary, seriesLibrary, teamName, logo, onClose }) {
  const plan = entry.plan || emptyPlan();
  const drillName = (id) => drillLibrary.find(d => d.id === id)?.name || '—';
  const seriesName = (id) => seriesLibrary.find(s => s.id === id)?.name || '—';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #practice-plan-printable, #practice-plan-printable * { visibility: visible; }
          #practice-plan-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          #practice-plan-no-print { display: none !important; }
        }
      `}</style>
      <div id="practice-plan-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0d1b2e', borderBottom: '1px solid #243d6b', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e8edf5', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 6 }}>✕ Close</button>
        <button onClick={() => window.print()} style={{ background: '#c8a84b', border: 'none', color: '#0d1b2e', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>🖨 Print / Save as PDF</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#fff', padding: '24px 16px' }}>
        <div id="practice-plan-printable" style={{ maxWidth: 680, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
          <div style={{ background: '#1a3a6b', border: '2px solid #c8a84b', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, minHeight: 60 }}>
            {logo && <img src={logo} style={{ height: 44, width: 44, borderRadius: 8, objectFit: 'cover' }} />}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{teamName} Basketball</div>
              <div style={{ fontSize: 12, color: '#c8a84b', fontWeight: 700, marginTop: 2 }}>Practice No. {entry.practice_number ?? '—'}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{entry.date}{entry.time ? ` · ${entry.time}` : ''} · {entry.location || ''}</div>
            </div>
          </div>

          {plan.verse && plan.verse.text && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: '#1a3a6b', border: '2px solid #c8a84b', borderRadius: 8, padding: '7px 12px', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#aab8d4', letterSpacing: 1, textTransform: 'uppercase' }}>Verse of the Day</div>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <div style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>"{plan.verse.text}"</div>
                <div style={{ fontSize: 11, color: '#1a3a6b', fontWeight: 700, marginTop: 6 }}>{plan.verse.book} {plan.verse.chapter}:{plan.verse.verse} (ESV)</div>
              </div>
            </div>
          )}

          {SEGMENTS.map(segment => (
            <div key={segment} style={{ marginBottom: 16 }}>
              <div style={{ background: '#1a3a6b', border: '2px solid #c8a84b', borderRadius: 8, padding: '7px 12px', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#aab8d4', letterSpacing: 1, textTransform: 'uppercase' }}>{segment}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  {['Time', 'Drill', 'Series', 'Focus'].map(h => (
                    <th key={h} style={{ padding: '6px 6px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'left', background: '#1a3a6b', color: '#fff' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(plan.segments[segment] || []).map((row, i) => (
                    <tr key={row.id} style={{ background: i % 2 === 1 ? '#f0f4fa' : 'transparent' }}>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #dde3ef' }}>{row.timeOfDay || '—'}{row.duration ? ` · ${row.duration} min` : ''}</td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #dde3ef' }}>{drillName(row.drillId)}</td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #dde3ef' }}>{seriesName(row.seriesId)}</td>
                      <td style={{ padding: '6px 6px', borderBottom: '1px solid #dde3ef' }}>{row.focus || '—'}</td>
                    </tr>
                  ))}
                  {(!plan.segments[segment] || plan.segments[segment].length === 0) && (
                    <tr><td colSpan={4} style={{ padding: '8px 6px', color: '#888', fontStyle: 'italic' }}>No rows yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PracticePlanBuilder({ team, entry, onClose }) {
  const { colors: COLORS, teamName, logo } = useTheme();
  const [plan, setPlan] = useState(entry.plan && entry.plan.segments ? entry.plan : emptyPlan());
  const [drillLibrary, setDrillLibrary] = useState([]);
  const [seriesLibrary, setSeriesLibrary] = useState([]);
  const [practiceNumber, setPracticeNumber] = useState(entry.practice_number ?? '');
  const [showReport, setShowReport] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('drills').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setDrillLibrary(data); });
    supabase.from('series_calls').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setSeriesLibrary(data); });
  }, [team.id]);

  const savePlan = async (nextPlan) => {
    setPlan(nextPlan);
    setSaving(true);
    const { error } = await supabase.from('practices').update({ plan: nextPlan, updated_at: new Date().toISOString() }).eq('id', entry.id);
    setSaving(false);
    if (error) alert('Error saving: ' + error.message);
  };

  const savePracticeNumber = async (value) => {
    setPracticeNumber(value);
    const num = value ? parseInt(value, 10) : null;
    await supabase.from('practices').update({ practice_number: num }).eq('id', entry.id);
  };

  const setRowField = (segment, rowId, field, value) => {
    const next = {
      ...plan,
      segments: { ...plan.segments, [segment]: plan.segments[segment].map(r => r.id === rowId ? { ...r, [field]: value } : r) },
    };
    savePlan(next);
  };
  const addRow = (segment) => {
    const next = { ...plan, segments: { ...plan.segments, [segment]: [...plan.segments[segment], emptyRow()] } };
    savePlan(next);
  };
  const removeRow = (segment, rowId) => {
    const next = { ...plan, segments: { ...plan.segments, [segment]: plan.segments[segment].filter(r => r.id !== rowId) } };
    savePlan(next);
  };

  const setVerseField = (field, value) => {
    const cur = plan.verse || { book: '', chapter: '', verse: '', text: '' };
    let next = { ...cur, [field]: value };
    if (field === 'book') { next.chapter = ''; next.verse = ''; }
    if (field === 'chapter') { next.verse = ''; }
    savePlan({ ...plan, verse: next });
  };

  const v = plan.verse || { book: '', chapter: '', verse: '', text: '' };
  const books = Object.keys(BIBLE_STRUCTURE);
  const chapterCount = v.book ? BIBLE_STRUCTURE[v.book].length : 0;
  const verseCount = (v.book && v.chapter) ? BIBLE_STRUCTURE[v.book][v.chapter - 1] : 0;

  const selectStyle = { background: COLORS.navyDark, border: 'none', borderRadius: 5, padding: '4px 5px', color: COLORS.text, fontSize: 11 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: COLORS.navyDark, zIndex: 350, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0d1b2e', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 6 }}>✕ Close</button>
        <div style={{ color: COLORS.muted, fontSize: 11 }}>{saving ? 'Saving…' : 'Saved'}</div>
        <button onClick={() => setShowReport(true)} style={{ background: COLORS.gold, border: 'none', color: COLORS.textDark, fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
          🖨 Print / Save PDF
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <div style={{ background: COLORS.navy, border: `2px solid ${COLORS.gold}`, borderRadius: 12, padding: '6px 14px 6px 6px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, minHeight: 70 }}>
          {logo && <img src={logo} alt="" style={{ height: 58, width: 58, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{teamName} Basketball</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 700 }}>Practice No.</span>
              <select value={practiceNumber} onChange={e => savePracticeNumber(e.target.value)}
                style={{ background: '#0d1b2e', border: `1px solid ${COLORS.gold}`, borderRadius: 6, padding: '2px 6px', color: COLORS.gold, fontWeight: 700, fontSize: 12 }}>
                <option value="">—</option>
                {Array.from({ length: 100 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{entry.date}{entry.time ? ` · ${entry.time}` : ''} · {entry.location || ''}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ background: COLORS.navy, border: `2px solid ${COLORS.gold}`, borderRadius: 9, padding: '8px 14px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Verse of the Day</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <select value={v.book} onChange={e => setVerseField('book', e.target.value)} style={{ ...selectStyle, flex: 1, minWidth: 140 }}>
              <option value="">Book…</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={v.chapter} onChange={e => setVerseField('chapter', e.target.value)} disabled={!v.book} style={{ ...selectStyle, width: 90 }}>
              <option value="">Ch.</option>
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={v.verse} onChange={e => setVerseField('verse', e.target.value)} disabled={!v.chapter} style={{ ...selectStyle, width: 90 }}>
              <option value="">Vs.</option>
              {Array.from({ length: verseCount }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <textarea value={v.text} onChange={e => setVerseField('text', e.target.value)} placeholder="Paste or type the verse text here…"
            style={{ width: '100%', minHeight: 60, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '8px 10px', color: COLORS.text, fontSize: 13, resize: 'vertical' }} />
          {v.book && v.chapter && v.verse && v.text.trim() && (
            <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.gold}`, borderRadius: 9, padding: '10px 12px', marginTop: 8 }}>
              <div style={{ fontSize: 13, color: COLORS.text, fontStyle: 'italic', lineHeight: 1.5 }}>"{v.text}"</div>
              <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, marginTop: 6 }}>{v.book} {v.chapter}:{v.verse} (ESV)</div>
            </div>
          )}
        </div>

        {SEGMENTS.map(segment => (
          <div key={segment} style={{ marginBottom: 16 }}>
            <div style={{ background: COLORS.navy, border: `2px solid ${COLORS.gold}`, borderRadius: 9, padding: '8px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' }}>{segment}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                <thead>
                  <tr>
                    {['Time', 'Drill', 'Series', 'Focus', ''].map(h => (
                      <th key={h} style={{ padding: '5px 6px', color: COLORS.muted, fontWeight: 700, textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.segments[segment].map(row => (
                    <tr key={row.id}>
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: COLORS.border, borderRadius: 7, padding: 5, minWidth: 108 }}>
                          <input type="time" value={row.timeOfDay} onChange={e => setRowField(segment, row.id, 'timeOfDay', e.target.value)}
                            style={{ background: '#0d1b2e', border: 'none', borderRadius: 5, padding: '4px 5px', color: COLORS.text, fontSize: 11 }} />
                          <select value={row.duration} onChange={e => setRowField(segment, row.id, 'duration', e.target.value)}
                            style={{ background: '#0d1b2e', border: 'none', borderRadius: 5, padding: '4px 5px', color: COLORS.text, fontSize: 11 }}>
                            <option value="">— min</option>
                            {DURATION_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <select value={row.drillId} onChange={e => setRowField(segment, row.id, 'drillId', e.target.value)}
                          style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '6px 7px', color: COLORS.text, fontSize: 12, minWidth: 130 }}>
                          <option value="">Select drill…</option>
                          {drillLibrary.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <select value={row.seriesId} onChange={e => setRowField(segment, row.id, 'seriesId', e.target.value)}
                          style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '6px 7px', color: COLORS.text, fontSize: 12, minWidth: 130 }}>
                          <option value="">Select series…</option>
                          {seriesLibrary.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <input value={row.focus} onChange={e => setRowField(segment, row.id, 'focus', e.target.value)} placeholder="Focus…"
                          style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: '6px 7px', color: COLORS.text, fontSize: 12, width: '100%', minWidth: 120 }} />
                      </td>
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <button onClick={() => removeRow(segment, row.id)} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 14, cursor: 'pointer', padding: 4 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => addRow(segment)} style={{ marginTop: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              + Add Row
            </button>
          </div>
        ))}
      </div>

      {showReport && (
        <PracticePlanReport
          entry={{ ...entry, practice_number: practiceNumber ? parseInt(practiceNumber, 10) : null, plan }}
          drillLibrary={drillLibrary}
          seriesLibrary={seriesLibrary}
          teamName={teamName}
          logo={logo}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}