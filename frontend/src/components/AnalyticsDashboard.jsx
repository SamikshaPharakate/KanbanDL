import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Brain, ShieldAlert, Heart, Battery } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AnalyticsDashboard = () => {
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [energy, setEnergy] = useState(3);
  const [burnoutRisk, setBurnoutRisk] = useState('low');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/weekly`);
      setWeeklyLogs(res.data);
      
      if (res.data.length > 0) {
        // Get today's logged details if available
        const todayLog = res.data[res.data.length - 1];
        setEnergy(todayLog.energyLevel || 3);
        setBurnoutRisk(todayLog.burnoutRisk || 'low');
      }
    } catch (err) {
      console.error('Failed to load analytics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleLogEnergy = async (level) => {
    try {
      const res = await axios.put(`${API_URL}/analytics/energy`, { energyLevel: level });
      setEnergy(res.data.energyLevel);
      setBurnoutRisk(res.data.burnoutRisk);
      
      // Refresh logs
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to log energy:', err.message);
    }
  };

  // Format focus logs for chart consumption
  const chartData = weeklyLogs.map(log => {
    const logDate = new Date(log.date);
    return {
      name: logDate.toLocaleDateString(undefined, { weekday: 'short' }),
      'Focus Score': log.dailyFocusScore || 0,
      'Focus Time (min)': Math.round((log.focusDuration || 0) / 60),
      'Tasks Completed': log.tasksCompleted || 0
    };
  });

  const getBurnoutColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getEnergyBatteryColor = (level) => {
    if (level <= 2) return 'text-red-500';
    if (level === 3) return 'text-amber-500';
    return 'text-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 animate-pulse text-sm">Analyzing logs...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)] transition-colors duration-200">
      
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Productivity Analytics</h1>
        <p className="text-xs text-slate-400">Deep Learning estimates, burnout logs, and performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Widget 1: Burnout Risk Assessment */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 text-red-500 font-semibold mb-4 text-sm">
            <ShieldAlert size={18} />
            <span>Burnout Analyzer</span>
          </div>

          <div className="text-center py-4">
            <span className={`px-4 py-2 rounded-xl text-lg font-bold uppercase tracking-wider border ${getBurnoutColor(burnoutRisk)}`}>
              {burnoutRisk} Risk
            </span>
            <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
              Calculated using neural patterns based on your active streaks, elapsed focus hours, and energy ratings.
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs text-slate-500 flex justify-between items-center">
            <span>Status:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {burnoutRisk === 'high' ? '🚨 Recommendation: Take a Break!' : '👍 Status Stable'}
            </span>
          </div>
        </div>

        {/* Widget 2: Energy Logger */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 text-amber-500 font-semibold mb-4 text-sm">
            <Battery size={18} />
            <span>Log Daily Energy</span>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-4 text-center">How focused or energized do you feel right now?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleLogEnergy(lvl)}
                  className={`w-10 h-14 rounded-lg flex flex-col items-center justify-between py-2 border transition-all duration-200 ${
                    energy === lvl
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 scale-110 shadow-md shadow-amber-500/10 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold">{lvl}</span>
                  <Heart size={14} className={energy >= lvl ? 'fill-current' : ''} />
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs text-slate-500 flex justify-between items-center">
            <span>Current State:</span>
            <span className={`font-bold ${getEnergyBatteryColor(energy)}`}>
              {energy <= 2 ? 'Fatigued / Sleepy' : (energy === 3 ? 'Balanced' : 'Highly Focused')}
            </span>
          </div>
        </div>

        {/* Widget 3: AI productivity overview */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 text-indigo-500 font-semibold mb-4 text-sm">
            <Brain size={18} />
            <span>AI Focus Tracker</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Completed Today:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {weeklyLogs[weeklyLogs.length - 1]?.tasksCompleted || 0} Tasks
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Focus Time Today:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.round((weeklyLogs[weeklyLogs.length - 1]?.focusDuration || 0) / 60)} Minutes
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Average Focus Score:</span>
              <span className="font-bold text-indigo-400">
                {Math.round(weeklyLogs.reduce((acc, curr) => acc + (curr.dailyFocusScore || 0), 0) / (weeklyLogs.length || 1))} / 100
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs text-slate-500 flex justify-between items-center">
            <span>Summary:</span>
            <span className="font-bold text-slate-700 dark:text-slate-350">
              {weeklyLogs.length} Days logged
            </span>
          </div>
        </div>

      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Focus Score Trend */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-96 flex flex-col">
          <h3 className="text-xs font-bold text-slate-450 uppercase mb-4 tracking-wider flex items-center space-x-1.5">
            <Calendar size={13} />
            <span>Focus Score Progression</span>
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="Focus Score" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Task Completions vs Focus Time */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-96 flex flex-col">
          <h3 className="text-xs font-bold text-slate-450 uppercase mb-4 tracking-wider flex items-center space-x-1.5">
            <Calendar size={13} />
            <span>Daily focus workload</span>
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Focus Time (min)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tasks Completed" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AnalyticsDashboard;
