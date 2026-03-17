import { useState } from 'react';
import './TaskForm.css';

function TaskForm({ onSubmit, teamMembers = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      ...(teamMembers ? { assigned_to_id: assignedToId || null } : {}),
    });
    setTitle('');
    setDescription('');
    setAssignedToId('');
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2 className="task-form__heading">Add a New Task</h2>

      <div className="task-form__field">
        <label className="task-form__label" htmlFor="task-title">
          Title <span className="task-form__required">*</span>
        </label>
        <input
          id="task-title"
          className="task-form__input"
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="task-form__field">
        <label className="task-form__label" htmlFor="task-description">
          Description <span className="task-form__optional">(optional)</span>
        </label>
        <textarea
          id="task-description"
          className="task-form__textarea"
          placeholder="Add more details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {teamMembers && (
        <div className="task-form__field">
          <label className="task-form__label">Assign to</label>
          <select
            className="task-form__select"
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>@{m.username}</option>
            ))}
          </select>
        </div>
      )}

      <button className="task-form__submit" type="submit" disabled={!title.trim()}>
        Add Task
      </button>
    </form>
  );
}

export default TaskForm;
