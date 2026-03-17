import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import NavBar from './components/NavBar';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import AuthPage from './pages/AuthPage';
import InboxPage from './pages/InboxPage';
import TeamsPage from './pages/TeamsPage';
import TeamBoardPage from './pages/TeamBoardPage';
import AdminPage from './pages/AdminPage';
import './App.css';

export default function App() {
  const auth = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState({ name: 'my-tasks' });

  useEffect(() => {
    if (auth.user && currentView.name === 'my-tasks') {
      fetchTasks();
    }
  }, [auth.user, currentView.name]);

  async function fetchTasks() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/tasks', {}, auth.token);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTask(taskData) {
    setError('');
    try {
      const task = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
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
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(id) {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }, auth.token);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleComplete(id, completed) {
    await updateTask(id, { completed: !completed });
  }

  if (!auth.user) return <AuthPage />;

  function renderView() {
    switch (currentView.name) {
      case 'inbox':
        return <InboxPage />;
      case 'teams':
        return <TeamsPage setCurrentView={setCurrentView} />;
      case 'team-board':
        return (
          <TeamBoardPage
            teamId={currentView.teamId}
            teamName={currentView.teamName}
            setCurrentView={setCurrentView}
          />
        );
      case 'admin':
        return auth.user?.is_admin ? <AdminPage /> : null;
      default: // 'my-tasks'
        return (
          <main className="app-main">
            {error && <div className="app-error">{error}</div>}
            <TaskForm onSubmit={createTask} />
            {loading ? (
              <div className="app-loading">
                <div className="app-loading__spinner" />
                <p>Loading tasks...</p>
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
              />
            )}
          </main>
        );
    }
  }

  return (
    <div className="app">
      <NavBar currentView={currentView} setCurrentView={setCurrentView} />
      {renderView()}
    </div>
  );
}
