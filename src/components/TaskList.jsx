import TaskItem from './TaskItem';
import './TaskList.css';

function TaskList({ tasks, onUpdateTask, onDeleteTask, onToggleComplete }) {
  if (tasks.length === 0) {
    return (
      <div className="task-list__empty">
        <div className="task-list__empty-icon">✓</div>
        <h3>No tasks yet</h3>
        <p>Add your first task above to get started!</p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="task-list">
      <div className="task-list__header">
        <h2 className="task-list__title">
          Tasks <span className="task-list__count">{tasks.length}</span>
        </h2>
        {completedCount > 0 && (
          <span className="task-list__completed-count">
            {completedCount} completed
          </span>
        )}
      </div>

      <ul className="task-list__items">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskItem
              task={task}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onToggleComplete={onToggleComplete}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
