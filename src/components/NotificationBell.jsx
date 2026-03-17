import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const auth = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  async function fetchNotifications() {
    try {
      const data = await apiFetch('/api/notifications', {}, auth.token);
      setNotifications(data);
    } catch (err) {
      // silent fail
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function markAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' }, auth.token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  }

  async function markRead(id) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' }, auth.token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {}
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button className="notif-bell__btn" onClick={() => setOpen(o => !o)}>
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell__badge">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notif-bell__dropdown">
          <div className="notif-bell__header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-bell__mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="notif-bell__empty">No notifications</p>
          ) : (
            <ul className="notif-bell__list">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className={`notif-bell__item ${n.is_read ? '' : 'notif-bell__item--unread'}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className="notif-bell__msg">{n.message}</span>
                  <span className="notif-bell__time">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
