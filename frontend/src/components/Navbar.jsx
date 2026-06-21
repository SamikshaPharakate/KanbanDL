import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Layout, BarChart2, Flame, Trophy, LogOut, Sun, Moon, BrainCircuit } from 'lucide-react';

const Navbar = () => {
  const { user, logout, updateUsername } = useContext(AuthContext);
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsernameValue, setEditUsernameValue] = useState("");

  const handleUsernameSubmit = async () => {
    setIsEditingUsername(false);
    if (editUsernameValue.trim() && editUsernameValue.trim() !== user.username) {
      await updateUsername(editUsernameValue.trim());
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (!user) return null;

  const xpNeeded = user.level * 100;
  const xpPercent = Math.min(100, Math.round((user.xp / xpNeeded) * 100));

  const isActive = (path) => {
    return location.pathname === path ? 'bg-indigo-600/10 text-indigo-500 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
              <BrainCircuit size={20} className="animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              TaskFlow AI
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-2 items-center">
            <Link to="/boards" className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive('/boards')}`}>
              <Layout size={16} />
              <span>Boards</span>
            </Link>
            <Link to="/analytics" className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive('/analytics')}`}>
              <BarChart2 size={16} />
              <span>Analytics</span>
            </Link>
            <Link to="/achievements" className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive('/achievements')}`}>
              <Trophy size={16} />
              <span>Badges</span>
            </Link>
          </div>

          {/* Stats, Dark Mode & User Profile */}
          <div className="flex items-center space-x-6">
            
            {/* Gamification Stats */}
            <div className="flex items-center space-x-4">
              
              {/* Streak */}
              <div className="flex items-center space-x-1 text-orange-500 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full text-xs font-semibold animate-bounce" style={{ animationDuration: '3s' }}>
                <Flame size={14} className="fill-orange-500" />
                <span>{user.streak} Days</span>
              </div>

              {/* XP Level Bar */}
              <div className="hidden sm:flex flex-col w-28 md:w-36">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>LEVEL {user.level}</span>
                  <span>{user.xp} / {xpNeeded} XP</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Utility buttons */}
            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-4">
              
              {/* Dark/Light mode toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* User Dropdown / Sign out */}
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end hidden lg:flex">
                  {isEditingUsername ? (
                    <input
                      type="text"
                      value={editUsernameValue}
                      onChange={(e) => setEditUsernameValue(e.target.value)}
                      onBlur={handleUsernameSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                      autoFocus
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent border-b border-indigo-500 focus:outline-none w-24 text-right"
                    />
                  ) : (
                    <span 
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:text-indigo-500 transition-colors"
                      onClick={() => {
                        setEditUsernameValue(user.username);
                        setIsEditingUsername(true);
                      }}
                      title="Click to edit username"
                    >
                      {user.username}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">{user.xp > 500 ? 'Expert' : 'Rookie'}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center justify-center p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all duration-200"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
