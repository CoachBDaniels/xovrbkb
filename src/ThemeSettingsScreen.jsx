import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';

const DEFAULT_THEME_VALUES = {
  teamName: 'Briarwood Lions',
  abbr: 'BCS',
  navy: '#1a3a6b',
  navyDark: '#0d1b2e',
  navyMid: '#162d50',
  border: '#243d6b',
  gold: '#c8a84b',
  text: '#e8edf5',
  muted: '#8a99b8',
  green: '#15803d',
  red: '#b91c1c',
  court: '#c8922a',
  lane: '#a06414',
  statPosBg: '#1e4d2e',
  statPosBorder: '#15803d',
  statPosText: '#15803d',
  statNegBg: '#4d1e1e',
  statNegBorder: '#b91c1c',
  statNegText: '#b91c1c',
  playerBtnBg: '#162d50',
  playerBtnText: '#e8edf5',
  logo: null,
  homeLogo: null,
  homeLogoSize: 96,
  homeBg: null,
};

const THEME_PRESETS = [
  { name: 'Lions', navy: '#1a3a6b', gold: '#c8a84b', navyDark: '#0d1b2e', navyMid: '#162d50', border: '#243d6b', court: '#c8922a', lane: '#a06414' },
  { name: 'Yellow Jackets', navy: '#1a1a1a', gold: '#f0d000', navyDark: '#0a0a0a', navyMid: '#1f1f1f', border: '#333333', court: '#c8922a', lane: '#a06414' },
  { name: 'Warriors', navy: '#3b1a6b', gold: '#c0c0c8', navyDark: '#150a28', navyMid: '#241340', border: '#382060', court: '#c8922a', lane: '#a06414' },
  { name: 'Bulls', navy: '#1a1a1a', gold: '#d4302f', navyDark: '#0a0a0a', navyMid: '#1f1f1f', border: '#333333', court: '#c8922a', lane: '#a06414' },
  { name: 'Tigers', navy: '#0e4a7a', gold: '#ff8c3a', navyDark: '#061826', navyMid: '#0e2e44', border: '#164466', court: '#c8922a', lane: '#a06414' },
  { name: 'Blue Devils', navy: '#1a3a8c', gold: '#e8edf5', navyDark: '#0a1430', navyMid: '#142450', border: '#1f3470', court: '#c8922a', lane: '#a06414' },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ThemeSettingsScreen({ team, role }) {
  const { colors: COLORS, refreshTheme } = useTheme();
  const [orgId, setOrgId] = useState(null);
  const [rowId, setRowId] = useState(null);
  const [values, setValues] = useState(DEFAULT_THEME_VALUES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [productLogo, setProductLogo] = useState(null);
  const [productLogoRowId, setProductLogoRowId] = useState(null);
  const [productLogoSaving, setProductLogoSaving] = useState(false);
  const canEdit = role === 'head_coach';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: teamRow, error: teamErr } = await supabase
        .from('teams').select('organization_id').eq('id', team.id).single();
      if (teamErr || !teamRow?.organization_id) {
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setOrgId(teamRow.organization_id);

      const { data: themeRow } = await supabase
        .from('theme_settings').select('*').eq('organization_id', teamRow.organization_id).maybeSingle();
      if (cancelled) return;
      if (themeRow) {
        setRowId(themeRow.id);
        setValues({ ...DEFAULT_THEME_VALUES, ...(themeRow.theme || {}) });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [team.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
      if (cancelled) return;
      if (data) {
        setProductLogoRowId(data.id);
        setProductLogo(data.product_logo || null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const applyPreset = (preset) => {
    setValues(prev => ({ ...prev, ...preset }));
  };

  const handleLogoUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setField(key, dataUrl);
  };

  const saveProductLogo = async (dataUrl) => {
    setProductLogoSaving(true);
    setProductLogo(dataUrl);
    let error;
    if (productLogoRowId) {
      const { error: updErr } = await supabase.from('app_settings').update({ product_logo: dataUrl, updated_at: new Date().toISOString() }).eq('id', productLogoRowId);
      error = updErr;
    } else {
      const { data, error: insErr } = await supabase.from('app_settings').insert({ product_logo: dataUrl }).select().single();
      error = insErr;
      if (data) setProductLogoRowId(data.id);
    }
    setProductLogoSaving(false);
    if (error) alert('Error saving product logo: ' + error.message);
  };

  const handleProductLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    saveProductLogo(dataUrl);
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    setSavedMsg('');
    let error;
    if (rowId) {
      const { error: updErr } = await supabase.from('theme_settings').update({ theme: values, updated_at: new Date().toISOString() }).eq('id', rowId);
      error = updErr;
    } else {
      const { data, error: insErr } = await supabase.from('theme_settings').insert({ organization_id: orgId, theme: values }).select().single();
      error = insErr;
      if (data) setRowId(data.id);
    }
    setSaving(false);
    if (error) {
      setSavedMsg('Error: ' + error.message);
    } else {
      setSavedMsg('Saved!');
      await refreshTheme();
    }
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading theme...</p>;
  if (!orgId) return <p style={{ color: COLORS.red }}>This team isn't linked to an organization yet, so theme settings can't be saved. Check the teams table's organization_id column.</p>;
  if (!canEdit) return <p style={{ color: COLORS.muted }}>Only a head coach can edit theme settings.</p>;

  const colorField = (label, key) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <input type="color" value={values[key] || '#000000'} onChange={e => setField(key, e.target.value)} style={{ width: 44, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
      <span style={{ fontSize: 13, color: COLORS.text, width: 130 }}>{label}</span>
      <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>{values[key]}</span>
    </div>
  );

  return (
    <div>
      <h4 style={{ color: COLORS.gold, marginBottom: 16 }}>Theme & Branding</h4>

      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>App Branding</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>Shown in the header banner for every team — this is the app's own logo, separate from your team logo.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {productLogo
            ? <img src={productLogo} alt="" style={{ height: 36, width: 'auto', maxWidth: 140, objectFit: 'contain', border: `1px solid ${COLORS.border}`, borderRadius: 6, background: COLORS.navyDark, padding: 4 }} />
            : <div style={{ height: 36, width: 70, borderRadius: 6, background: COLORS.navyMid, border: `1px solid ${COLORS.border}` }} />}
          <label style={{ padding: '8px 14px', background: COLORS.gold, color: COLORS.textDark, borderRadius: 7, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
            {productLogoSaving ? 'Saving…' : 'Upload App Logo'}
            <input type="file" accept="image/*" onChange={handleProductLogoUpload} style={{ display: 'none' }} />
          </label>
          {productLogo && <button onClick={() => saveProductLogo(null)} style={{ padding: '8px 12px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Remove</button>}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Team Identity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          <input placeholder="Team name" value={values.teamName} onChange={e => setField('teamName', e.target.value)}
            style={{ padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
          <input placeholder="Abbreviation (e.g. BCS)" value={values.abbr} onChange={e => setField('abbr', e.target.value.toUpperCase().slice(0, 4))}
            style={{ padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, width: 160 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {values.logo
            ? <img src={values.logo} alt="logo" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', border: `1px solid ${COLORS.border}` }} />
            : <div style={{ width: 46, height: 46, borderRadius: 10, background: COLORS.navyMid, border: `1px solid ${COLORS.border}` }} />}
          <label style={{ padding: '8px 14px', background: COLORS.gold, color: COLORS.textDark, borderRadius: 7, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
            Upload Team Logo
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'logo')} style={{ display: 'none' }} />
          </label>
          {values.logo && <button onClick={() => setField('logo', null)} style={{ padding: '8px 12px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Remove</button>}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Color Presets</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {THEME_PRESETS.map(preset => (
            <button key={preset.name} onClick={() => applyPreset(preset)}
              style={{ padding: '8px 12px', borderRadius: 7, border: `1px solid ${preset.gold}`, background: preset.navy, color: preset.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Colors</div>
        {colorField('Primary (Navy)', 'navy')}
        {colorField('Background (Dark)', 'navyDark')}
        {colorField('Card Background', 'navyMid')}
        {colorField('Border', 'border')}
        {colorField('Accent (Gold)', 'gold')}
        {colorField('Text', 'text')}
        {colorField('Muted Text', 'muted')}
        {colorField('Positive (Green)', 'green')}
        {colorField('Negative (Red)', 'red')}
        {colorField('Court Floor', 'court')}
        {colorField('Court Lane', 'lane')}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Stat Buttons — Positive</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>Made shots, rebounds, assists, steals, etc.</div>
        {colorField('Background', 'statPosBg')}
        {colorField('Border', 'statPosBorder')}
        {colorField('Text', 'statPosText')}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Stat Buttons — Negative</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>Missed shots, turnovers, fouls, etc.</div>
        {colorField('Background', 'statNegBg')}
        {colorField('Border', 'statNegBorder')}
        {colorField('Text', 'statNegText')}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Player Buttons (On-Court)</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>Resting/unselected state — EFF and minutes always match the box score colors.</div>
        {colorField('Background', 'playerBtnBg')}
        {colorField('Number & Name Text', 'playerBtnText')}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>Home Screen</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>Separate from your main Team Logo - no square crop.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 70, height: 70, borderRadius: 10, background: values.homeBg || COLORS.navyDark, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLORS.border}` }}>
            {values.homeLogo && <img src={values.homeLogo} alt="" style={{ width: '70%', height: 'auto' }} />}
          </div>
          <label style={{ padding: '8px 14px', background: COLORS.gold, color: COLORS.textDark, borderRadius: 7, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
            Upload Home Logo
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'homeLogo')} style={{ display: 'none' }} />
          </label>
          {values.homeLogo && <button onClick={() => setField('homeLogo', null)} style={{ padding: '8px 12px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Reset to Default</button>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 4 }}>Logo Size: {values.homeLogoSize}px</div>
          <input type="range" min="50" max="160" value={values.homeLogoSize} onChange={e => setField('homeLogoSize', parseInt(e.target.value, 10))} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={values.homeBg || COLORS.navyDark} onChange={e => setField('homeBg', e.target.value)} style={{ width: 44, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: COLORS.text }}>Background Color</span>
          {values.homeBg && <button onClick={() => setField('homeBg', null)} style={{ padding: '4px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Reset to Default</button>}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ padding: '12px 24px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : 'Save Theme'}
      </button>
      {savedMsg && <span style={{ marginLeft: 14, color: savedMsg.startsWith('Error') ? COLORS.red : COLORS.green, fontWeight: 700 }}>{savedMsg}</span>}
    </div>
  );
}