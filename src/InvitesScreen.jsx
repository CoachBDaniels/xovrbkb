import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';

const ROLE_LABELS = { head_coach: 'Head Coach', assistant: 'Coach', player: 'Player' };

export default function InvitesScreen({ team }) {
  const { colors: COLORS } = useTheme();
  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('assistant');
  const [lastInviteLink, setLastInviteLink] = useState(null);
  const [error, setError] = useState('');

  const loadInvites = () => {
    supabase.from('team_invites').select('*').eq('team_id', team.id).is('accepted_at', null).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error) setInvites(data); });
  };
  const loadMembers = () => {
    supabase.from('team_memberships').select('id, role, user_id').eq('team_id', team.id)
      .then(({ data, error }) => { if (!error) setMembers(data); });
  };

  useEffect(() => { loadInvites(); loadMembers(); }, [team.id]);

  const sendInvite = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const { data, error: insErr } = await supabase.from('team_invites').insert({
      team_id: team.id, email: trimmed, role,
    }).select().single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    const link = `${window.location.origin}${window.location.pathname}?invite=${data.id}`;
    setLastInviteLink(link);
    setEmail('');
    loadInvites();
  };

  const revokeInvite = async (id) => {
    await supabase.from('team_invites').delete().eq('id', id);
    loadInvites();
  };

  const removeMember = async (id) => {
    await supabase.from('team_memberships').delete().eq('id', id);
    loadMembers();
  };

  const copyLink = (link) => {
    navigator.clipboard?.writeText(link);
  };

  return (
    <div>
      <h4 style={{ color: COLORS.gold, marginBottom: 12 }}>Invite Someone</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }} />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: 8, background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text }}>
          <option value="head_coach">Head Coach</option>
          <option value="assistant">Coach</option>
          <option value="player">Player</option>
        </select>
        <button onClick={sendInvite} disabled={!email.trim()}
          style={{ padding: '8px 16px', background: email.trim() ? COLORS.gold : COLORS.navyMid, color: email.trim() ? COLORS.textDark : COLORS.muted, border: 'none', borderRadius: 7, fontWeight: 'bold', cursor: email.trim() ? 'pointer' : 'default' }}>
          Create Invite
        </button>
      </div>
      {error && <p style={{ color: COLORS.red, fontSize: 13 }}>{error}</p>}

      {lastInviteLink && (
        <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.gold}`, borderRadius: 9, padding: '10px 12px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 700, marginBottom: 6 }}>Invite created! Send this link to them:</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={lastInviteLink} onFocus={e => e.target.select()}
              style={{ flex: 1, padding: 6, background: COLORS.navyDark, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontSize: 12 }} />
            <button onClick={() => copyLink(lastInviteLink)} style={{ padding: '6px 12px', background: COLORS.gold, color: COLORS.textDark, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Copy</button>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
            They'll need to sign up or sign in using this exact email address for the invite to be claimed automatically.
          </div>
        </div>
      )}

      <h4 style={{ color: COLORS.gold, marginBottom: 12 }}>Pending Invites</h4>
      {invites.map(inv => {
        const link = `${window.location.origin}${window.location.pathname}?invite=${inv.id}`;
        return (
          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${COLORS.border}`, padding: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: COLORS.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>{ROLE_LABELS[inv.role] || inv.role}</div>
            </div>
            <button onClick={() => copyLink(link)} style={{ padding: '6px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Copy Link</button>
            <button onClick={() => revokeInvite(inv.id)} style={{ padding: '6px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Revoke</button>
          </div>
        );
      })}
      {invites.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>No pending invites.</p>}

      <h4 style={{ color: COLORS.gold, marginTop: 24, marginBottom: 12 }}>Team Members</h4>
      {members.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${COLORS.border}`, padding: 8 }}>
          <div style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>{ROLE_LABELS[m.role] || m.role}</div>
          <button onClick={() => removeMember(m.id)} style={{ padding: '6px 10px', background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.red, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
      ))}
      {members.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>No members found.</p>}
    </div>
  );
}