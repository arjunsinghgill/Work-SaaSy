import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import './MentionDropdown.css';

export default function MentionDropdown({ query, onSelect, onClose }) {
  const auth = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`, {}, auth.token);
        setUsers(data);
      } catch (err) {
        setUsers([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (users.length === 0) return null;

  return (
    <ul className="mention-dropdown">
      {users.map(u => (
        <li key={u.id} className="mention-dropdown__item" onMouseDown={() => onSelect(u.username)}>
          @{u.username}
        </li>
      ))}
    </ul>
  );
}
