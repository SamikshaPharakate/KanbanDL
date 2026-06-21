import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import KanbanBoard from './components/KanbanBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import GamificationStore from './components/GamificationStore';
import axios from 'axios';
import { Layout, Plus, Loader, LogIn, Lock, Mail, User as UserIcon } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-900 text-slate-400">
        <Loader className="animate-spin" size={24} />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// -----------------
// Login / Register Page
// -----------------
const AuthPage = () => {
  const { login, register, token } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (token) return <Navigate to="/boards" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const res = await login(email, password);
      if (!res.success) setError(res.message);
    } else {
      if (!username.trim()) {
        setError('Username is required');
        return;
      }
      const res = await register(username.trim(), email, password);
      if (!res.success) setError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isLogin ? 'Sign in to access your intelligent board' : 'Sign up to kickstart your smart workflow'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-2.5 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none placeholder-slate-600"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder={isLogin ? "Username or Email" : "Email Address"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none placeholder-slate-600"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none placeholder-slate-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-300"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------
// Boards Selection Page
// -----------------
const BoardsSelection = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchBoards = async () => {
    try {
      const res = await axios.get(`${API_URL}/boards`);
      setBoards(res.data);
    } catch (err) {
      console.error('Failed to fetch boards:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/boards`, {
        name: name.trim(),
        description: description.trim()
      });
      setBoards([...boards, res.data]);
      setName('');
      setDescription('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create board:', err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this board? This will delete all columns and tasks inside it.')) return;
    
    try {
      await axios.delete(`${API_URL}/boards/${id}`);
      setBoards(boards.filter(b => b._id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-950 text-slate-400">
        <Loader className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Select Workspace</h1>
          <p className="text-xs text-slate-400">Create or choose a Kanban board to begin your workflow.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 transition-all duration-200 hover:shadow-indigo-500/25"
          >
            <Plus size={14} />
            <span>Create Board</span>
          </button>
        )}
      </div>

      {/* Add Board Form overlay */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-8 max-w-lg shadow-md">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-indigo-400">New Kanban Board</h3>
          <div className="space-y-4">
            <div>
              <input
                autoFocus
                type="text"
                placeholder="Board title..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-505 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
              >
                Create Board
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <Link
            key={board._id}
            to={`/board/${board._id}`}
            className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 shadow-sm flex flex-col justify-between h-40 group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center space-x-2 text-indigo-500 mb-2">
                <Layout size={18} />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-400 transition-colors">
                  {board.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {board.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-400">
              <span>Owner: {board.owner?.username || 'You'}</span>
              <button
                onClick={(e) => handleDelete(board._id, e)}
                className="text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </Link>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <Layout className="mx-auto mb-4 text-slate-500" size={32} />
            <p className="text-sm font-semibold">No Kanban boards found.</p>
            <p className="text-xs text-slate-500 mt-1">Click "Create Board" above to initialize your first workspace.</p>
          </div>
        )}
      </div>

    </div>
  );
};

// -----------------
// Single Board Route wrapper
// -----------------
const BoardWrapper = () => {
  const { id } = useParams();
  return <KanbanBoard boardId={id} />;
};

// -----------------
// Main App Component
// -----------------
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/boards" element={<ProtectedRoute><BoardsSelection /></ProtectedRoute>} />
                <Route path="/board/:id" element={<ProtectedRoute><BoardWrapper /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute><GamificationStore /></ProtectedRoute>} />
                
                {/* Fallback redirects */}
                <Route path="*" element={<Navigate to="/boards" replace />} />
              </Routes>
            </div>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
