import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';
import PracticePlanBuilder from './PracticePlanBuilder';
import { ScrimmageTagger } from './GameReports';

export default function PracticesScreen({ team, season }) {
  const { colors: COLORS } = useTheme();
  const [practices, setPractices] = useState([]);
  const [players, setPlayers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [scrimmageId, setScrimmageId] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [practiceNumber, setPracticeNumber] = useState('');

  const loadPractices = () => {
    supabase.from('practices').select('*').eq('season_id', season.id).order('date')
      .then(({ data, error }) => { if (!error) setPractices(data); });
  };

  useEffect(() => {
    loadPractices();
    supabase.from('players').select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setPlayers(data); });
  }, [season.id, team.id]);

  const addPractice = async () => {
    if (!date) return;
    const { error } = await supabase.from('practices').insert({
      season_id: season.id,
      date,
      time: time || null,
      location: location || null,
      practice_number: practiceNumber ? parseInt(practiceNumber, 10) : null,
      plan: { segments: { 'Pre-Practice': [], 'Offense': [], 'Defense': [] } },
    });
    if (error) {
      alert('Error adding practice: ' + error.message);
      return;
    }
    setDate(''); setTime(''); setLocation(''); setPracticeNumber('');
    loadPractices();
  };

  const removePractice = async (id) => {
    await supabase.from('practices').delete().eq('id', id);
    loadPractices();
  };

  if (editingId) {
    const entry = practices.find(p => p.id === editingId);
    if (!entry) { setEditingId(null); return null; }
    return (
      <PracticePlanBuilder
        team={team}
        entry={entry}
        onClose={() => { setEditingId(null); loadPractices(); }}
      />
    );
  }

  if (scrimmageId) {
    const entry = practices.find(p => p.id === scrimmageId);
    if (!entry) { setScrimmageId(null); return null; }
    return (
      <ScrimmageTagger
        team={team}
        practice={entry}
        players={players}
        onSave={() => loadPractices()}
        onClose={() => { setScrimmageId(null); loadPractices(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ border: `1px solid ${COLORS.border}`, padding: 12, marginBottom: 20, borderRadius: 8, background: COLORS.navyMid }}>
        <h4 style={{ marginTop: 0, color: COLORS.text }}>Schedule a Practice</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: 8, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ padding: 8, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)}
            style={{ padding: 8, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, flex: 1, minWidth: 120 }} />
          <input type="number" placeholder="No." value={practiceNumber} onChange={e => setPracticeNumber(e.target.value)}
            style={{ padding: 8, width: 60, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addPractice} disabled={!date}
            style={{ padding: '8px 16px', background: date ? COLORS.gold : COLORS.navyDark, color: date ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: date ? 'pointer' : 'default' }}>
            + Add
          </button>
        </div>
      </div>

      <h4 style={{ color: COLORS.text }}>Practices</h4>
      {practices.map(p => {
        const hasScrimmage = !!p.plan?.scrimmage?.started;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${COLORS.border}`, padding: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setEditingId(p.id)}
              style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: COLORS.text }}>
              <span style={{ fontWeight: 700 }}>{p.date}{p.time ? ` · ${p.time}` : ''}{p.practice_number ? ` · Practice #${p.practice_number}` : ''}</span>
              <span style={{ fontSize: 12, color: COLORS.muted }}>{p.location || 'No location set'}</span>
            </button>
            <button onClick={() => setScrimmageId(p.id)}
              style={{ padding: '6px 10px', background: hasScrimmage ? 'rgba(200,168,75,0.12)' : 'rgba(255,255,255,0.07)', border: `1px solid ${hasScrimmage ? COLORS.gold : COLORS.border}`, color: hasScrimmage ? COLORS.gold : COLORS.text, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              🏀 {hasScrimmage ? 'Resume' : 'Scrimmage'}
            </button>
            <button onClick={() => removePractice(p.id)}
              style={{ padding: '6px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
              Delete
            </button>
          </div>
        );
      })}
      {practices.length === 0 && <p style={{ color: COLORS.muted }}>No practices scheduled yet.</p>}
    </div>
  );
}