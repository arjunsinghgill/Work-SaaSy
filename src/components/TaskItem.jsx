import { useState } from 'react';
import CommentThread from './CommentThread';
import './TaskItem.css';

function TaskItem({ task, onUpdateTask, onDeleteTask, onToggleComplete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [showComments, setShowComments] = useState(false);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdateTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      completed: task.completed,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formattedDate = new Date(task.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`task-item${task.completed ? ' task-item--completed' : ''}`}>
      {isEditing ? (
        <div className="task-item__edit-form">
          <div className="task-item__edit-field">
            <label className="task-item__edit-label" htmlFor={`edit-title-${task.id}`}>
              Title
            </label>
            <input
              id={`edit-title-${task.id}`}
              className="task-item__edit-input"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div className="task-item__edit-field">
            <label className="task-item__edit-label" htmlFor={`edit-desc-${task.id}`}>
              Description
            </label>
            <textarea
              id={`edit-desc-${task.id}`}
              className="task-item__edit-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Add a description..."
            />
          </div>

          <div className="task-item__edit-actions">
            <button
              className="task-item__btn task-item__btn--save"
              onClick={handleSave}
              disabled={!editTitle.trim()}
            >
              Save
            </button>
            <button
              className="task-item__btn task-item__btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="task-item__view">
          <div className="task-item__left">
            <input
              type="checkbox"
              className="task-item__checkbox"
              checked={task.completed}
              onChange={() => onToggleComplete(task.id, task.completed)}
              id={`task-check-${task.id}`}
              aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
            />
          </div>

          <div className="task-item__content">
            <label
              className="task-item__title"
              htmlFor={`task-check-${task.id}`}
            >
              {task.title}
            </label>

            {task.assignee_username && (
              <span className="task-item__assignee">→ @{task.assignee_username}</span>
            )}

            {task.description && (
              <p className="task-item__description">{task.description}</p>
            )}

            <span className="task-item__date">Created {formattedDate}</span>
          </div>

          <div className="task-item__actions">
            <button
              className="task-item__comments-btn"
              onClick={() => setShowComments(s => !s)}
            >
              💬 Comments
            </button>
            <button
              className="task-item__btn task-item__btn--edit"
              onClick={() => setIsEditing(true)}
              aria-label="Edit task"
            >
              Edit
            </button>
            <button
              className="task-item__btn task-item__btn--delete"
              onClick={() => onDeleteTask(task.id)}
              aria-label="Delete task"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {showComments && <CommentThread taskId={task.id} />}
    </div>
  );
}

export default TaskItem;
