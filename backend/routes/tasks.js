const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Column = require('../models/Column');
const User = require('../models/User');
const Analytics = require('../models/Analytics');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000';

// Helper to award XP and handle level up
const awardXP = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    user.xp += amount;
    let leveledUp = false;

    // Level up math: Level N needs N * 100 XP
    let xpNeeded = user.level * 100;
    while (user.xp >= xpNeeded) {
      user.xp -= xpNeeded;
      user.level += 1;
      leveledUp = true;
      xpNeeded = user.level * 100;
    }

    // Award milestones badges
    if (user.level >= 5 && !user.badges.includes('level_5')) {
      user.badges.push('level_5');
    }
    if (user.level >= 10 && !user.badges.includes('level_10')) {
      user.badges.push('level_10');
    }

    await user.save();
    return { level: user.level, xp: user.xp, badges: user.badges, leveledUp };
  } catch (err) {
    console.error('Error awarding XP:', err);
    return null;
  }
};

// Helper to update daily productivity metrics
const logTaskCompletion = async (userId, focusSecondsToAdd = 0) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ userId, date: today });
    if (!analytics) {
      analytics = new Analytics({
        userId,
        date: today,
        tasksCompleted: 0,
        focusDuration: 0,
        energyLevel: 3
      });
    }

    analytics.tasksCompleted += 1;
    analytics.focusDuration += focusSecondsToAdd;
    
    // Compute basic Daily Focus Score: tasks * 10 + focusMinutes * 0.5 (cap at 100)
    const focusMinutes = analytics.focusDuration / 60;
    const score = (analytics.tasksCompleted * 15) + (focusMinutes * 0.5);
    analytics.dailyFocusScore = Math.min(100, Math.round(score));

    // Request burnout risk update from AI server
    try {
      const user = await User.findById(userId);
      const res = await axios.post(`${AI_BACKEND_URL}/predict-productivity`, {
        streak_length: user ? user.streak : 1,
        focus_hours: Number((analytics.focusDuration / 3600).toFixed(2)),
        tasks_completed: analytics.tasksCompleted,
        energy_level: analytics.energyLevel
      });
      if (res.data && res.data.burnout_risk) {
        analytics.burnoutRisk = res.data.burnout_risk.toLowerCase();
      }
    } catch (aiErr) {
      console.warn('AI Productivity service offline. Using default burnout evaluation.');
      // Heuristic fallback
      if (analytics.focusDuration > 28800) { // > 8 hours focus
        analytics.burnoutRisk = 'high';
      } else if (analytics.focusDuration > 18000) { // > 5 hours focus
        analytics.burnoutRisk = 'medium';
      } else {
        analytics.burnoutRisk = 'low';
      }
    }

    await analytics.save();
    return analytics;
  } catch (err) {
    console.error('Error logging daily task completion:', err);
  }
};

// @route    POST api/tasks
// @desc     Create a task & fetch AI-generated predictions
// @access   Private
router.post('/', auth, async (req, res) => {
  const { boardId, columnId, title, description, priority, deadline } = req.body;

  try {
    // Basic validations
    if (!boardId || !columnId || !title) {
      return res.status(400).json({ msg: 'Please provide boardId, columnId, and task title' });
    }

    // Initialize defaults
    let aiDifficulty = 'medium';
    let aiPredictedTime = 6.0;
    let aiRiskLevel = 'low';
    let energyRequired = 3;
    let subtasks = [];

    // 1. Fetch NLP details & AI subtasks from FastAPI
    try {
      const nlpRes = await axios.post(`${AI_BACKEND_URL}/analyze-nlp`, {
        title,
        description: description || ''
      });

      if (nlpRes.data) {
        aiDifficulty = nlpRes.data.difficulty || 'medium';
        energyRequired = nlpRes.data.energy_required || 3;
        if (nlpRes.data.subtasks) {
          subtasks = nlpRes.data.subtasks.map(text => ({ text, completed: false }));
        }
      }
    } catch (aiErr) {
      console.warn('AI NLP service offline. Using local heuristics.');
      // Local fallback for subtask generation
      const actionKeywords = ['setup', 'code', 'test', 'deploy', 'design', 'auth'];
      const descLower = (description || '').toLowerCase();
      actionKeywords.forEach(keyword => {
        if (descLower.includes(keyword)) {
          subtasks.push({ text: `Implement ${keyword} logic`, completed: false });
        }
      });
      if (subtasks.length === 0) {
        subtasks.push({ text: 'Analyze requirements', completed: false });
        subtasks.push({ text: 'Implement task core', completed: false });
      }
    }

    // 2. Fetch predicted time from FastAPI
    try {
      const timeRes = await axios.post(`${AI_BACKEND_URL}/predict-time`, {
        title,
        description: description || '',
        priority: priority || 'medium',
        num_subtasks: subtasks.length,
        avg_user_completion_time: 12.0 // fallback user average
      });

      if (timeRes.data) {
        aiPredictedTime = timeRes.data.predicted_time || 6.0;
        aiRiskLevel = timeRes.data.risk_level || 'low';
      }
    } catch (aiErr) {
      console.warn('AI Time Prediction service offline. Using heuristic estimation.');
      // Heuristic fallback
      const priorityWeights = { low: 4, medium: 8, high: 16 };
      aiPredictedTime = (priorityWeights[priority] || 8) + (subtasks.length * 1.5);
    }

    const newTask = new Task({
      boardId,
      columnId,
      title,
      description: description || '',
      priority: priority || 'medium',
      deadline,
      assignee: req.user.id,
      subtasks,
      aiDifficulty,
      aiPredictedTime,
      aiRiskLevel,
      energyRequired,
      status: 'todo'
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/tasks/:id
// @desc     Update a task details, and manage status transition triggers (XP awards)
// @access   Private
router.put('/:id', auth, async (req, res) => {
  const { title, description, priority, deadline, columnId, status, subtasks, timeSpent } = req.body;

  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    const oldStatus = task.status;

    // Apply updates
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (deadline !== undefined) task.deadline = deadline;
    if (columnId !== undefined) task.columnId = columnId;
    if (status !== undefined) task.status = status;
    if (subtasks !== undefined) task.subtasks = subtasks;
    if (timeSpent !== undefined) task.timeSpent = timeSpent;

    let gamificationResult = null;

    // Trigger completion hook when status changes to 'done'
    if (status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date();
      
      // Calculate XP to award
      let xpToAward = 20; // base completion XP
      
      // XP scales with difficulty
      const difficultyXP = { easy: 10, medium: 25, hard: 50 };
      xpToAward += (difficultyXP[task.aiDifficulty] || 25);

      // XP for completed subtasks
      const completedSubtasksCount = task.subtasks.filter(s => s.completed).length;
      xpToAward += (completedSubtasksCount * 5);

      // Award XP to user
      gamificationResult = await awardXP(req.user.id, xpToAward);

      // Log productivity analytics
      await logTaskCompletion(req.user.id, task.timeSpent);
    } 
    // Reset completedAt if moved out of done
    else if (status && status !== 'done' && oldStatus === 'done') {
      task.completedAt = undefined;
    }

    await task.save();

    res.json({
      task,
      gamification: gamificationResult
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/tasks/:id/focus
// @desc     Add focus time to a task
// @access   Private
router.put('/:id/focus', auth, async (req, res) => {
  const { seconds } = req.body;

  try {
    if (!seconds || isNaN(seconds)) {
      return res.status(400).json({ msg: 'Please provide valid elapsed seconds' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    task.timeSpent += Number(seconds);
    await task.save();

    // Increment user daily focus log in analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ userId: req.user.id, date: today });
    if (!analytics) {
      analytics = new Analytics({
        userId: req.user.id,
        date: today,
        tasksCompleted: 0,
        focusDuration: 0,
        energyLevel: 3
      });
    }

    analytics.focusDuration += Number(seconds);
    
    // Recompute daily focus score
    const focusMinutes = analytics.focusDuration / 60;
    const score = (analytics.tasksCompleted * 15) + (focusMinutes * 0.5);
    analytics.dailyFocusScore = Math.min(100, Math.round(score));

    await analytics.save();

    res.json({ task, analytics });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/tasks/:id
// @desc     Delete a task
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    await task.deleteOne();
    res.json({ msg: 'Task deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
