import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { COLORS } from './theme';
import { STAT_DEFS, GROUPS, applyStatDefs } from './GameReports';

function SimpleLibrary({ team, role, table, label }) {
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const canEdit = role === 'head_coach';

  const loadItems = () => {
    supabase.from(table).select('*').eq('team_id', team.id).order('created_at')
      .then(({ data, error }) => { if (!error) setItems(data); });
  };

  useEffect(() => { loadItems(); }, [team.id, table]);

  const addItem = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from(table).insert({ team_id: team.id, name: newName.trim() });
    if (!error) { setNewName(''); loadItems(); }
  };

  const removeItem = async (id) => {
    await supabase.from(table).delete().eq('id', id);
    loadItems();
  };

  return (
    <div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder={`e.g. "${label === 'Drill Library' ? '3-Man Weave' : 'Triangle Offense'}"`} value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <button onClick={addItem} style={{ padding: '8px 16px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
        </div>
      )}
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ flex: 1 }}>{item.name}</span>
          {canEdit && <button onClick={() => removeItem(item.id)} style={{ color: COLORS.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>}
        </div>
      ))}
      {items.length === 0 && <p style={{ color: COLORS.muted }}>No {label.toLowerCase()} entries yet.</p>}
    </div>
  );
}

function StatCategoriesEditor({ team, role }) {
  const [rowId, setRowId] = useState(null);
  const [defs, setDefs] = useState(STAT_DEFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddStat, setShowAddStat] = useState(false);
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatIsSpecial, setNewStatIsSpecial] = useState(false);
  const [newStatGroup, setNewStatGroup] = useState('Plus');
  const [newStatValue, setNewStatValue] = useState(1);
  const [newStatNegValue, setNewStatNegValue] = useState(-1);
  const canEdit = role === 'head_coach';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('team_stat_defs').select('*').eq('team_id', team.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        setRowId(data.id);
        if (data.stat_defs && data.stat_defs.length > 0) {
          applyStatDefs(data.stat_defs);
          setDefs([...STAT_DEFS]);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [team.id]);

  const persist = async (nextDefs) => {
    setSaving(true);
    applyStatDefs(nextDefs);
    setDefs([...STAT_DEFS]);
    let error;
    if (rowId) {
      const { error: updErr } = await supabase.from('team_stat_defs').update({ stat_defs: STAT_DEFS, updated_at: new Date().toISOString() }).eq('id', rowId);
      error = updErr;
    } else {
      const { data, error: insErr } = await supabase.from('team_stat_defs').insert({ team_id: team.id, stat_defs: STAT_DEFS }).select().single();
      error = insErr;
      if (data) setRowId(data.id);
    }
    setSaving(false);
    if (error) alert('Error saving stat categories: ' + error.message);
  };

  const setStatValue = (key, value) => {
    const next = STAT_DEFS.map(d => d.key === key ? { ...d, value } : d);
    persist(next);
  };

  const setStatAbbr = (key, abbr) => {
    const next = STAT_DEFS.map(d => d.key === key ? { ...d, abbr } : d);
    persist(next);
  };

  const removeStat = (key) => {
    const target = STAT_DEFS.find(d => d.key === key);
    if (!target) return;
    const keysToRemove = target.pairId ? STAT_DEFS.filter(d => d.pairId === target.pairId).map(d => d.key) : [key];
    const next = STAT_DEFS.filter(d => !keysToRemove.includes(d.key));
    persist(next);
  };

  const addStat = () => {
    if (!newStatLabel.trim()) return;
    const slug = newStatLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (newStatIsSpecial) {
      const pairId = `custom_${slug}`;
      const posDef = { key: `${pairId}_pos`, label: `Good ${newStatLabel.trim()}`, abbr: newStatLabel.trim().slice(0, 5).toUpperCase() + '+', value: Math.abs(newStatValue), group: 'Special', pairId };
      const negDef = { key: `${pairId}_neg`, label: `Bad ${newStatLabel.trim()}`, abbr: newStatLabel.trim().slice(0, 5).toUpperCase() + '-', value: -Math.abs(newStatNegValue), group: 'Special', pairId };
      persist([...STAT_DEFS, posDef, negDef]);
    } else {
      const def = { key: `custom_${slug}`, label: newStatLabel.trim(), abbr: newStatLabel.trim().slice(0, 5).toUpperCase(), value: newStatValue, group: newStatGroup };
      persist([...STAT_DEFS, def]);
    }
    setNewStatLabel('');
    setNewStatValue(1);
    setNewStatNegValue(-1);
    setNewStatIsSpecial(false);
    setShowAddStat(false);
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading stat categories...</p>;
  if (!canEdit) return <p style={{ color: COLORS.muted }}>Only a head coach can edit stat categories.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Stat Categories</div>
        <button onClick={() => setShowAddStat(v => !v)} style={{ padding: '7px 13px', background: showAddStat ? 'rgba(200,168,75,0.15)' : COLORS.gold, border: `1px solid ${COLORS.gold}`, borderRadius: 8, color: showAddStat ? COLORS.gold : COLORS.textDark, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {showAddStat ? 'Cancel' : '+ Add Stat'}
        </button>
      </div>

      {saving && <div style={{ fontSize: 11, color: COLORS.gold, marginBottom: 10 }}>Saving…</div>}

      {showAddStat && (
        <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.gold}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>New Stat</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input placeholder="Stat name (e.g. Help Rotation)" value={newStatLabel} onChange={e => setNewStatLabel(e.target.value)}
              style={{ background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none' }} />

            <button onClick={() => setNewStatIsSpecial(s => !s)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, border: `1px solid ${newStatIsSpecial ? COLORS.gold : COLORS.border}`, background: newStatIsSpecial ? 'rgba(200,168,75,0.12)' : COLORS.navyDark, cursor: 'pointer' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: newStatIsSpecial ? COLORS.gold : COLORS.text }}>Special (paired +/−)</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>One category, gradeable both ways — e.g. helped (+) or should've helped but didn't (−)</div>
              </div>
              <div style={{ width: 38, height: 22, borderRadius: 11, background: newStatIsSpecial ? COLORS.gold : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, marginLeft: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: newStatIsSpecial ? COLORS.textDark : '#fff', position: 'absolute', top: 2, left: newStatIsSpecial ? 18 : 2, transition: 'left 0.15s' }} />
              </div>
            </button>

            {!newStatIsSpecial && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 5, fontWeight: 600 }}>Group</div>
                  <select value={newStatGroup} onChange={e => setNewStatGroup(e.target.value)}
                    style={{ width: '100%', background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 10px', color: COLORS.text, fontSize: 13, outline: 'none' }}>
                    {GROUPS.filter(g => g !== 'Special').map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 5, fontWeight: 600 }}>Value</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setNewStatValue(v => v - 1)} style={{ width: 34, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: COLORS.red, fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>−</button>
                    <div style={{ width: 36, textAlign: 'center', fontSize: 18, fontWeight: 800, color: newStatValue >= 0 ? COLORS.green : COLORS.red }}>{newStatValue >= 0 ? '+' : ''}{newStatValue}</div>
                    <button onClick={() => setNewStatValue(v => v + 1)} style={{ width: 34, height: 36, borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: COLORS.green, fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>
            )}

            {newStatIsSpecial && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 5, fontWeight: 600 }}>Positive value</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setNewStatValue(v => Math.max(1, v - 1))} style={{ width: 30, height: 34, borderRadius: 7, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: COLORS.green, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>−</button>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: COLORS.green }}>+{Math.abs(newStatValue)}</div>
                    <button onClick={() => setNewStatValue(v => Math.abs(v) + 1)} style={{ width: 30, height: 34, borderRadius: 7, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: COLORS.green, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 5, fontWeight: 600 }}>Negative value</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setNewStatNegValue(v => -(Math.abs(v) + 1))} style={{ width: 30, height: 34, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: COLORS.red, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>−</button>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: COLORS.red }}>−{Math.abs(newStatNegValue)}</div>
                    <button onClick={() => setNewStatNegValue(v => Math.max(1, Math.abs(v) - 1) * -1)} style={{ width: 30, height: 34, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: COLORS.red, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>
            )}

            <button onClick={addStat} style={{ padding: 10, background: COLORS.gold, border: 'none', borderRadius: 9, color: COLORS.textDark, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Add Stat</button>
          </div>
        </div>
      )}

      {GROUPS.map(g => {
        const groupDefs = defs.filter(d => d.group === g);
        if (!groupDefs.length) return null;
        return (
          <div key={g}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gold, letterSpacing: 1, textTransform: 'uppercase', margin: '14px 0 7px' }}>{g}</div>
            {groupDefs.map(def => (
              <div key={def.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{def.label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: COLORS.muted, marginBottom: 2 }}>Abbr</div>
                    <input value={def.abbr || ''} onChange={e => setStatAbbr(def.key, e.target.value.slice(0, 5))}
                      maxLength={5}
                      style={{ width: 52, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '5px 4px', color: COLORS.gold, fontSize: 13, fontWeight: 800, textAlign: 'center', outline: 'none', textTransform: 'uppercase' }} />
                  </div>
                  <button onClick={() => setStatValue(def.key, def.value - 1)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: COLORS.red, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <div style={{ fontSize: 17, fontWeight: 800, color: def.value >= 0 ? COLORS.green : COLORS.red, minWidth: 30, textAlign: 'center' }}>{def.value >= 0 ? '+' : ''}{def.value}</div>
                  <button onClick={() => setStatValue(def.key, def.value + 1)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: COLORS.green, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  {def.key.startsWith('custom_') && (
                    <button onClick={() => removeStat(def.key)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: COLORS.red, borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 2 }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function LibrariesScreen({ team, role }) {
  const [tab, setTab] = useState('drills');
  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: '8px 16px', fontWeight: tab === key ? 'bold' : 'normal',
      background: tab === key ? COLORS.gold : 'rgba(255,255,255,0.08)',
      color: tab === key ? COLORS.textDark : COLORS.text,
      border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`,
      borderRadius: 8, cursor: 'pointer',
    }}>{label}</button>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabBtn('drills', 'Drill Library')}
        {tabBtn('series', 'Series Library')}
        {tabBtn('stats', 'Stat Categories')}
      </div>
      {tab === 'drills' && <SimpleLibrary team={team} role={role} table="drills" label="Drill Library" />}
      {tab === 'series' && <SimpleLibrary team={team} role={role} table="series_calls" label="Series Library" />}
      {tab === 'stats' && <StatCategoriesEditor team={team} role={role} />}
    </div>
  );
}