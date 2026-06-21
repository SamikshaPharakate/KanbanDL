const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize to start of day
      return now;
    }
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  focusDuration: {
    type: Number,
    default: 0 // Accumulated focus time in seconds
  },
  dailyFocusScore: {
    type: Number,
    default: 0 // Computed 0 to 100 focus score
  },
  burnoutRisk: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  energyLevel: {
    type: Number,
    default: 3 // User reported daily energy (1 to 5)
  }
}, {
  timestamps: true
});

// Ensure a single record per user per day
AnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
