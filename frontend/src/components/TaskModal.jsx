import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { X, Play, Pause, Square, Plus, Trash, BrainCircuit, RefreshCw, Clock } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const TaskModal = ({ task, onClose, onUpdate, onDelete }) => {
  const { updateUserStats } = useContext(AuthContext);
  
  // Form States
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [deadline, setDeadline] = useState(task.deadline ? task.deadline.substring(0, 10) : '');
  const [status, setStatus] = useState(task.status);
  
  // Subtasks State
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Focus Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const timerRef = useRef(null);

  // AI Load states
  const [aiLoading, setAiLoading] = useState(false);

  // Sync session seconds to db when closing or pausing
  const syncFocusTime = async (secondsToSync) => {
    if (secondsToSync <= 0) return;
    try {
      const res = await axios.put(`${API_URL}/tasks/${task._id}/focus`, { seconds: secondsToSync });
      onUpdate(res.data.task, res.data.analytics ? { streak: res.data.analytics.streak } : null);
    } catch (err) {
      console.error('Failed to sync focus time:', err.message);
    }
  };

  // Timer Lifecycle
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (sessionSeconds > 0) {
        syncFocusTime(sessionSeconds);
        setSessionSeconds(0);
      }
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Clean up timer on unmount and sync time
  useEffect(() => {
    return () => {
      if (sessionSeconds > 0) {
        syncFocusTime(sessionSeconds);
      }
    };
  }, [sessionSeconds]);

  // Format timer text
  const formatTimerText = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // Submit edits
  const handleSave = async () => {
    try {
      const res = await axios.put(`${API_URL}/tasks/${task._id}`, {
        title,
        description,
        priority,
        deadline: deadline || null,
        status,
        subtasks
      });
      
      onUpdate(res.data.task, res.data.gamification);
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err.message);
    }
  };

  // Add subtask
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    setSubtasks([...subtasks, { text: newSubtaskText.trim(), completed: false }]);
    setNewSubtaskText('');
  };

  // Toggle subtask checkbox
  const handleToggleSubtask = (idx) => {
    const updated = subtasks.map((sub, i) => {
      if (i === idx) return { ...sub, completed: !sub.completed };
      return sub;
    });
    setSubtasks(updated);
  };

  // Delete subtask
  const handleDeleteSubtask = (idx) => {
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  // Trigger AI analysis on demand
  const handleAIRecalculate = async () => {
    setAiLoading(true);
    try {
      // Create mockup API payload
      const res = await axios.put(`${API_URL}/tasks/${task._id}`, {
        title,
        description,
        priority,
        deadline: deadline || null,
        status,
        subtasks
      });
      
      // Request updated predictions from AI server
      const nlpRes = await axios.post('http://localhost:5000/api/tasks', {
        boardId: task.boardId,
        columnId: task.columnId,
        title,
        description,
        priority,
        deadline: deadline || null
      });

      // Update fields
      const updatedTask = {
        ...res.data.task,
        aiDifficulty: nlpRes.data.aiDifficulty,
        aiPredictedTime: nlpRes.data.aiPredictedTime,
        aiRiskLevel: nlpRes.data.aiRiskLevel,
        energyRequired: nlpRes.data.energyRequired,
        subtasks: nlpRes.data.subtasks
      };

      // Put predictions back to db
      const finalRes = await axios.put(`${API_URL}/tasks/${task._id}`, updatedTask);
      setSubtasks(finalRes.data.task.subtasks);
      onUpdate(finalRes.data.task, finalRes.data.gamification);
    } catch (err) {
      console.error('AI calculation failed:', err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Editor Form */}
        <div className="flex-1 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-850">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none w-full text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this task about?"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Subtasks */}
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Subtasks</label>
            
            {/* List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2">
              {subtasks.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/30 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => handleToggleSubtask(idx)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 bg-slate-200 dark:bg-slate-700"
                    />
                    <span className={`text-xs text-slate-700 dark:text-slate-300 ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                      {sub.text}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteSubtask(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleAddSubtask} className="flex space-x-2">
              <input
                type="text"
                placeholder="Add new subtask..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <button type="submit" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Properties */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2 text-xs text-slate-700 dark:text-slate-350 focus:border-indigo-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2 text-xs text-slate-700 dark:text-slate-350 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => onDelete(task._id)}
              className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3.5 py-2 rounded-lg transition-colors"
            >
              Delete Task
            </button>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: AI Panel & Focus Timer */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/20 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start md:mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace tools</h4>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Focus Timer */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center space-x-1.5 text-indigo-500 text-xs font-bold uppercase mb-2">
              <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
              <span>Focus Session</span>
            </div>
            
            {/* Display */}
            <div className="text-center font-mono text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              {formatTimerText(timerSeconds)}
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-2">
              {!isTimerRunning ? (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  <Play size={10} className="fill-white" />
                  <span>Start</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                >
                  <Pause size={10} className="fill-white" />
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 text-xs font-bold transition-colors"
              >
                <Square size={10} className="fill-current" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* AI predictions panel */}
          <div className="bg-indigo-600/5 dark:bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold uppercase mb-3.5">
                <BrainCircuit size={14} className="animate-pulse" />
                <span>AI Insights</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-slate-500">Estimate:</span>
                  <span className="font-bold text-slate-700 dark:text-indigo-400">{task.aiPredictedTime || 'N/A'} Hours</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-slate-500">Difficulty:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350 capitalize">{task.aiDifficulty || 'medium'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-slate-500">Risk Level:</span>
                  <span className={`font-bold capitalize ${task.aiRiskLevel === 'high' ? 'text-red-400 animate-pulse' : 'text-slate-700 dark:text-slate-350'}`}>
                    {task.aiRiskLevel || 'low'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAIRecalculate}
              disabled={aiLoading}
              className="mt-6 w-full flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/10 transition-all duration-200"
            >
              <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
              <span>{aiLoading ? 'Analyzing...' : 'Re-estimate AI'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TaskModal;
