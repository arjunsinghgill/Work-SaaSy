import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './NavBar.css';

export default function NavBar({ currentView, setCurrentView }) {
  const auth = useAuth();

  const navItems = [
    { key: 'my-tasks', label: 'My Tasks' },
    { key: 'inbox', label: 'Inbox' },
    { key: 'teams', label: 'Teams' },
    ...(auth.user?.is_admin ? [{ key: 'admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="navbar">
      <div className="navbar__left">
        <h1 className="navbar__brand">Work-SaaSy</h1>
        <nav className="navbar__nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`navbar__nav-btn ${currentView.name === item.key ? 'navbar__nav-btn--active' : ''}`}
              onClick={() => setCurrentView({ name: item.key })}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="navbar__right">
        <NotificationBell />
        <span className="navbar__username">@{auth.user?.username}</span>
        <button className="navbar__logout-btn" onClick={auth.logout}>Logout</button>
      </div>
    </header>
  );
}
