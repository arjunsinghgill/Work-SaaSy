import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import MentionDropdown from './MentionDropdown';
import './CommentThread.css';

export default function CommentThread({ taskId }) {
  const auth = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // null or string
  const [caretPos, setCaretPos] = useState(0);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    apiFetch(`/api/tasks/${taskId}/comments`, {}, auth.token)
      .then(setComments)
      .catch(() => {});
  }, [taskId]);

  function handleTextareaChange(e) {
    const val = e.target.value;
    setBody(val);

    // Detect @mention typing
    const caret = e.target.selectionStart;
    setCaretPos(caret);
    const textBefore = val.slice(0, caret);
    const mentionMatch = textBefore.match(/@([a-zA-Z0-9_]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery(null);
    }
  }

  function handleMentionSelect(username) {
    const textBefore = body.slice(0, caretPos);
    const textAfter = body.slice(caretPos);
    const newText = textBefore.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `) + textAfter;
    setBody(newText);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setError('');
    try {
      const comment = await apiFetch(
        `/api/tasks/${taskId}/comments`,
        { method: 'POST', body: JSON.stringify({ body }) },
        auth.token
      );
      setComments(prev => [...prev, comment]);
      setBody('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(commentId) {
    try {
      await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }, auth.token);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {}
  }

  return (
    <div className="comment-thread">
      <h4 className="comment-thread__title">Comments ({comments.length})</h4>

      {comments.length === 0 && (
        <p className="comment-thread__empty">No comments yet.</p>
      )}

      <ul className="comment-thread__list">
        {comments.map(c => (
          <li key={c.id} className="comment-thread__item">
            <div className="comment-thread__meta">
              <span className="comment-thread__author">@{c.author_username}</span>
              <span className="comment-thread__date">{new Date(c.created_at).toLocaleString()}</span>
              {c.author_id === auth.user?.id && (
                <button className="comment-thread__delete" onClick={() => handleDelete(c.id)}>✕</button>
              )}
            </div>
            <p className="comment-thread__body">{c.body}</p>
          </li>
        ))}
      </ul>

      <form className="comment-thread__form" onSubmit={handleSubmit}>
        <div className="comment-thread__input-wrap" style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className="comment-thread__textarea"
            placeholder="Write a comment... use @username to mention someone"
            value={body}
            onChange={handleTextareaChange}
            rows={2}
          />
          {mentionQuery !== null && (
            <MentionDropdown
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={() => setMentionQuery(null)}
            />
          )}
        </div>
        {error && <p className="comment-thread__error">{error}</p>}
        <button className="comment-thread__submit" type="submit" disabled={!body.trim()}>
          Post Comment
        </button>
      </form>
    </div>
  );
}
