import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import TaskList from '../components/TaskList';
import './InboxPage.css';

export default function InboxPage() {
  const auth = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/tasks?view=inbox', {}, auth.token)
      .then(data => { setTasks(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function toggleComplete(id, completed) {
    try {
      const updated = await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: !completed }),
      }, auth.token);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {}
  }

  if (loading) return <div className="inbox-page__loading">Loading inbox...</div>;

  return (
    <div className="inbox-page">
      <div className="inbox-page__header">
        <h2 className="inbox-page__title">Inbox</h2>
        <p className="inbox-page__subtitle">Tasks assigned to you by others</p>
      </div>
      {error && <div className="inbox-page__error">{error}</div>}
      {tasks.length === 0 ? (
        <div className="inbox-page__empty">
          <p>Your inbox is empty.</p>
          <p>When someone assigns you a task, it will appear here.</p>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onToggleComplete={toggleComplete}
          onUpdateTask={() => {}}
          onDeleteTask={() => {}}
        />
      )}
    </div>
  );
}
