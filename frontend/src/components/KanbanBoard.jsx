import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import { Plus, X, Brain, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const KanbanBoard = ({ boardId }) => {
  const { socket, joinBoard, leaveBoard } = useContext(SocketContext);
  const { updateUserStats } = useContext(AuthContext);

  const [boardName, setBoardName] = useState('');
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recommendedTasks, setRecommendedTasks] = useState([]);
  
  // Selection and editor states
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [addingTaskInColumn, setAddingTaskInColumn] = useState(null); // columnId
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Fetch Board Details
  const fetchBoardData = async () => {
    try {
      const res = await axios.get(`${API_URL}/boards/${boardId}`);
      setBoardName(res.data.board.name);
      setColumns(res.data.columns);
      setTasks(res.data.tasks);
    } catch (err) {
      console.error('Failed to load board:', err.message);
    }
  };

  // Fetch AI mood-based task recommendations
  const fetchRecommendations = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/recommendations`);
      setRecommendedTasks(res.data.recommended_tasks.slice(0, 3)); // show top 3
    } catch (err) {
      console.warn('AI suggestions offline:', err.message);
    }
  };

  useEffect(() => {
    fetchBoardData();
    fetchRecommendations();
    
    // Join board room via socket
    joinBoard(boardId);

    return () => {
      leaveBoard(boardId);
    };
  }, [boardId]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('task-moved-update', (data) => {
      // optimistic update from other client
      setTasks(prevTasks => {
        return prevTasks.map(task => {
          if (task._id === data.taskId) {
            return { ...task, columnId: data.destColumnId, status: data.status };
          }
          return task;
        });
      });
      fetchRecommendations();
    });

    socket.on('task-created-update', (task) => {
      setTasks(prev => [...prev, task]);
      fetchRecommendations();
    });

    socket.on('task-updated-update', (task) => {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
      fetchRecommendations();
    });

    socket.on('task-deleted-update', (taskId) => {
      setTasks(prev => prev.filter(t => t._id !== taskId));
      fetchRecommendations();
    });

    socket.on('column-updated-update', () => {
      fetchBoardData();
    });

    return () => {
      socket.off('task-moved-update');
      socket.off('task-created-update');
      socket.off('task-updated-update');
      socket.off('task-deleted-update');
      socket.off('column-updated-update');
    };
  }, [socket]);

  // Drag and Drop finished
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside list
    if (!destination) return;

    // Dropped in same column and position
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    // Find destination column name to set status
    const destColObj = columns.find(c => c._id === destColumnId);
    let newStatus = 'todo';
    if (destColObj) {
      const colName = destColObj.name.toLowerCase();
      if (colName === 'done' || colName === 'completed') newStatus = 'done';
      else if (colName === 'in progress' || colName === 'doing') newStatus = 'in-progress';
    }

    // Optimistic state update
    setTasks(prev => prev.map(t => {
      if (t._id === draggableId) {
        return { ...t, columnId: destColumnId, status: newStatus };
      }
      return t;
    }));

    // Broadcast move to other socket clients
    if (socket) {
      socket.emit('task-moved', {
        boardId,
        taskId: draggableId,
        sourceColumnId,
        destColumnId,
        status: newStatus
      });
    }

    // Save changes to database
    try {
      const res = await axios.put(`${API_URL}/tasks/${draggableId}`, {
        columnId: destColumnId,
        status: newStatus
      });
      
      // Update local XP stats if completed
      if (res.data.gamification) {
        updateUserStats(res.data.gamification);
      }
      
      // Sync task predictions
      setTasks(prev => prev.map(t => t._id === draggableId ? res.data.task : t));
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to save drag drop change:', err.message);
      fetchBoardData(); // roll back on error
    }
  };

  // Create Task
  const handleCreateTask = async (columnId) => {
    if (!newTaskTitle.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/tasks`, {
        boardId,
        columnId,
        title: newTaskTitle.trim()
      });

      setTasks([...tasks, res.data]);
      setAddingTaskInColumn(null);
      setNewTaskTitle('');

      // Emit socket event
      if (socket) {
        socket.emit('task-created', { boardId, task: res.data });
      }
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to create task:', err.message);
    }
  };

  // Create Column
  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/boards/${boardId}/columns`, {
        name: newColumnName.trim()
      });

      setColumns([...columns, res.data]);
      setShowAddColumn(false);
      setNewColumnName('');

      if (socket) {
        socket.emit('column-updated', { boardId });
      }
    } catch (err) {
      console.error('Failed to create column:', err.message);
    }
  };

  // Handle task modal updates
  const handleTaskUpdate = (updatedTask, gamificationResult) => {
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    if (gamificationResult) {
      updateUserStats(gamificationResult);
    }
    if (socket) {
      socket.emit('task-updated', { boardId, task: updatedTask });
    }
    fetchRecommendations();
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setSelectedTask(null);

      if (socket) {
        socket.emit('task-deleted', { boardId, taskId });
      }
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to delete task:', err.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Board Header & Recommendations */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{boardName}</h1>
          <p className="text-xs text-slate-400">Drag and drop cards to organize. Live collaboration active.</p>
        </div>

        {/* AI Recommendations Ribbon */}
        {recommendedTasks.length > 0 && (
          <div className="bg-indigo-600/5 dark:bg-indigo-500/5 border border-indigo-500/10 rounded-xl px-4 py-2.5 flex items-center space-x-3 max-w-xl shadow-sm">
            <div className="bg-indigo-500/15 p-1.5 rounded-lg text-indigo-400">
              <Brain size={16} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Suggested for you</div>
              <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 no-scrollbar">
                {recommendedTasks.map((t, idx) => (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTask(t)}
                    className="flex items-center space-x-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md shadow-sm transition-all whitespace-nowrap"
                  >
                    <span>{t.title}</span>
                    <ChevronRight size={10} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban Drag and Drop Container */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex overflow-x-auto space-x-6 items-start pb-4">
          
          {/* Loop Columns */}
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.columnId === col._id);
            
            return (
              <div key={col._id} className="w-72 flex-shrink-0 flex flex-col bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 rounded-xl max-h-full overflow-hidden shadow-sm">
                
                {/* Column Title */}
                <div className="p-3.5 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-100/40 dark:bg-slate-900/30">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{col.name}</span>
                    <span className="bg-slate-250 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col._id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-500/5' : ''
                      }`}
                    >
                      {colTasks.map((task, idx) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          index={idx}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                      {provided.placeholder}

                      {/* inline create form */}
                      {addingTaskInColumn === col._id && (
                        <div className="glass-panel p-3 rounded-xl border border-indigo-500/30 bg-white dark:bg-slate-800/40 mb-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Enter card title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(col._id)}
                            className="w-full text-xs bg-transparent border-b border-slate-200 dark:border-slate-700 pb-1.5 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-200"
                          />
                          <div className="flex justify-end space-x-1.5 mt-2">
                            <button
                              onClick={() => setAddingTaskInColumn(null)}
                              className="text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCreateTask(col._id)}
                              className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-505 text-white px-2.5 py-1 rounded shadow transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Column Footer */}
                {addingTaskInColumn !== col._id && (
                  <button
                    onClick={() => {
                      setAddingTaskInColumn(col._id);
                      setNewTaskTitle('');
                    }}
                    className="p-3 text-left text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-200/20 dark:hover:bg-slate-800/25 flex items-center space-x-1.5 border-t border-slate-200/30 dark:border-slate-800/20 transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Task</span>
                  </button>
                )}

              </div>
            );
          })}

          {/* Add New Column Button */}
          {showAddColumn ? (
            <form onSubmit={handleCreateColumn} className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-md">
              <input
                autoFocus
                type="text"
                placeholder="Column name..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-250"
              />
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddColumn(false)}
                  className="text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-505 text-white px-3.5 py-1.5 rounded-lg shadow-lg shadow-indigo-500/10 transition-colors"
                >
                  Add Column
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="w-72 flex-shrink-0 border border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center justify-center space-x-1.5 hover:bg-indigo-500/5 transition-all duration-200 h-12"
            >
              <Plus size={14} />
              <span>Create Column</span>
            </button>
          )}

        </div>
      </DragDropContext>

      {/* Task Modal Editor */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
