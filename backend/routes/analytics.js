const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const Task = require('../models/Task');
const User = require('../models/User');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000';

// @route    GET api/analytics/weekly
// @desc     Fetch daily analytics logs for the last 7 days
// @access   Private
router.get('/weekly', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await Analytics.find({
      userId: req.user.id,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });

    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/analytics/energy
// @desc     Update self-reported energy level for today
// @access   Private
router.put('/energy', auth, async (req, res) => {
  const { energyLevel } = req.body;

  if (energyLevel === undefined || energyLevel < 1 || energyLevel > 5) {
    return res.status(400).json({ msg: 'Please provide an energy level between 1 and 5' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ userId: req.user.id, date: today });
    if (!analytics) {
      analytics = new Analytics({
        userId: req.user.id,
        date: today,
        tasksCompleted: 0,
        focusDuration: 0
      });
    }

    analytics.energyLevel = Number(energyLevel);

    // Call AI service to update productivity metrics & burnout risk
    try {
      const user = await User.findById(req.user.id);
      const aiRes = await axios.post(`${AI_BACKEND_URL}/predict-productivity`, {
        streak_length: user ? user.streak : 1,
        focus_hours: Number((analytics.focusDuration / 3600).toFixed(2)),
        tasks_completed: analytics.tasksCompleted,
        energy_level: analytics.energyLevel
      });
      if (aiRes.data && aiRes.data.burnout_risk) {
        analytics.burnoutRisk = aiRes.data.burnout_risk.toLowerCase();
      }
    } catch (aiErr) {
      console.warn('AI Productivity service offline. Using default burnout evaluations.');
    }

    await analytics.save();
    res.json(analytics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/analytics/recommendations
// @desc     Fetch AI task recommendations sorted by energy level match
// @access   Private
router.get('/recommendations', auth, async (req, res) => {
  try {
    // 1. Fetch all user's incomplete tasks
    const tasks = await Task.find({
      assignee: req.user.id,
      status: { $in: ['todo', 'in-progress'] }
    });

    if (tasks.length === 0) {
      return res.json({ recommended_tasks: [] });
    }

    // 2. Fetch today's energy level
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const analytics = await Analytics.findOne({ userId: req.user.id, date: today });
    const userEnergy = analytics ? analytics.energyLevel : 3;

    // 3. Format tasks list for AI Backend
    const formattedTasks = tasks.map(task => ({
      _id: task._id.toString(),
      title: task.title,
      priority: task.priority,
      difficulty: task.aiDifficulty,
      energy_required: task.energyRequired || 3
    }));

    // 4. Send request to FastAPI recommend endpoint
    try {
      const aiRes = await axios.post(`${AI_BACKEND_URL}/recommend-tasks`, {
        energy_level: userEnergy,
        mood_score: userEnergy, // using energy level as mood proxy
        tasks: formattedTasks
      });

      if (aiRes.data && aiRes.data.recommended_tasks) {
        // Map recommended ID ordering back to Mongoose objects
        const recommendedIds = aiRes.data.recommended_tasks.map(t => t._id || t.id);
        const sortedTasks = [];
        
        recommendedIds.forEach(id => {
          const match = tasks.find(t => t._id.toString() === id);
          if (match) sortedTasks.push(match);
        });

        // Append remaining items that may not have returned in the recommendations list
        tasks.forEach(task => {
          if (!recommendedIds.includes(task._id.toString())) {
            sortedTasks.push(task);
          }
        });

        return res.json({ recommended_tasks: sortedTasks });
      }
    } catch (aiErr) {
      console.warn('AI Recommendation service offline. Sorting by priority locally.');
    }

    // Local sorting fallback: high priority first, then energy match
    const sortedTasksLocal = [...tasks].sort((a, b) => {
      const prioWeights = { high: 3, medium: 2, low: 1 };
      const prioDiff = (prioWeights[b.priority] || 2) - (prioWeights[a.priority] || 2);
      if (prioDiff !== 0) return prioDiff;
      
      // Secondary: sort by proximity to user energy
      const energyDiffA = Math.abs((a.energyRequired || 3) - userEnergy);
      const energyDiffB = Math.abs((b.energyRequired || 3) - userEnergy);
      return energyDiffA - energyDiffB;
    });

    res.json({ recommended_tasks: sortedTasksLocal });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
