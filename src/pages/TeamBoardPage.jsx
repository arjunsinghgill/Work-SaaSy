import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import './TeamBoardPage.css';

export default function TeamBoardPage({ teamId, teamName, setCurrentView }) {
  const auth = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addMemberUsername, setAddMemberUsername] = useState('');
  const [addMemberError, setAddMemberError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/tasks?team_id=${teamId}`, {}, auth.token),
      apiFetch(`/api/teams/${teamId}/members`, {}, auth.token),
    ]).then(([tasksData, membersData]) => {
      setTasks(tasksData);
      setMembers(membersData);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [teamId]);

  async function createTask(taskData) {
    try {
      const task = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...taskData, team_id: teamId }),
      }, auth.token);
      setTasks(prev => [task, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTask(id, updates) {
    try {
      const updated = await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }, auth.token);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {}
  }

  async function deleteTask(id) {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }, auth.token);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {}
  }

  async function toggleComplete(id, completed) {
    await updateTask(id, { completed: !completed });
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!addMemberUsername.trim()) return;
    setAddMemberError('');
    try {
      await apiFetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ username: addMemberUsername.trim() }),
      }, auth.token);
      const newMembers = await apiFetch(`/api/teams/${teamId}/members`, {}, auth.token);
      setMembers(newMembers);
      setAddMemberUsername('');
    } catch (err) {
      setAddMemberError(err.message);
    }
  }

  async function handleRemoveMember(userId) {
    try {
      await apiFetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' }, auth.token);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {}
  }

  if (loading) return <div className="team-board__loading">Loading team board...</div>;

  const isOwner = members.find(m => m.id === auth.user?.id)?.role === 'owner';

  return (
    <div className="team-board">
      <div className="team-board__header">
        <button className="team-board__back" onClick={() => setCurrentView({ name: 'teams' })}>
          ← Teams
        </button>
        <h2 className="team-board__title">{teamName}</h2>
      </div>

      {error && <p className="team-board__error">{error}</p>}

      <div className="team-board__layout">
        <div className="team-board__main">
          <TaskForm onSubmit={createTask} teamMembers={members} />
          <TaskList
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        </div>

        <aside className="team-board__sidebar">
          <div className="team-board__members">
            <h3 className="team-board__members-title">Members ({members.length})</h3>
            <ul className="team-board__members-list">
              {members.map(m => (
                <li key={m.id} className="team-board__member">
                  <span className="team-board__member-name">
                    @{m.username}
                    {m.role === 'owner' && <span className="team-board__owner-badge">owner</span>}
                  </span>
                  {(isOwner || auth.user?.is_admin) && m.id !== auth.user?.id && (
                    <button
                      className="team-board__remove-btn"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {(isOwner || auth.user?.is_admin) && (
              <form className="team-board__add-member" onSubmit={handleAddMember}>
                <input
                  className="team-board__add-input"
                  placeholder="Add by username..."
                  value={addMemberUsername}
                  onChange={e => setAddMemberUsername(e.target.value)}
                />
                <button className="team-board__add-btn" type="submit">Add</button>
                {addMemberError && <p className="team-board__add-error">{addMemberError}</p>}
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
