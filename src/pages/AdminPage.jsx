import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import './AdminPage.css';

export default function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const endpoints = {
      users: '/api/admin/users',
      tasks: '/api/admin/tasks',
      teams: '/api/admin/teams',
    };
    apiFetch(endpoints[tab], {}, auth.token)
      .then(data => {
        if (tab === 'users') setUsers(data);
        else if (tab === 'tasks') setTasks(data);
        else setTeams(data);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [tab]);

  async function deleteItem(type, id) {
    if (!window.confirm(`Delete this ${type}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/admin/${type}s/${id}`, { method: 'DELETE' }, auth.token);
      if (type === 'user') setUsers(prev => prev.filter(u => u.id !== id));
      else if (type === 'task') setTasks(prev => prev.filter(t => t.id !== id));
      else setTeams(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2 className="admin-page__title">Admin Dashboard</h2>
      </div>

      <div className="admin-page__tabs">
        {['users', 'tasks', 'teams'].map(t => (
          <button
            key={t}
            className={`admin-page__tab ${tab === t ? 'admin-page__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="admin-page__error">{error}</p>}

      {loading ? (
        <p className="admin-page__loading">Loading...</p>
      ) : (
        <div className="admin-page__table-wrap">
          {tab === 'users' && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Username</th><th>Email</th><th>Admin</th><th>Tasks</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>@{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.is_admin ? '✅' : '—'}</td>
                    <td>{u.task_count}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {u.id !== auth.user?.id && (
                        <button className="admin-table__delete" onClick={() => deleteItem('user', u.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'tasks' && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Title</th><th>Creator</th><th>Assignee</th><th>Done</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.title}</td>
                    <td>@{t.creator_username}</td>
                    <td>{t.assignee_username ? `@${t.assignee_username}` : '—'}</td>
                    <td>{t.completed ? '✅' : '—'}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td><button className="admin-table__delete" onClick={() => deleteItem('task', t.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'teams' && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Owner</th><th>Members</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td>@{t.owner_username}</td>
                    <td>{t.member_count}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td><button className="admin-table__delete" onClick={() => deleteItem('team', t.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
