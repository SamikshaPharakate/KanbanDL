import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Trophy, Award, Flame, Zap, Compass, Star, ShieldCheck } from 'lucide-react';

const GamificationStore = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  // Static list of possible achievements in the platform
  const BADGES = [
    {
      id: 'welcome',
      title: 'First Flight',
      description: 'Logged in and set up your TaskFlow AI workspace.',
      icon: Compass,
      color: 'from-blue-500 to-indigo-500 shadow-blue-500/20'
    },
    {
      id: 'first_task',
      title: 'Task Buster',
      description: 'Completed your first visual card task.',
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-500 shadow-emerald-500/20'
    },
    {
      id: 'streak_7',
      title: 'On Fire',
      description: 'Maintained an active 7-day focus streak.',
      icon: Flame,
      color: 'from-orange-500 to-red-500 shadow-orange-500/20'
    },
    {
      id: 'streak_30',
      title: 'Unstoppable',
      description: 'Maintained an active 30-day focus streak.',
      icon: Zap,
      color: 'from-amber-500 to-yellow-500 shadow-amber-500/20'
    },
    {
      id: 'level_5',
      title: 'Adept Planner',
      description: 'Reached User Level 5 through focused task completions.',
      icon: Award,
      color: 'from-purple-500 to-pink-500 shadow-purple-500/20'
    },
    {
      id: 'level_10',
      title: 'Grandmaster',
      description: 'Reached User Level 10. Ultimate workflow efficiency.',
      icon: Star,
      color: 'from-violet-600 to-fuchsia-600 shadow-violet-600/20'
    }
  ];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)] transition-colors duration-200">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Trophy className="text-amber-500" />
          <span>Achievements & Badges</span>
        </h1>
        <p className="text-xs text-slate-400">Unlock XP milestones and collect badges by completing tasks and logging focus sessions.</p>
      </div>

      {/* Levels Summary */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 text-white mb-8 shadow-xl flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Profile Rank</span>
          <h2 className="text-2xl font-bold mt-1">Level {user.level} Grand Master</h2>
          <p className="text-xs text-slate-400 mt-1">Earned badge collections: {user.badges.length} Unlocked</p>
        </div>
        <div className="flex space-x-6">
          <div className="text-center">
            <span className="text-xs text-slate-400 block">Current XP</span>
            <span className="text-2xl font-extrabold text-indigo-400">{user.xp} XP</span>
          </div>
          <div className="text-center border-l border-slate-800 pl-6">
            <span className="text-xs text-slate-400 block">Streak</span>
            <span className="text-2xl font-extrabold text-orange-400">{user.streak} Days</span>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BADGES.map((badge) => {
          const isUnlocked = user.badges.includes(badge.id);
          const IconComponent = badge.icon;
          
          return (
            <div 
              key={badge.id}
              className={`glass-panel p-5 rounded-2xl border bg-white dark:bg-slate-900/60 shadow-sm transition-all duration-300 relative overflow-hidden flex items-center space-x-4 ${
                isUnlocked 
                  ? 'border-slate-200 dark:border-slate-800 opacity-100 scale-100'
                  : 'border-slate-200/40 dark:border-slate-850 opacity-40 grayscale select-none'
              }`}
            >
              {/* Badge Icon */}
              <div className={`p-3 rounded-xl text-white bg-gradient-to-tr shadow-lg ${
                isUnlocked ? badge.color : 'from-slate-700 to-slate-800 shadow-slate-800/10'
              }`}>
                <IconComponent size={22} className={isUnlocked ? 'animate-bounce' : ''} style={{ animationDuration: '3.s' }} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <span>{badge.title}</span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              {/* Ribbon status */}
              {isUnlocked && (
                <div className="absolute top-2 right-2 flex items-center space-x-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-indigo-400 uppercase tracking-widest">
                  Unlocked
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default GamificationStore;
