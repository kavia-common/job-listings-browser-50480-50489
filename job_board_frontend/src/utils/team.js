//
//
// Team utilities for client-side team management using localStorage.
// Provides functions to manage team, members, and active member state.
//
// Storage keys:
// - hr_team: { id, members: [{ id, name, email, role, createdAt }], createdAt }
// - hr_team_active_member: memberId
//
// Team concept:
// - A single team is supported locally. Jobs can be assigned a teamId.
// - Any active member of the same team can manage team-owned jobs.
//

import { getItem, setItem, removeItem } from './storage';

// PUBLIC_INTERFACE
export function getTeam() {
  /** Get current team object from localStorage; if absent returns null. */
  const team = getItem('hr_team');
  return team || null;
}

// PUBLIC_INTERFACE
export function listMembers() {
  /** Return list of members in the current team; [] if no team. */
  const team = getTeam();
  return team?.members || [];
}

// PUBLIC_INTERFACE
export function addMember({ name, email, role = 'Member' }) {
  /**
   * Add a member to the current team, creating a team if needed.
   * Returns the added member object.
   */
  if (!name || !email) {
    throw new Error('Name and email are required');
  }
  // Initialize team if not present
  let team = getTeam();
  if (!team) {
    team = {
      id: `team_${Math.random().toString(36).slice(2, 10)}`,
      members: [],
      createdAt: Date.now(),
    };
  }
  // Ensure unique email
  if (team.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Member with this email already exists');
  }
  const member = {
    id: `m_${Math.random().toString(36).slice(2, 10)}`,
    name,
    email,
    role: role === 'Admin' ? 'Admin' : 'Member',
    createdAt: Date.now(),
  };
  team.members.push(member);
  setItem('hr_team', team);

  // If no active member, set this member as active
  const active = getActiveMember();
  if (!active) {
    setActiveMember(member.id);
  }
  return member;
}

// PUBLIC_INTERFACE
export function removeMember(id) {
  /**
   * Remove a member by id. If removed was active, clear active or switch to first available.
   * Only allowed if there is an Admin in team; UI should restrict but util stays generic.
   */
  const team = getTeam();
  if (!team) return;
  const before = team.members.length;
  team.members = team.members.filter((m) => m.id !== id);
  if (team.members.length !== before) {
    setItem('hr_team', team);
    const active = getActiveMember();
    if (active && active.id === id) {
      if (team.members.length > 0) {
        setActiveMember(team.members[0].id);
      } else {
        // No members, clear active and team completely
        removeItem('hr_team_active_member');
      }
    }
    // If team has no members left, clear the team
    if (team.members.length === 0) {
      removeItem('hr_team');
    }
  }
}

// PUBLIC_INTERFACE
export function updateMember(id, patch) {
  /**
   * Update a member fields by id. Returns updated member or null.
   */
  const team = getTeam();
  if (!team) return null;
  const idx = team.members.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated = { ...team.members[idx], ...patch };
  // enforce role constraints
  if (updated.role !== 'Admin' && updated.role !== 'Member') {
    updated.role = 'Member';
  }
  team.members[idx] = updated;
  setItem('hr_team', team);

  // Keep active pointer intact; if updating the active member, no change required
  return updated;
}

// PUBLIC_INTERFACE
export function setActiveMember(id) {
  /**
   * Set the active member id. Must belong to team.
   * Persists to simulate switching users locally.
   */
  const team = getTeam();
  if (!team) throw new Error('No team exists');
  const exists = team.members.find((m) => m.id === id);
  if (!exists) throw new Error('Member not found in team');
  setItem('hr_team_active_member', id);
  return exists;
}

// PUBLIC_INTERFACE
export function getActiveMember() {
  /** Return active member object or null. */
  const team = getTeam();
  if (!team) return null;
  const activeId = getItem('hr_team_active_member');
  if (!activeId) return null;
  return team.members.find((m) => m.id === activeId) || null;
}

// PUBLIC_INTERFACE
export function isTeamMember(emailOrId) {
  /**
   * Check if provided email or id matches a current team member.
   * Returns boolean.
   */
  if (!emailOrId) return false;
  const team = getTeam();
  if (!team) return false;
  const key = String(emailOrId).toLowerCase();
  return team.members.some(
    (m) => m.id === emailOrId || m.email.toLowerCase() === key
  );
}

// PUBLIC_INTERFACE
export function ensureTeamIdOnJob(job) {
  /**
   * Ensure that a job object includes teamId if a team exists and not already present.
   * Returns updated copy (does not mutate input).
   */
  const team = getTeam();
  if (!job || !team) return job;
  if (job.teamId) return job;
  return { ...job, teamId: team.id };
}

// PUBLIC_INTERFACE
export function jobOwnedByTeam(job) {
  /**
   * Determine if a job is owned by current team by comparing teamId.
   */
  const team = getTeam();
  if (!team || !job) return false;
  return job.teamId && job.teamId === team.id;
}

// PUBLIC_INTERFACE
export function assignJobToTeam(jobId) {
  /**
   * For storage-utils to call when a job is created client-side.
   * Returns teamId if assigned, else null.
   */
  const team = getTeam();
  if (!team) return null;
  return team.id;
}
