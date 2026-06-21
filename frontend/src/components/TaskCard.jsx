import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

const TaskCard = ({ task, index, onClick }) => {
  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'hard': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'medium': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'easy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`glass-panel p-4 rounded-xl mb-3 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 relative group ${
            snapshot.isDragging ? 'shadow-2xl shadow-indigo-500/20 scale-105 border-indigo-500/50' : ''
          }`}
        >
          {/* Card Badges */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getDifficultyColor(task.aiDifficulty)}`}>
              {task.aiDifficulty}
            </span>
            {task.aiRiskLevel === 'high' && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-red-600/25 text-red-400 border border-red-500/35 animate-pulse">
                <AlertTriangle size={10} />
                <span>At Risk</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-indigo-400 transition-colors">
            {task.title}
          </h4>

          {/* Description Snippet */}
          {task.description && (
            <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 mb-3">
              {task.description}
            </p>
          )}

          {/* Card Footer Details */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            {/* Left: Deadline & focus time */}
            <div className="flex items-center space-x-3.5">
              {task.deadline && (
                <div className="flex items-center space-x-1">
                  <Calendar size={11} />
                  <span>{new Date(task.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                </div>
              )}
              <div className="flex items-center space-x-1" title="Active Focus Session Duration">
                <Clock size={11} />
                <span>{formatTime(task.timeSpent)}</span>
              </div>
            </div>

            {/* Right: Subtasks summary & AI Predicted Time */}
            <div className="flex items-center space-x-3">
              {totalSubtasks > 0 && (
                <div className="flex items-center space-x-1">
                  <CheckSquare size={11} />
                  <span>{completedSubtasks}/{totalSubtasks}</span>
                </div>
              )}
              {task.aiPredictedTime > 0 && (
                <div className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold" title="AI Completion Estimate">
                  {task.aiPredictedTime}h
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
