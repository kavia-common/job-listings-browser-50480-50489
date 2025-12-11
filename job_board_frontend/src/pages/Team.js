import React, { useMemo, useState } from 'react';
import {
  addMember,
  getActiveMember,
  getTeam,
  listMembers,
  removeMember,
  setActiveMember,
  updateMember,
} from '../utils/team';
import { theme as themeObj } from '../theme';

function Team() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [refreshKey, setRefreshKey] = useState(0);

  const team = getTeam();
  const members = listMembers();
  const active = getActiveMember();

  const styles = useMemo(
    () => ({
      container: { padding: 16, maxWidth: 900, margin: '0 auto' },
      card: {
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: 16,
      },
      header: { fontSize: 20, fontWeight: 700, color: themeObj.colors.text },
      sub: { color: '#6b7280' },
      input: {
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        outline: 'none',
      },
      select: {
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        outline: 'none',
      },
      button: {
        background: themeObj.colors.primary,
        color: '#fff',
        border: 'none',
        padding: '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
      },
      danger: { background: '#EF4444' },
      secondary: { background: themeObj.colors.secondary, color: '#111827' },
      badge: {
        background: `${themeObj.colors.primary}1a`,
        color: themeObj.colors.primary,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      },
      row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #f3f4f6',
      },
    }),
    []
  );

  const onAdd = (e) => {
    e.preventDefault();
    try {
      addMember({ name: name.trim(), email: email.trim(), role });
      setName('');
      setEmail('');
      setRole('Member');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const onRemove = (id) => {
    // Only admins can remove
    if (active?.role !== 'Admin') {
      alert('Only Admin can remove members');
      return;
    }
    removeMember(id);
    setRefreshKey((k) => k + 1);
  };

  const onMakeActive = (id) => {
    try {
      setActiveMember(id);
      setRefreshKey((k) => k + 1);
      window.location.reload();
    } catch (e) {
      // ignore
    }
  };

  const onToggleRole = (m) => {
    if (active?.role !== 'Admin') {
      alert('Only Admin can change roles');
      return;
    }
    const nextRole = m.role === 'Admin' ? 'Member' : 'Admin';
    updateMember(m.id, { role: nextRole });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={styles.container} key={refreshKey}>
      <div style={styles.card}>
        <div style={styles.header}>Your Team</div>
        <div className="mt-1" style={styles.sub}>
          Team-based job management lets any team member manage team-owned jobs.
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={styles.badge}>
            {team ? `Team ID: ${team.id}` : 'No team yet'}
          </span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>Add Member</div>
        <form onSubmit={onAdd} style={{ marginTop: 10, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr 160px 140px' }}>
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
          <input
            required
            type="email"
            placeholder="email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.select}>
            <option>Member</option>
            <option>Admin</option>
          </select>
          <button type="submit" style={styles.button}>Add member</button>
        </form>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>Members</div>
        <div>
          {members.length === 0 && (
            <div style={{ color: '#6b7280', padding: '10px 0' }}>
              No members yet. Add your first teammate above.
            </div>
          )}
          {members.map((m) => (
            <div key={m.id} style={styles.row}>
              <div>
                <div style={{ fontWeight: 600, color: themeObj.colors.text }}>
                  {m.name}{' '}
                  {active?.id === m.id && (
                    <span style={{ ...styles.badge, marginLeft: 6 }}>Active</span>
                  )}
                </div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>{m.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onMakeActive(m.id)}
                  style={{ ...styles.button, ...styles.secondary }}
                  title="Switch active member"
                >
                  Set Active
                </button>
                <button
                  onClick={() => onToggleRole(m)}
                  style={{ ...styles.button }}
                  title="Toggle role"
                >
                  {m.role}
                </button>
                <button
                  onClick={() => onRemove(m.id)}
                  style={{ ...styles.button, ...styles.danger }}
                  title="Remove member"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>Tips</div>
        <ul style={{ color: '#374151', marginLeft: 18 }}>
          <li>Jobs created while a team exists will be automatically team-owned.</li>
          <li>Any active team member can edit, pause, or delete team-owned jobs.</li>
        </ul>
      </div>
    </div>
  );
}

export default Team;
