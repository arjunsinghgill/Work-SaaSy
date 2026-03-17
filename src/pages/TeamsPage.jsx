import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import './TeamsPage.css';

export default function TeamsPage({ setCurrentView }) {
  const auth = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teams', {}, auth.token)
      .then(data => { setTeams(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const team = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName.trim() }),
      }, auth.token);
      setTeams(prev => [team, ...prev]);
      setNewTeamName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(teamId) {
    if (!window.confirm('Delete this team? This will remove all team tasks.')) return;
    try {
      await apiFetch(`/api/teams/${teamId}`, { method: 'DELETE' }, auth.token);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="teams-page">
      <div className="teams-page__header">
        <h2 className="teams-page__title">Teams</h2>
      </div>

      <form className="teams-page__form" onSubmit={handleCreate}>
        <input
          className="teams-page__input"
          type="text"
          placeholder="New team name..."
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
        <button className="teams-page__create-btn" type="submit" disabled={creating || !newTeamName.trim()}>
          {creating ? 'Creating...' : '+ Create Team'}
        </button>
      </form>

      {error && <p className="teams-page__error">{error}</p>}

      {loading ? (
        <p className="teams-page__loading">Loading teams...</p>
      ) : teams.length === 0 ? (
        <div className="teams-page__empty">
          <p>You&apos;re not in any teams yet.</p>
          <p>Create a team above to get started.</p>
        </div>
      ) : (
        <ul className="teams-page__list">
          {teams.map(team => (
            <li key={team.id} className="teams-page__item">
              <button
                className="teams-page__team-btn"
                onClick={() => setCurrentView({ name: 'team-board', teamId: team.id, teamName: team.name })}
              >
                <span className="teams-page__team-name">{team.name}</span>
                <span className="teams-page__team-meta">
                  {team.member_count} member{team.member_count !== 1 ? 's' : ''} · @{team.owner_username}
                </span>
              </button>
              {(team.owner_id === auth.user?.id || auth.user?.is_admin) && (
                <button className="teams-page__delete-btn" onClick={() => handleDelete(team.id)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
